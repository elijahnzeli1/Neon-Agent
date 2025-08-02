import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PrivacyPolicy {
    dataRetention: {
        maxDays: number;
        autoDelete: boolean;
        encryptAtRest: boolean;
    };
    dataSharing: {
        allowTelemetry: boolean;
        allowAnalytics: boolean;
        allowThirdParty: boolean;
        anonymizeData: boolean;
    };
    auditTrail: {
        enabled: boolean;
        logLevel: 'minimal' | 'standard' | 'detailed';
        retention: number;
    };
    encryption: {
        algorithm: string;
        keyRotation: number;
        requireEncryption: boolean;
    };
    compliance: {
        gdpr: boolean;
        soc2: boolean;
        hipaa: boolean;
        customPolicies: string[];
    };
}

export interface AuditEvent {
    id: string;
    timestamp: number;
    action: string;
    userId: string;
    resource: string;
    details: any;
    ipAddress?: string;
    userAgent?: string;
    risk: 'low' | 'medium' | 'high';
}

export interface DataClassification {
    level: 'public' | 'internal' | 'confidential' | 'restricted';
    category: 'source-code' | 'credentials' | 'personal' | 'business' | 'system';
    tags: string[];
    sensitivity: number; // 1-10 scale
    requiresEncryption: boolean;
    retentionPolicy: string;
}

export interface EncryptionContext {
    keyId: string;
    algorithm: string;
    iv: Buffer;
    salt: Buffer;
    metadata: { [key: string]: any };
}

export class PrivacyArchitecture implements vscode.Disposable {
    private readonly outputChannel: vscode.OutputChannel;
    private readonly statusBarItem: vscode.StatusBarItem;
    private policy: PrivacyPolicy;
    private auditLog: AuditEvent[] = [];
    private encryptionKeys: Map<string, Buffer> = new Map();
    private dataClassifications: Map<string, DataClassification> = new Map();
    private readonly secureStoragePath: string;
    private readonly auditLogPath: string;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly masterKey: Buffer;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent Privacy');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
        this.statusBarItem.text = '$(shield) Privacy';
        this.statusBarItem.tooltip = 'Neon Agent Privacy & Security Status';
        this.statusBarItem.command = 'neonAgent.showPrivacyStatus';
        this.statusBarItem.show();

        // Initialize secure storage paths
        const userDataPath = process.env.APPDATA || os.homedir();
        const neonDataPath = path.join(userDataPath, '.neon-agent');
        this.secureStoragePath = path.join(neonDataPath, 'secure');
        this.auditLogPath = path.join(neonDataPath, 'audit.log');

        // Ensure directories exist
        this.ensureSecureDirectories();

        // Initialize master key
        this.masterKey = this.initializeMasterKey();

        // Load configuration
        this.policy = this.loadPrivacyPolicy();
        this.loadEncryptionKeys();
        this.loadAuditLog();

        this.disposables.push(this.statusBarItem);

        // Set up periodic cleanup
        this.setupPeriodicCleanup();
        this.setupDataMonitoring();

