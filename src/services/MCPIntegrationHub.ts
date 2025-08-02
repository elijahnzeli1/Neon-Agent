import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { AIProvider } from '../providers/AIProvider';

export interface MCPConnector {
    id: string;
    name: string;
    description: string;
    type: 'api' | 'cli' | 'file' | 'database' | 'webhook';
    config: MCPConnectorConfig;
    enabled: boolean;
    priority: number;
}

export interface MCPConnectorConfig {
    endpoint?: string;
    apiKey?: string;
    command?: string;
    filePath?: string;
    connectionString?: string;
    webhookUrl?: string;
    headers?: { [key: string]: string };
    timeout?: number;
    retries?: number;
    authentication?: {
        type: 'bearer' | 'basic' | 'apikey' | 'oauth';
        credentials: { [key: string]: string };
    };
}

export interface MCPContext {
    workspaceRoot: string;
    currentFile?: string;
    selectedText?: string;
    language?: string;
    gitBranch?: string;
    timestamp: number;
    userRequest: string;
}

export interface MCPResponse {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: { [key: string]: any };
    cached?: boolean;
    duration?: number;
}

export interface WorkflowStep {
    id: string;
    name: string;
    type: 'connector' | 'ai' | 'user' | 'condition';
    connectorId?: string;
    prompt?: string;
    condition?: string;
    onSuccess?: string;
    onFailure?: string;
    timeout?: number;
    required?: boolean;
}

export interface MCPWorkflow {
    id: string;
    name: string;
    description: string;
    triggers: string[];
    steps: WorkflowStep[];
    variables: { [key: string]: any };
    enabled: boolean;
}

export class MCPIntegrationHub implements vscode.Disposable {
    private readonly outputChannel: vscode.OutputChannel;
    private readonly statusBarItem: vscode.StatusBarItem;
    private connectors: Map<string, MCPConnector> = new Map();
    private workflows: Map<string, MCPWorkflow> = new Map();
    private responseCache: Map<string, { response: MCPResponse; timestamp: number }> = new Map();
    private readonly configWatcher: vscode.FileSystemWatcher;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly aiProvider: AIProvider;

    constructor(aiProvider: AIProvider) {
        this.aiProvider = aiProvider;
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent MCP');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = '$(plug) MCP';
        this.statusBarItem.tooltip = 'Neon Agent MCP Integration Hub';
        this.statusBarItem.command = 'neonAgent.showMCPStatus';
        this.statusBarItem.show();

        // Watch for connector configuration changes
        this.configWatcher = vscode.workspace.createFileSystemWatcher('**/.neon-connectors*');
        this.configWatcher.onDidCreate(this.loadConnectors.bind(this));
        this.configWatcher.onDidChange(this.loadConnectors.bind(this));
        this.configWatcher.onDidDelete(this.clearConnectors.bind(this));

        this.disposables.push(this.configWatcher, this.statusBarItem);

        // Load initial configuration
        this.loadConnectors();
        this.loadBuiltinConnectors();
        this.setupCacheCleanup();
    }

    private async loadConnectors(): Promise<void> {
        try {
            const configFiles = await vscode.workspace.findFiles('**/.neon-connectors*');
            
            for (const configFile of configFiles) {
                const content = await fs.promises.readFile(configFile.fsPath, 'utf8');
                let config;

                if (configFile.fsPath.endsWith('.json')) {
                    config = JSON.parse(content);
                } else if (configFile.fsPath.endsWith('.js')) {
                    config = this.evaluateJSConnectors(content);
                } else {
                    config = JSON.parse(content);
                }

                this.processConnectorConfig(config);
            }

            this.updateStatusBar();
            this.log(`Loaded ${this.connectors.size} connectors`);

        } catch (error) {
            this.log(`Error loading connectors: ${error}`);
        }
    }