        this.updatePrivacyStatus();
        this.log('Privacy architecture initialized');
    }

    private ensureSecureDirectories(): void {
        try {
            if (!fs.existsSync(this.secureStoragePath)) {
                fs.mkdirSync(this.secureStoragePath, { recursive: true, mode: 0o700 });
            }
            
            // Set restrictive permissions
            if (process.platform !== 'win32') {
                fs.chmodSync(this.secureStoragePath, 0o700);
            }
        } catch (error) {
            this.log(`Failed to create secure directories: ${error}`);
        }
    }

    private initializeMasterKey(): Buffer {
        const keyPath = path.join(this.secureStoragePath, 'master.key');
        
        try {
            if (fs.existsSync(keyPath)) {
                return fs.readFileSync(keyPath);
            } else {
                // Generate new master key
                const masterKey = crypto.randomBytes(32);
                fs.writeFileSync(keyPath, masterKey, { mode: 0o600 });
                this.log('Generated new master encryption key');
                return masterKey;
            }
        } catch (error) {
            this.log(`Master key initialization failed: ${error}`);
            // Fallback to ephemeral key
            return crypto.randomBytes(32);
        }
    }

    private loadPrivacyPolicy(): PrivacyPolicy {
        const defaultPolicy: PrivacyPolicy = {
            dataRetention: {
                maxDays: 90,
                autoDelete: true,
                encryptAtRest: true
            },
            dataSharing: {
                allowTelemetry: false,
                allowAnalytics: false,
                allowThirdParty: false,
                anonymizeData: true
            },
            auditTrail: {
                enabled: true,
                logLevel: 'standard',
                retention: 365
            },
            encryption: {
                algorithm: 'aes-256-gcm',
                keyRotation: 90,
                requireEncryption: true
            },
            compliance: {
                gdpr: true,
                soc2: true,
                hipaa: false,
                customPolicies: []
            }
        };

        try {
            const config = vscode.workspace.getConfiguration('neonAgent.privacy');
            return {
                ...defaultPolicy,
                ...config
            };
        } catch (error) {
            this.log(`Failed to load privacy policy: ${error}`);
            return defaultPolicy;
        }
    }

    private loadEncryptionKeys(): void {
        try {
            const keysPath = path.join(this.secureStoragePath, 'keys.enc');
            if (fs.existsSync(keysPath)) {
                const encryptedKeys = fs.readFileSync(keysPath);
                const decryptedKeys = this.decrypt(encryptedKeys, this.masterKey);
                const keyData = JSON.parse(decryptedKeys.toString());
                
                for (const [keyId, keyHex] of Object.entries(keyData)) {
                    this.encryptionKeys.set(keyId, Buffer.from(keyHex as string, 'hex'));
                }
                
                this.log(`Loaded ${this.encryptionKeys.size} encryption keys`);
            }
        } catch (error) {
            this.log(`Failed to load encryption keys: ${error}`);
        }
    }

    private saveEncryptionKeys(): void {
        try {
            const keyData: { [key: string]: string } = {};
            for (const [keyId, key] of this.encryptionKeys.entries()) {
                keyData[keyId] = key.toString('hex');
            }
            
            const encrypted = this.encrypt(Buffer.from(JSON.stringify(keyData)), this.masterKey);
            const keysPath = path.join(this.secureStoragePath, 'keys.enc');
            fs.writeFileSync(keysPath, encrypted, { mode: 0o600 });
        } catch (error) {
            this.log(`Failed to save encryption keys: ${error}`);
        }
    }

    private loadAuditLog(): void {
        try {
            if (fs.existsSync(this.auditLogPath)) {
                const logData = fs.readFileSync(this.auditLogPath, 'utf8');
                const lines = logData.trim().split('\n').filter(line => line.length > 0);
                
                for (const line of lines) {
                    try {
                        const event = JSON.parse(line);
                        this.auditLog.push(event);
                    } catch (parseError) {
                        // Skip malformed log entries
                    }
                }
                
                this.log(`Loaded ${this.auditLog.length} audit events`);
            }
        } catch (error) {
            this.log(`Failed to load audit log: ${error}`);
        }
    }

    public encrypt(data: Buffer, key?: Buffer): Buffer {
        try {
            const encryptionKey = key || this.masterKey;
            const algorithm = this.policy.encryption.algorithm;
            const iv = crypto.randomBytes(16);
            const salt = crypto.randomBytes(32);
            
            // Derive key with salt
            const derivedKey = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha512');
            
            const cipher = crypto.createCipher(algorithm, derivedKey);
            const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
            
            // Create metadata
            const metadata = {
                algorithm,
                iv: iv.toString('hex'),
                salt: salt.toString('hex'),
                timestamp: Date.now()
            };
            
            // Combine metadata and encrypted data
            const metadataBuffer = Buffer.from(JSON.stringify(metadata));
            const metadataLength = Buffer.alloc(4);
            metadataLength.writeUInt32BE(metadataBuffer.length, 0);
            
            return Buffer.concat([metadataLength, metadataBuffer, encrypted]);
            
        } catch (error) {
            throw new Error(`Encryption failed: ${error}`);
        }
    }

    public decrypt(encryptedData: Buffer, key?: Buffer): Buffer {
        try {
            const decryptionKey = key || this.masterKey;
            
            // Extract metadata
            const metadataLength = encryptedData.readUInt32BE(0);
            const metadataBuffer = encryptedData.slice(4, 4 + metadataLength);
            const metadata = JSON.parse(metadataBuffer.toString());
            const encrypted = encryptedData.slice(4 + metadataLength);
            
            // Derive key with salt
            const salt = Buffer.from(metadata.salt, 'hex');
            const derivedKey = crypto.pbkdf2Sync(decryptionKey, salt, 100000, 32, 'sha512');
            
            const decipher = crypto.createDecipher(metadata.algorithm, derivedKey);
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
            
            return decrypted;
            
        } catch (error) {
            throw new Error(`Decryption failed: ${error}`);
        }
    }

    public generateEncryptionKey(keyId: string): Buffer {
        const key = crypto.randomBytes(32);
        this.encryptionKeys.set(keyId, key);
        this.saveEncryptionKeys();
        
        this.auditEvent({
            action: 'key_generated',
            resource: keyId,
            details: { algorithm: this.policy.encryption.algorithm },
            risk: 'medium'
        });
        
        return key;
    }

    public rotateEncryptionKey(keyId: string): Buffer {
        const oldKey = this.encryptionKeys.get(keyId);
        const newKey = this.generateEncryptionKey(keyId);
        
        this.auditEvent({
            action: 'key_rotated',
            resource: keyId,
            details: { 
                hasOldKey: !!oldKey,
                algorithm: this.policy.encryption.algorithm 
            },
            risk: 'medium'
        });
        
        return newKey;
    }

    public classifyData(content: string, context: string): DataClassification {
        let classification: DataClassification = {
            level: 'internal',
            category: 'source-code',
            tags: [],
            sensitivity: 3,
            requiresEncryption: false,
            retentionPolicy: 'standard'
        };

        // Analyze content for sensitive patterns
        const sensitivePatterns = [
            { pattern: /(password|secret|key|token)\s*[=:]\s*["'][^"']+["']/gi, level: 'confidential', category: 'credentials', sensitivity: 8 },
            { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, level: 'restricted', category: 'personal', sensitivity: 9 },
            { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, level: 'confidential', category: 'personal', sensitivity: 6 },
            { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, level: 'restricted', category: 'personal', sensitivity: 10 },
            { pattern: /(api_key|client_secret|private_key)/gi, level: 'restricted', category: 'credentials', sensitivity: 9 }
        ];

        for (const { pattern, level, category, sensitivity } of sensitivePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                classification.level = level as any;
                classification.category = category as any;
                classification.sensitivity = Math.max(classification.sensitivity, sensitivity);
                classification.requiresEncryption = sensitivity >= 7;
                classification.tags.push(`detected_${category}`);
            }
        }

        // Context-based classification
        if (context.includes('test') || context.includes('mock')) {
            classification.sensitivity = Math.max(1, classification.sensitivity - 2);
        }
        
        if (context.includes('production') || context.includes('prod')) {
            classification.sensitivity = Math.min(10, classification.sensitivity + 1);
            classification.requiresEncryption = true;
        }

        // Store classification
        const contentHash = crypto.createHash('sha256').update(content).digest('hex');
        this.dataClassifications.set(contentHash, classification);

        this.auditEvent({
            action: 'data_classified',
            resource: contentHash.substring(0, 8),
            details: {
                level: classification.level,
                category: classification.category,
                sensitivity: classification.sensitivity,
                context
            },
            risk: classification.sensitivity >= 7 ? 'high' : classification.sensitivity >= 5 ? 'medium' : 'low'
        });

        return classification;
    }

    public secureStore(key: string, data: any, classification?: DataClassification): void {
        try {
            const dataBuffer = Buffer.from(JSON.stringify(data));
            const actualClassification = classification || this.classifyData(JSON.stringify(data), 'storage');
            
            let finalData = dataBuffer;
            if (actualClassification.requiresEncryption || this.policy.dataRetention.encryptAtRest) {
                finalData = this.encrypt(dataBuffer);
            }
            
            const storePath = path.join(this.secureStoragePath, `${key}.sec`);
            const metadata = {
                classification: actualClassification,
                timestamp: Date.now(),
                encrypted: actualClassification.requiresEncryption || this.policy.dataRetention.encryptAtRest,
                size: finalData.length
            };
            
            const metadataBuffer = Buffer.from(JSON.stringify(metadata));
            const metadataLength = Buffer.alloc(4);
            metadataLength.writeUInt32BE(metadataBuffer.length, 0);
            
            const fileData = Buffer.concat([metadataLength, metadataBuffer, finalData]);
            fs.writeFileSync(storePath, fileData, { mode: 0o600 });
            
            this.auditEvent({
                action: 'data_stored',
                resource: key,
                details: {
                    size: finalData.length,
                    encrypted: metadata.encrypted,
                    classification: actualClassification.level
                },
                risk: actualClassification.sensitivity >= 7 ? 'high' : 'low'
            });
            
        } catch (error) {
            this.auditEvent({
                action: 'storage_error',
                resource: key,
                details: { error: String(error) },
                risk: 'high'
            });
            throw new Error(`Secure storage failed: ${String(error)}`);
        }
    }

    public secureRetrieve(key: string): any {
        try {
            const storePath = path.join(this.secureStoragePath, `${key}.sec`);
            if (!fs.existsSync(storePath)) {
                return null;
            }
            
            const fileData = fs.readFileSync(storePath);
            
            // Extract metadata
            const metadataLength = fileData.readUInt32BE(0);
            const metadataBuffer = fileData.slice(4, 4 + metadataLength);
            const metadata = JSON.parse(metadataBuffer.toString());
            const data = fileData.slice(4 + metadataLength);
            
            // Check if data has expired
            const age = Date.now() - metadata.timestamp;
            const maxAge = this.policy.dataRetention.maxDays * 24 * 60 * 60 * 1000;
            if (age > maxAge && this.policy.dataRetention.autoDelete) {
                this.secureDelete(key);
                return null;
            }
            
            let finalData = data;
            if (metadata.encrypted) {
                finalData = this.decrypt(data);
            }
            
            this.auditEvent({
                action: 'data_retrieved',
                resource: key,
                details: {
                    age: Math.floor(age / (24 * 60 * 60 * 1000)),
                    encrypted: metadata.encrypted,
                    classification: metadata.classification?.level
                },
                risk: metadata.classification?.sensitivity >= 7 ? 'medium' : 'low'
            });
            
            return JSON.parse(finalData.toString());
            
        } catch (error) {
            this.auditEvent({
                action: 'retrieval_error',
                resource: key,
                details: { error: String(error) },
                risk: 'medium'
            });
            throw new Error(`Secure retrieval failed: ${String(error)}`);
        }
    }

    public secureDelete(key: string): void {
        try {
            const storePath = path.join(this.secureStoragePath, `${key}.sec`);
            if (fs.existsSync(storePath)) {
                // Secure deletion: overwrite with random data before unlinking
                const stats = fs.statSync(storePath);
                const randomData = crypto.randomBytes(stats.size);
                fs.writeFileSync(storePath, randomData);
                fs.unlinkSync(storePath);
                
                this.auditEvent({
                    action: 'data_deleted',
                    resource: key,
                    details: { secure: true },
                    risk: 'low'
                });
            }
        } catch (error) {
            this.auditEvent({
                action: 'deletion_error',
                resource: key,
                details: { error: String(error) },
                risk: 'medium'
            });
            throw new Error(`Secure deletion failed: ${String(error)}`);
        }
    }

    public auditEvent(event: Partial<AuditEvent>): void {
        if (!this.policy.auditTrail.enabled) {
            return;
        }

        const fullEvent: AuditEvent = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            action: event.action || 'unknown',
            userId: os.userInfo().username,
            resource: event.resource || 'unknown',
            details: event.details || {},
            risk: event.risk || 'low',
            ...event
        };

        this.auditLog.push(fullEvent);
        
        // Write to audit log file immediately for critical events
        if (fullEvent.risk === 'high' || this.policy.auditTrail.logLevel === 'detailed') {
            try {
                fs.appendFileSync(this.auditLogPath, JSON.stringify(fullEvent) + '\n');
            } catch (error) {
                this.log(`Failed to write audit event: ${error}`);
            }
        }

        // Trigger alerts for high-risk events
        if (fullEvent.risk === 'high') {
            this.handleHighRiskEvent(fullEvent);
        }
    }

    private handleHighRiskEvent(event: AuditEvent): void {
        this.log(`HIGH RISK EVENT: ${event.action} on ${event.resource}`);
        
        // Update status bar to show security alert
        this.statusBarItem.text = '$(shield) Privacy ⚠️';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        
        // Reset after 5 minutes
        setTimeout(() => {
            this.updatePrivacyStatus();
        }, 5 * 60 * 1000);
    }

    private setupPeriodicCleanup(): void {
        // Run cleanup every hour
        setInterval(() => {
            this.performCleanup();
        }, 60 * 60 * 1000);
    }

    private setupDataMonitoring(): void {
        // Monitor workspace file changes for sensitive data
        const watcher = vscode.workspace.createFileSystemWatcher('**/*');
        
        watcher.onDidChange(async (uri) => {
            try {
                const content = await fs.promises.readFile(uri.fsPath, 'utf8');
                const classification = this.classifyData(content, uri.fsPath);
                
                if (classification.sensitivity >= 7) {
                    this.auditEvent({
                        action: 'sensitive_data_detected',
                        resource: uri.fsPath,
                        details: {
                            classification: classification.level,
                            sensitivity: classification.sensitivity
                        },
                        risk: 'medium'
                    });
                }
            } catch (error) {
                // Ignore files that can't be read as text
            }
        });
        
        this.disposables.push(watcher);
    }

    private performCleanup(): void {
        try {
            const now = Date.now();
            const maxDataAge = this.policy.dataRetention.maxDays * 24 * 60 * 60 * 1000;
            const maxAuditAge = this.policy.auditTrail.retention * 24 * 60 * 60 * 1000;
            
            // Clean up old stored data
            if (this.policy.dataRetention.autoDelete) {
                const secureFiles = fs.readdirSync(this.secureStoragePath);
                for (const file of secureFiles) {
                    if (file.endsWith('.sec')) {
                        const filePath = path.join(this.secureStoragePath, file);
                        const stats = fs.statSync(filePath);
                        if (now - stats.mtime.getTime() > maxDataAge) {
                            const key = file.replace('.sec', '');
                            this.secureDelete(key);
                        }
                    }
                }
            }
            
            // Clean up old audit events
            this.auditLog = this.auditLog.filter(event => now - event.timestamp < maxAuditAge);
            
            // Rotate encryption keys if needed
            if (this.policy.encryption.keyRotation > 0) {
                for (const [keyId] of this.encryptionKeys.entries()) {
                    // Implement key rotation logic based on age
                    // This is a simplified version
                    if (Math.random() < 0.01) { // 1% chance per cleanup cycle
                        this.rotateEncryptionKey(keyId);
                    }
                }
            }
            
            this.log('Periodic cleanup completed');
            
        } catch (error) {
            this.log(`Cleanup failed: ${error}`);
        }
    }

    private updatePrivacyStatus(): void {
        const riskEvents = this.auditLog.filter(e => e.risk === 'high' && Date.now() - e.timestamp < 24 * 60 * 60 * 1000);
        
        if (riskEvents.length > 0) {
            this.statusBarItem.text = `$(shield) Privacy (${riskEvents.length} alerts)`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = '$(shield) Privacy ✓';
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    public getPrivacyReport(): any {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        
        const recentEvents = this.auditLog.filter(e => now - e.timestamp < 7 * dayMs);
        const riskEvents = recentEvents.filter(e => e.risk === 'high');
        
        return {
            policy: this.policy,
            compliance: {
                gdpr: this.policy.compliance.gdpr,
                soc2: this.policy.compliance.soc2,
                hipaa: this.policy.compliance.hipaa
            },
            encryption: {
                algorithm: this.policy.encryption.algorithm,
                keysManaged: this.encryptionKeys.size,
                encryptionEnabled: this.policy.encryption.requireEncryption
            },
            auditSummary: {
                totalEvents: this.auditLog.length,
                recentEvents: recentEvents.length,
                highRiskEvents: riskEvents.length,
                retentionDays: this.policy.auditTrail.retention
            },
            dataClassifications: this.dataClassifications.size,
            lastCleanup: now
        };
    }

    public exportAuditLog(startDate?: Date, endDate?: Date): AuditEvent[] {
        let events = this.auditLog;
        
        if (startDate) {
            events = events.filter(e => e.timestamp >= startDate.getTime());
        }
        
        if (endDate) {
            events = events.filter(e => e.timestamp <= endDate.getTime());
        }
        
        // Anonymize sensitive data if policy requires it
        if (this.policy.dataSharing.anonymizeData) {
            events = events.map(event => ({
                ...event,
                userId: crypto.createHash('sha256').update(event.userId).digest('hex').substring(0, 8),
                details: this.anonymizeDetails(event.details)
            }));
        }
        
        return events;
    }

    private anonymizeDetails(details: any): any {
        if (typeof details !== 'object' || details === null) {
            return details;
        }
        
        const anonymized = { ...details };
        const sensitiveKeys = ['password', 'secret', 'key', 'token', 'email', 'ip', 'phone'];
        
        for (const key of Object.keys(anonymized)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                anonymized[key] = '[REDACTED]';
            } else if (typeof anonymized[key] === 'object') {
                anonymized[key] = this.anonymizeDetails(anonymized[key]);
            }
        }
        
        return anonymized;
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public dispose(): void {
        // Save final audit log
        try {
            const logEntries = this.auditLog.map(event => JSON.stringify(event)).join('\n');
            fs.writeFileSync(this.auditLogPath, logEntries);
        } catch (error) {
            this.log(`Failed to save final audit log: ${error}`);
        }
        
        this.disposables.forEach(d => d.dispose());
        this.outputChannel.dispose();
    }
}