    private evaluateJSConnectors(content: string): any {
        try {
            const context = {
                connectors: [] as MCPConnector[],
                workflows: [] as MCPWorkflow[],
                
                connector: (config: MCPConnector) => {
                    context.connectors.push(config);
                },
                
                workflow: (config: MCPWorkflow) => {
                    context.workflows.push(config);
                },
                
                env: (key: string) => process.env[key],
                
                secret: (key: string) => {
                    // In a real implementation, this would securely retrieve secrets
                    return process.env[`NEON_SECRET_${key.toUpperCase()}`];
                }
            };

            const func = new Function(...Object.keys(context), content);
            func(...Object.values(context));
            
            return {
                connectors: context.connectors,
                workflows: context.workflows
            };

        } catch (error) {
            this.log(`Error evaluating JS connectors: ${error}`);
            return { connectors: [], workflows: [] };
        }
    }

    private processConnectorConfig(config: any): void {
        // Process connectors
        if (config.connectors) {
            for (const connector of config.connectors) {
                this.connectors.set(connector.id, connector);
            }
        }

        // Process workflows
        if (config.workflows) {
            for (const workflow of config.workflows) {
                this.workflows.set(workflow.id, workflow);
            }
        }
    }

    private loadBuiltinConnectors(): void {
        // GitHub API Connector
        this.connectors.set('github', {
            id: 'github',
            name: 'GitHub API',
            description: 'GitHub repository and issue management',
            type: 'api',
            config: {
                endpoint: 'https://api.github.com',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Neon-Agent'
                },
                timeout: 10000,
                retries: 3
            },
            enabled: true,
            priority: 100
        });

        // Jira API Connector
        this.connectors.set('jira', {
            id: 'jira',
            name: 'Jira API',
            description: 'Jira issue tracking and project management',
            type: 'api',
            config: {
                timeout: 15000,
                retries: 2
            },
            enabled: false,
            priority: 90
        });

        // Slack Webhook Connector
        this.connectors.set('slack', {
            id: 'slack',
            name: 'Slack Webhook',
            description: 'Send notifications to Slack channels',
            type: 'webhook',
            config: {
                timeout: 5000,
                retries: 2
            },
            enabled: false,
            priority: 80
        });

        // Docker CLI Connector
        this.connectors.set('docker', {
            id: 'docker',
            name: 'Docker CLI',
            description: 'Docker container management',
            type: 'cli',
            config: {
                command: 'docker',
                timeout: 30000,
                retries: 1
            },
            enabled: false,
            priority: 70
        });

        // Database Connector
        this.connectors.set('database', {
            id: 'database',
            name: 'Database Query',
            description: 'Execute database queries',
            type: 'database',
            config: {
                timeout: 20000,
                retries: 2
            },
            enabled: false,
            priority: 60
        });
    }

    private clearConnectors(): void {
        this.connectors.clear();
        this.workflows.clear();
        this.loadBuiltinConnectors();
        this.updateStatusBar();
    }

    private updateStatusBar(): void {
        const enabledCount = Array.from(this.connectors.values()).filter(c => c.enabled).length;
        this.statusBarItem.text = `$(plug) MCP (${enabledCount})`;
        this.statusBarItem.backgroundColor = enabledCount > 0 ? undefined : new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    private setupCacheCleanup(): void {
        // Clean cache every 5 minutes
        setInterval(() => {
            const now = Date.now();
            const maxAge = 5 * 60 * 1000; // 5 minutes

            for (const [key, cached] of this.responseCache.entries()) {
                if (now - cached.timestamp > maxAge) {
                    this.responseCache.delete(key);
                }
            }
        }, 60000); // Check every minute
    }

    public async executeConnector(connectorId: string, action: string, params: any = {}, context?: MCPContext): Promise<MCPResponse> {
        const connector = this.connectors.get(connectorId);
        if (!connector) {
            return {
                success: false,
                error: `Connector '${connectorId}' not found`
            };
        }

        if (!connector.enabled) {
            return {
                success: false,
                error: `Connector '${connectorId}' is disabled`
            };
        }

        // Check cache first
        const cacheKey = `${connectorId}:${action}:${JSON.stringify(params)}`;
        const cached = this.responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
            return { ...cached.response, cached: true };
        }

        const startTime = Date.now();
        this.log(`Executing connector ${connectorId} with action ${action}`);

        try {
            let response: MCPResponse;

            switch (connector.type) {
                case 'api':
                    response = await this.executeAPIConnector(connector, action, params, context);
                    break;
                case 'cli':
                    response = await this.executeCLIConnector(connector, action, params, context);
                    break;
                case 'file':
                    response = await this.executeFileConnector(connector, action, params, context);
                    break;
                case 'database':
                    response = await this.executeDatabaseConnector(connector, action, params, context);
                    break;
                case 'webhook':
                    response = await this.executeWebhookConnector(connector, action, params, context);
                    break;
                default:
                    response = {
                        success: false,
                        error: `Unsupported connector type: ${connector.type}`
                    };
            }

            response.duration = Date.now() - startTime;

            // Cache successful responses
            if (response.success) {
                this.responseCache.set(cacheKey, { response, timestamp: Date.now() });
            }

            return response;

        } catch (error) {
            return {
                success: false,
                error: `Connector execution failed: ${error}`,
                duration: Date.now() - startTime
            };
        }
    }

    private async executeAPIConnector(connector: MCPConnector, action: string, params: any, context?: MCPContext): Promise<MCPResponse> {
        const { endpoint, headers = {}, timeout = 10000, authentication } = connector.config;
        
        let url = endpoint || '';
        let method = 'GET';
        let body: any = undefined;

        // Handle authentication
        if (authentication) {
            this.addAuthentication(headers, authentication);
        }

        // Build request based on action
        switch (action) {
            case 'get':
                url += params.path || '';
                method = 'GET';
                break;
            case 'post':
                url += params.path || '';
                method = 'POST';
                body = JSON.stringify(params.data);
                headers['Content-Type'] = 'application/json';
                break;
            case 'put':
                url += params.path || '';
                method = 'PUT';
                body = JSON.stringify(params.data);
                headers['Content-Type'] = 'application/json';
                break;
            case 'delete':
                url += params.path || '';
                method = 'DELETE';
                break;
            default:
                return {
                    success: false,
                    error: `Unsupported API action: ${action}`
                };
        }

        try {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            return new Promise<MCPResponse>((resolve) => {
                const timeoutId = setTimeout(() => {
                    resolve({
                        success: false,
                        error: 'Request timeout'
                    });
                }, timeout);

                const req = httpModule.request({
                    hostname: urlObj.hostname,
                    port: urlObj.port,
                    path: urlObj.pathname + urlObj.search,
                    method: method,
                    headers: headers
                }, (res) => {
                    clearTimeout(timeoutId);
                    
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const jsonData = JSON.parse(data);
                            resolve({
                                success: res.statusCode ? res.statusCode < 400 : false,
                                data: jsonData,
                                error: res.statusCode && res.statusCode >= 400 ? `HTTP ${res.statusCode}: ${res.statusMessage}` : undefined,
                                metadata: {
                                    status: res.statusCode,
                                    headers: res.headers
                                }
                            });
                        } catch (parseError) {
                            resolve({
                                success: res.statusCode ? res.statusCode < 400 : false,
                                data: data,
                                error: res.statusCode && res.statusCode >= 400 ? `HTTP ${res.statusCode}: ${res.statusMessage}` : undefined,
                                metadata: {
                                    status: res.statusCode,
                                    headers: res.headers
                                }
                            });
                        }
                    });
                });

                req.on('error', (error) => {
                    clearTimeout(timeoutId);
                    resolve({
                        success: false,
                        error: `API request failed: ${error.message}`
                    });
                });

                if (body) {
                    req.write(body);
                }
                req.end();
            });

        } catch (error) {
            return {
                success: false,
                error: `API request failed: ${error}`
            };
        }
    }

    private async executeCLIConnector(connector: MCPConnector, action: string, params: any, context?: MCPContext): Promise<MCPResponse> {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { command, timeout = 30000 } = connector.config;
        
        let fullCommand = command || '';
        
        // Build command based on action
        switch (action) {
            case 'run':
                fullCommand += ` ${params.args || ''}`;
                break;
            case 'version':
                fullCommand += ' --version';
                break;
            default:
                fullCommand += ` ${action} ${params.args || ''}`;
        }

        try {
            const { stdout, stderr } = await execAsync(fullCommand, { 
                timeout,
                cwd: context?.workspaceRoot
            });

            return {
                success: true,
                data: {
                    stdout: stdout.trim(),
                    stderr: stderr.trim()
                }
            };

        } catch (error: any) {
            return {
                success: false,
                error: `CLI execution failed: ${error.message}`,
                data: {
                    stdout: error.stdout || '',
                    stderr: error.stderr || ''
                }
            };
        }
    }

    private async executeFileConnector(connector: MCPConnector, action: string, params: any, context?: MCPContext): Promise<MCPResponse> {
        const { filePath } = connector.config;
        
        try {
            let result: any;

            switch (action) {
                case 'read':
                    const content = await fs.promises.readFile(params.path || filePath!, 'utf8');
                    result = { content };
                    break;
                    
                case 'write':
                    await fs.promises.writeFile(params.path || filePath!, params.content, 'utf8');
                    result = { success: true };
                    break;
                    
                case 'append':
                    await fs.promises.appendFile(params.path || filePath!, params.content, 'utf8');
                    result = { success: true };
                    break;
                    
                case 'exists':
                    const exists = await fs.promises.access(params.path || filePath!).then(() => true).catch(() => false);
                    result = { exists };
                    break;
                    
                case 'stat':
                    const stats = await fs.promises.stat(params.path || filePath!);
                    result = {
                        size: stats.size,
                        mtime: stats.mtime,
                        isFile: stats.isFile(),
                        isDirectory: stats.isDirectory()
                    };
                    break;
                    
                default:
                    return {
                        success: false,
                        error: `Unsupported file action: ${action}`
                    };
            }

            return {
                success: true,
                data: result
            };

        } catch (error) {
            return {
                success: false,
                error: `File operation failed: ${error}`
            };
        }
    }

    private async executeDatabaseConnector(connector: MCPConnector, action: string, params: any, context?: MCPContext): Promise<MCPResponse> {
        // This is a simplified implementation
        // In a real scenario, you'd use proper database drivers
        const { connectionString } = connector.config;

        try {
            // Simulated database operations
            switch (action) {
                case 'query':
                    // Simulate query execution
                    const mockResult = {
                        rows: [],
                        rowCount: 0,
                        query: params.sql || ''
                    };
                    
                    return {
                        success: true,
                        data: mockResult
                    };
                    
                case 'schema':
                    // Simulate schema retrieval
                    const mockSchema = {
                        tables: ['users', 'projects', 'tasks'],
                        version: '1.0.0'
                    };
                    
                    return {
                        success: true,
                        data: mockSchema
                    };
                    
                default:
                    return {
                        success: false,
                        error: `Unsupported database action: ${action}`
                    };
            }

        } catch (error) {
            return {
                success: false,
                error: `Database operation failed: ${error}`
            };
        }
    }

    private async executeWebhookConnector(connector: MCPConnector, action: string, params: any, context?: MCPContext): Promise<MCPResponse> {
        const { webhookUrl, timeout = 5000 } = connector.config;
        
        try {
            const urlObj = new URL(webhookUrl!);
            const isHttps = urlObj.protocol === 'https:';
            const httpModule = isHttps ? https : http;
            const postData = JSON.stringify({
                action,
                params,
                context,
                timestamp: Date.now()
            });

            return new Promise<MCPResponse>((resolve) => {
                const timeoutId = setTimeout(() => {
                    resolve({
                        success: false,
                        error: 'Webhook timeout'
                    });
                }, timeout);

                const req = httpModule.request({
                    hostname: urlObj.hostname,
                    port: urlObj.port,
                    path: urlObj.pathname + urlObj.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                }, (res) => {
                    clearTimeout(timeoutId);
                    
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        resolve({
                            success: res.statusCode ? res.statusCode < 400 : false,
                            data,
                            error: res.statusCode && res.statusCode >= 400 ? `Webhook failed: ${res.statusMessage}` : undefined
                        });
                    });
                });

                req.on('error', (error) => {
                    clearTimeout(timeoutId);
                    resolve({
                        success: false,
                        error: `Webhook execution failed: ${error.message}`
                    });
                });

                req.write(postData);
                req.end();
            });

        } catch (error) {
            return {
                success: false,
                error: `Webhook execution failed: ${error}`
            };
        }
    }

    private addAuthentication(headers: { [key: string]: string }, auth: any): void {
        switch (auth.type) {
            case 'bearer':
                headers['Authorization'] = `Bearer ${auth.credentials.token}`;
                break;
            case 'basic':
                const credentials = Buffer.from(`${auth.credentials.username}:${auth.credentials.password}`).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
                break;
            case 'apikey':
                headers[auth.credentials.header || 'X-API-Key'] = auth.credentials.key;
                break;
        }
    }

    public async executeWorkflow(workflowId: string, context: MCPContext): Promise<MCPResponse> {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            return {
                success: false,
                error: `Workflow '${workflowId}' not found`
            };
        }

        if (!workflow.enabled) {
            return {
                success: false,
                error: `Workflow '${workflowId}' is disabled`
            };
        }

        this.log(`Executing workflow: ${workflow.name}`);
        
        const results: any[] = [];
        let currentStepId: string | undefined = workflow.steps[0]?.id;

        while (currentStepId) {
            const step = workflow.steps.find(s => s.id === currentStepId);
            if (!step) break;

            this.log(`Executing step: ${step.name}`);

            try {
                let stepResult: MCPResponse;

                switch (step.type) {
                    case 'connector':
                        if (!step.connectorId) {
                            stepResult = { success: false, error: 'No connector specified' };
                        } else {
                            stepResult = await this.executeConnector(step.connectorId, 'run', workflow.variables, context);
                        }
                        break;

                    case 'ai':
                        if (!step.prompt) {
                            stepResult = { success: false, error: 'No prompt specified' };
                        } else {
                            try {
                                const aiResponse = await this.aiProvider.getCodeCompletion(
                                    step.prompt, 
                                    'Workflow automation context',
                                    'javascript',
                                    new AbortController().signal
                                );
                                stepResult = { success: true, data: { response: aiResponse } };
                            } catch (error) {
                                stepResult = { success: false, error: `AI step failed: ${error}` };
                            }
                        }
                        break;

                    case 'condition':
                        const conditionResult = this.evaluateCondition(step.condition || 'true', workflow.variables, results);
                        stepResult = { success: true, data: { result: conditionResult } };
                        currentStepId = conditionResult ? step.onSuccess : step.onFailure;
                        // Add result for condition step
                        results.push({
                            stepId: step.id,
                            stepName: step.name,
                            result: stepResult
                        });
                        // Continue to next iteration
                        continue;
                        
                    case 'user':
                        // Simulate user interaction
                        stepResult = { success: true, data: { userInput: 'approved' } };
                        break;

                    default:
                        stepResult = { success: false, error: `Unknown step type: ${step.type}` };
                }

                results.push({
                    stepId: step.id,
                    stepName: step.name,
                    result: stepResult
                });

                if (!stepResult.success && step.required) {
                    return {
                        success: false,
                        error: `Required step '${step.name}' failed: ${stepResult.error}`,
                        data: { workflowResults: results }
                    };
                }

                // Move to next step (condition steps handle their own navigation)
                const currentIndex = workflow.steps.findIndex(s => s.id === currentStepId);
                currentStepId = workflow.steps[currentIndex + 1]?.id;

            } catch (error) {
                return {
                    success: false,
                    error: `Workflow execution failed at step '${step.name}': ${error}`,
                    data: { workflowResults: results }
                };
            }
        }

        return {
            success: true,
            data: { workflowResults: results },
            metadata: { workflow: workflow.name }
        };
    }

    private evaluateCondition(condition: string, variables: any, results: any[]): boolean {
        try {
            // Simple condition evaluation (can be enhanced)
            const context = { variables, results, lastResult: results[results.length - 1] };
            return Function('context', `with(context) { return ${condition}; }`)(context);
        } catch {
            return false;
        }
    }

    public async createSampleConnectorsFile(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const connectorsFilePath = path.join(workspaceFolder.uri.fsPath, '.neon-connectors.js');
        
        const sampleContent = `// Neon Agent MCP Connectors Configuration
// This file defines connectors and workflows for external tool integration

// GitHub Issues Connector
connector({
    id: 'github-issues',
    name: 'GitHub Issues',
    description: 'Create and manage GitHub issues',
    type: 'api',
    config: {
        endpoint: 'https://api.github.com',
        headers: {
            'Accept': 'application/vnd.github.v3+json'
        },
        authentication: {
            type: 'bearer',
            credentials: {
                token: secret('GITHUB_TOKEN')
            }
        }
    },
    enabled: true,
    priority: 100
});

// Slack Notifications Connector
connector({
    id: 'slack-notify',
    name: 'Slack Notifications',
    description: 'Send notifications to Slack',
    type: 'webhook',
    config: {
        webhookUrl: secret('SLACK_WEBHOOK_URL'),
        timeout: 5000
    },
    enabled: true,
    priority: 90
});

// Local Git CLI Connector
connector({
    id: 'git-local',
    name: 'Local Git',
    description: 'Execute local git commands',
    type: 'cli',
    config: {
        command: 'git',
        timeout: 10000
    },
    enabled: true,
    priority: 80
});

// Project Documentation Connector
connector({
    id: 'docs-file',
    name: 'Project Documentation',
    description: 'Read and write project documentation',
    type: 'file',
    config: {
        filePath: './docs/README.md'
    },
    enabled: true,
    priority: 70
});

// Automated Issue Creation Workflow
workflow({
    id: 'create-issue-from-error',
    name: 'Create Issue from Error',
    description: 'Automatically create GitHub issue when code errors are detected',
    triggers: ['error-detected', 'test-failure'],
    steps: [
        {
            id: 'analyze-error',
            name: 'Analyze Error with AI',
            type: 'ai',
            prompt: 'Analyze this error and suggest a solution: {{error_details}}',
            required: true
        },
        {
            id: 'check-existing-issues',
            name: 'Check for Existing Issues',
            type: 'connector',
            connectorId: 'github-issues',
            required: false
        },
        {
            id: 'create-issue',
            name: 'Create GitHub Issue',
            type: 'connector',
            connectorId: 'github-issues',
            required: true
        },
        {
            id: 'notify-team',
            name: 'Notify Team',
            type: 'connector',
            connectorId: 'slack-notify',
            required: false
        }
    ],
    variables: {
        repository: env('GITHUB_REPO'),
        channel: '#dev-alerts'
    },
    enabled: true
});

// Code Review Preparation Workflow
workflow({
    id: 'prepare-code-review',
    name: 'Prepare Code Review',
    description: 'Automated code review preparation with documentation updates',
    triggers: ['pre-commit', 'manual'],
    steps: [
        {
            id: 'run-tests',
            name: 'Run Tests',
            type: 'connector',
            connectorId: 'git-local',
            required: true
        },
        {
            id: 'generate-changelog',
            name: 'Generate Changelog',
            type: 'ai',
            prompt: 'Generate changelog entry for these changes: {{git_diff}}',
            required: false
        },
        {
            id: 'update-docs',
            name: 'Update Documentation',
            type: 'connector',
            connectorId: 'docs-file',
            required: false
        },
        {
            id: 'commit-changes',
            name: 'Commit Documentation Changes',
            type: 'connector',
            connectorId: 'git-local',
            required: false
        }
    ],
    variables: {
        test_command: 'npm test',
        docs_path: './docs/CHANGELOG.md'
    },
    enabled: true
});

// Database Backup Workflow
workflow({
    id: 'backup-database',
    name: 'Database Backup',
    description: 'Backup database and notify on completion',
    triggers: ['scheduled', 'manual'],
    steps: [
        {
            id: 'create-backup',
            name: 'Create Database Backup',
            type: 'connector',
            connectorId: 'database',
            required: true
        },
        {
            id: 'verify-backup',
            name: 'Verify Backup Integrity',
            type: 'connector',
            connectorId: 'database',
            required: true
        },
        {
            id: 'upload-to-storage',
            name: 'Upload to Cloud Storage',
            type: 'connector',
            connectorId: 'cloud-storage',
            required: false
        },
        {
            id: 'notify-success',
            name: 'Notify Success',
            type: 'connector',
            connectorId: 'slack-notify',
            required: false
        }
    ],
    variables: {
        backup_location: env('BACKUP_PATH'),
        retention_days: 30
    },
    enabled: false
});
`;

        try {
            await fs.promises.writeFile(connectorsFilePath, sampleContent);
            
            const document = await vscode.workspace.openTextDocument(connectorsFilePath);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage('Sample .neon-connectors.js file created! Configure your external tool integrations.');
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create connectors file: ${error}`);
        }
    }

    public getConnectorStats(): { total: number; enabled: number; byType: { [key: string]: number } } {
        const connectors = Array.from(this.connectors.values());
        const byType: { [key: string]: number } = {};
        
        for (const connector of connectors) {
            byType[connector.type] = (byType[connector.type] || 0) + 1;
        }
        
        return {
            total: connectors.length,
            enabled: connectors.filter(c => c.enabled).length,
            byType
        };
    }

    public getWorkflowStats(): { total: number; enabled: number; triggers: string[] } {
        const workflows = Array.from(this.workflows.values());
        const allTriggers = workflows.flatMap(w => w.triggers);
        const uniqueTriggers = [...new Set(allTriggers)];
        
        return {
            total: workflows.length,
            enabled: workflows.filter(w => w.enabled).length,
            triggers: uniqueTriggers
        };
    }

    public listConnectors(): MCPConnector[] {
        return Array.from(this.connectors.values()).sort((a, b) => b.priority - a.priority);
    }

    public listWorkflows(): MCPWorkflow[] {
        return Array.from(this.workflows.values());
    }

    public toggleConnector(connectorId: string): void {
        const connector = this.connectors.get(connectorId);
        if (connector) {
            connector.enabled = !connector.enabled;
            this.updateStatusBar();
            this.log(`Connector ${connectorId} ${connector.enabled ? 'enabled' : 'disabled'}`);
        }
    }

    public async testConnector(connectorId: string): Promise<MCPResponse> {
        const connector = this.connectors.get(connectorId);
        if (!connector) {
            return {
                success: false,
                error: `Connector '${connectorId}' not found`
            };
        }

        // Test with a simple health check action
        return await this.executeConnector(connectorId, 'health', {}, {
            workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            timestamp: Date.now(),
            userRequest: 'health-check'
        });
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.outputChannel.dispose();
    }
}
