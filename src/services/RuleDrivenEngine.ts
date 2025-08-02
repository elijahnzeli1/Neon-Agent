import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface NeonRule {
    id: string;
    name: string;
    description: string;
    pattern: string;
    action: 'suggest' | 'enforce' | 'warn' | 'block';
    languages: string[];
    enabled: boolean;
    severity: 'info' | 'warning' | 'error';
    customLogic?: string;
}

export interface RuleViolation {
    rule: NeonRule;
    range: vscode.Range;
    message: string;
    suggestion?: string;
    quickFix?: vscode.CodeAction;
}

export interface ProjectRules {
    extends?: string[];
    rules: { [key: string]: NeonRule };
    globals?: { [key: string]: any };
    customFunctions?: { [key: string]: string };
}

export class RuleDrivenEngine implements vscode.Disposable {
    private readonly outputChannel: vscode.OutputChannel;
    private readonly diagnosticCollection: vscode.DiagnosticCollection;
    private projectRules: ProjectRules = { rules: {} };
    private readonly ruleWatcher: vscode.FileSystemWatcher;
    private readonly disposables: vscode.Disposable[] = [];

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent Rules');
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('neonAgent.rules');
        
        // Watch for .neonrules files
        this.ruleWatcher = vscode.workspace.createFileSystemWatcher('**/.neonrules*');
        this.ruleWatcher.onDidCreate(this.loadProjectRules.bind(this));
        this.ruleWatcher.onDidChange(this.loadProjectRules.bind(this));
        this.ruleWatcher.onDidDelete(this.clearProjectRules.bind(this));
        
        this.disposables.push(this.ruleWatcher, this.diagnosticCollection);
        
        // Set up document event listeners
        this.setupEventListeners();
        
        // Load initial rules
        this.loadProjectRules();
        this.loadBuiltinRules();
    }

    private setupEventListeners(): void {
        this.disposables.push(
            vscode.workspace.onDidOpenTextDocument(this.analyzeDocument.bind(this)),
            vscode.workspace.onDidChangeTextDocument(this.onDocumentChange.bind(this)),
            vscode.workspace.onDidSaveTextDocument(this.analyzeDocument.bind(this))
        );
    }

    private async loadProjectRules(): Promise<void> {
        try {
            const ruleFiles = await vscode.workspace.findFiles('**/.neonrules*');
            
            if (ruleFiles.length === 0) {
                this.log('No .neonrules files found');
                return;
            }

            // Load the first .neonrules file found
            const ruleFile = ruleFiles[0];
            const content = await fs.promises.readFile(ruleFile.fsPath, 'utf8');
            
            if (ruleFile.fsPath.endsWith('.json')) {
                this.projectRules = JSON.parse(content);
            } else if (ruleFile.fsPath.endsWith('.js')) {
                // Evaluate JavaScript rules file
                this.projectRules = this.evaluateJSRules(content);
            } else {
                // Default to JSON
                this.projectRules = JSON.parse(content);
            }

            this.log(`Loaded ${Object.keys(this.projectRules.rules).length} project rules`);
            
            // Re-analyze all open documents
            for (const document of vscode.workspace.textDocuments) {
                this.analyzeDocument(document);
            }
            
        } catch (error) {
            this.log(`Error loading project rules: ${error}`);
        }
    }

    private evaluateJSRules(content: string): ProjectRules {
        try {
            // Create a safe evaluation context
            const context = {
                rules: {} as { [key: string]: NeonRule },
                extends: [] as string[],
                globals: {} as { [key: string]: any },
                customFunctions: {} as { [key: string]: string },
                
                // Helper functions for rule definition
                rule: (id: string, config: Partial<NeonRule>) => {
                    context.rules[id] = {
                        id,
                        name: config.name || id,
                        description: config.description || '',
                        pattern: config.pattern || '',
                        action: config.action || 'warn',
                        languages: config.languages || ['*'],
                        enabled: config.enabled !== false,
                        severity: config.severity || 'warning',
                        customLogic: config.customLogic
                    };
                },
                
                extend: (preset: string) => {
                    context.extends.push(preset);
                },
                
                global: (name: string, value: any) => {
                    context.globals[name] = value;
                },
                
                fn: (name: string, code: string) => {
                    context.customFunctions[name] = code;
                }
            };

            // Evaluate the rules file in the safe context
            const func = new Function(...Object.keys(context), content);
            func(...Object.values(context));
            
            return {
                extends: context.extends,
                rules: context.rules,
                globals: context.globals,
                customFunctions: context.customFunctions
            };
            
        } catch (error) {
            this.log(`Error evaluating JS rules: ${error}`);
            return { rules: {} };
        }
    }

    private loadBuiltinRules(): void {
        // Load built-in rules for common scenarios
        const builtinRules: { [key: string]: NeonRule } = {
            'no-console': {
                id: 'no-console',
                name: 'No Console Statements',
                description: 'Discourage console.log in production code',
                pattern: 'console\\.(log|warn|error|info)',
                action: 'warn',
                languages: ['javascript', 'typescript'],
                enabled: true,
                severity: 'warning'
            },
            
            'prefer-const': {
                id: 'prefer-const',
                name: 'Prefer Const',
                description: 'Use const for variables that are never reassigned',
                pattern: 'let\\s+(\\w+)\\s*=',
                action: 'suggest',
                languages: ['javascript', 'typescript'],
                enabled: true,
                severity: 'info'
            },
            
            'no-any-type': {
                id: 'no-any-type',
                name: 'No Any Type',
                description: 'Avoid using "any" type in TypeScript',
                pattern: ':\\s*any\\b',
                action: 'warn',
                languages: ['typescript'],
                enabled: true,
                severity: 'warning'
            },
            
            'function-length': {
                id: 'function-length',
                name: 'Function Length',
                description: 'Functions should not be too long',
                pattern: '',
                action: 'warn',
                languages: ['*'],
                enabled: true,
                severity: 'info',
                customLogic: 'checkFunctionLength'
            },
            
            'no-hardcoded-secrets': {
                id: 'no-hardcoded-secrets',
                name: 'No Hardcoded Secrets',
                description: 'Detect potential hardcoded secrets',
                pattern: '(password|secret|key|token)\\s*[=:]\\s*["\'][^"\']+["\']',
                action: 'warn',
                languages: ['*'],
                enabled: true,
                severity: 'error'
            }
        };

        // Merge with existing rules (project rules take precedence)
        for (const [id, rule] of Object.entries(builtinRules)) {
            if (!this.projectRules.rules[id]) {
                this.projectRules.rules[id] = rule;
            }
        }
    }

    private clearProjectRules(): void {
        this.projectRules = { rules: {} };
        this.loadBuiltinRules();
        this.diagnosticCollection.clear();
    }

    private onDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        // Debounce analysis for performance
        setTimeout(() => {
            this.analyzeDocument(event.document);
        }, 500);
    }

    private async analyzeDocument(document: vscode.TextDocument): Promise<void> {
        if (document.isUntitled || document.uri.scheme !== 'file') {
            return;
        }

        const violations = await this.checkRules(document);
        this.applyRuleViolations(document, violations);
    }

    private async checkRules(document: vscode.TextDocument): Promise<RuleViolation[]> {
        const violations: RuleViolation[] = [];
        const text = document.getText();
        const language = document.languageId;

        for (const rule of Object.values(this.projectRules.rules)) {
            if (!rule.enabled || !this.isLanguageSupported(rule, language)) {
                continue;
            }

            try {
                if (rule.customLogic) {
                    const customViolations = await this.executeCustomLogic(rule, document);
                    violations.push(...customViolations);
                } else if (rule.pattern) {
                    const patternViolations = this.checkPattern(rule, document, text);
                    violations.push(...patternViolations);
                }
            } catch (error) {
                this.log(`Error executing rule ${rule.id}: ${error}`);
            }
        }

        return violations;
    }

    private isLanguageSupported(rule: NeonRule, language: string): boolean {
        return rule.languages.includes('*') || rule.languages.includes(language);
    }

    private checkPattern(rule: NeonRule, document: vscode.TextDocument, text: string): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const regex = new RegExp(rule.pattern, 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
            const position = document.positionAt(match.index);
            const endPosition = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(position, endPosition);

            violations.push({
                rule,
                range,
                message: `${rule.name}: ${rule.description}`,
                suggestion: this.generateSuggestion(rule, match[0]),
                quickFix: this.generateQuickFix(rule, range, match[0])
            });
        }

        return violations;
    }

    private async executeCustomLogic(rule: NeonRule, document: vscode.TextDocument): Promise<RuleViolation[]> {
        const violations: RuleViolation[] = [];

        try {
            switch (rule.customLogic) {
                case 'checkFunctionLength':
                    violations.push(...this.checkFunctionLength(rule, document));
                    break;
                    
                default:
                    // Try to execute custom function if defined
                    if (rule.customLogic && this.projectRules.customFunctions && this.projectRules.customFunctions[rule.customLogic]) {
                        const customCode = this.projectRules.customFunctions[rule.customLogic];
                        violations.push(...this.executeCustomFunction(rule, document, customCode));
                    }
                    break;
            }
        } catch (error) {
            this.log(`Error in custom logic for rule ${rule.id}: ${error}`);
        }

        return violations;
    }

    private checkFunctionLength(rule: NeonRule, document: vscode.TextDocument): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        const maxLength = 50; // Configurable threshold

        // Simple function detection (can be improved)
        const functionRegex = /function\s+\w+|=>\s*{|:\s*\([^)]*\)\s*=>/gi;
        let match;

        while ((match = functionRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = this.findFunctionEnd(text, match.index);
            
            if (endPos > match.index) {
                const endPosition = document.positionAt(endPos);
                const lineCount = endPosition.line - startPos.line + 1;

                if (lineCount > maxLength) {
                    violations.push({
                        rule,
                        range: new vscode.Range(startPos, endPosition),
                        message: `Function is ${lineCount} lines long (max: ${maxLength})`,
                        suggestion: 'Consider breaking this function into smaller functions'
                    });
                }
            }
        }

        return violations;
    }

    private findFunctionEnd(text: string, startIndex: number): number {
        let braceCount = 0;
        let i = startIndex;
        let foundStart = false;

        while (i < text.length) {
            const char = text[i];
            
            if (char === '{') {
                braceCount++;
                foundStart = true;
            } else if (char === '}') {
                braceCount--;
                if (foundStart && braceCount === 0) {
                    return i + 1;
                }
            }
            
            i++;
        }

        return startIndex;
    }

    private executeCustomFunction(rule: NeonRule, document: vscode.TextDocument, customCode: string): RuleViolation[] {
        try {
            // Create a safe execution context
            const context = {
                document,
                text: document.getText(),
                violations: [] as RuleViolation[],
                
                // Helper functions for custom rules
                addViolation: (line: number, character: number, length: number, message: string) => {
                    const start = new vscode.Position(line, character);
                    const end = new vscode.Position(line, character + length);
                    context.violations.push({
                        rule,
                        range: new vscode.Range(start, end),
                        message,
                        suggestion: ''
                    });
                },
                
                findPattern: (pattern: string) => {
                    const regex = new RegExp(pattern, 'gi');
                    const matches = [];
                    let match;
                    while ((match = regex.exec(context.text)) !== null) {
                        matches.push({
                            text: match[0],
                            index: match.index,
                            position: document.positionAt(match.index)
                        });
                    }
                    return matches;
                }
            };

            // Execute the custom function
            const func = new Function('context', 'document', 'text', 'addViolation', 'findPattern', customCode);
            func(context, context.document, context.text, context.addViolation, context.findPattern);
            
            return context.violations;
            
        } catch (error) {
            this.log(`Error executing custom function: ${error}`);
            return [];
        }
    }

    private generateSuggestion(rule: NeonRule, matchText: string): string {
        switch (rule.id) {
            case 'no-console':
                return 'Use a proper logging library instead of console statements';
            case 'prefer-const':
                return `Change 'let' to 'const' if the variable is never reassigned`;
            case 'no-any-type':
                return 'Specify a more specific type instead of "any"';
            default:
                return `Follow the rule: ${rule.description}`;
        }
    }

    private generateQuickFix(rule: NeonRule, range: vscode.Range, matchText: string): vscode.CodeAction | undefined {
        const action = new vscode.CodeAction(`Fix: ${rule.name}`, vscode.CodeActionKind.QuickFix);
        
        switch (rule.id) {
            case 'prefer-const':
                const edit = new vscode.WorkspaceEdit();
                edit.replace(vscode.window.activeTextEditor!.document.uri, range, matchText.replace('let', 'const'));
                action.edit = edit;
                return action;
                
            case 'no-console':
                action.command = {
                    command: 'neonAgent.removeConsole',
                    title: 'Remove console statement',
                    arguments: [range]
                };
                return action;
                
            default:
                return undefined;
        }
    }

    private applyRuleViolations(document: vscode.TextDocument, violations: RuleViolation[]): void {
        const diagnostics: vscode.Diagnostic[] = violations.map(violation => {
            const diagnostic = new vscode.Diagnostic(
                violation.range,
                violation.message,
                this.severityToDiagnosticSeverity(violation.rule.severity)
            );
            
            diagnostic.source = 'Neon Agent Rules';
            diagnostic.code = violation.rule.id;
            
            return diagnostic;
        });

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private severityToDiagnosticSeverity(severity: string): vscode.DiagnosticSeverity {
        switch (severity) {
            case 'error': return vscode.DiagnosticSeverity.Error;
            case 'warning': return vscode.DiagnosticSeverity.Warning;
            case 'info': return vscode.DiagnosticSeverity.Information;
            default: return vscode.DiagnosticSeverity.Warning;
        }
    }

    public async createSampleRulesFile(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const rulesFilePath = path.join(workspaceFolder.uri.fsPath, '.neonrules.js');
        
        const sampleContent = `// Neon Agent Rules Configuration
// This file defines custom coding standards and domain-specific logic for your project

// Built-in rule configurations
rule('no-console', {
    name: 'No Console Statements',
    description: 'Avoid console statements in production code',
    pattern: 'console\\\\.(log|warn|error|info)',
    action: 'warn',
    languages: ['javascript', 'typescript'],
    severity: 'warning'
});

rule('prefer-const', {
    name: 'Prefer Const',
    description: 'Use const for variables that are never reassigned',
    pattern: 'let\\\\s+(\\\\w+)\\\\s*=',
    action: 'suggest',
    languages: ['javascript', 'typescript'],
    severity: 'info'
});

// Custom domain-specific rules
rule('api-error-handling', {
    name: 'API Error Handling',
    description: 'All API calls should have proper error handling',
    customLogic: 'checkApiErrorHandling',
    languages: ['javascript', 'typescript'],
    action: 'warn'
});

rule('component-naming', {
    name: 'Component Naming Convention',
    description: 'React components should use PascalCase',
    pattern: 'function\\\\s+[a-z][\\\\w]*\\\\s*\\\\([^)]*\\\\)\\\\s*{[\\\\s\\\\S]*?return\\\\s*<',
    action: 'warn',
    languages: ['javascriptreact', 'typescriptreact'],
    severity: 'warning'
});

// Global configuration
global('maxFunctionLength', 50);
global('maxComplexity', 10);

// Custom function for API error handling check
fn('checkApiErrorHandling', \`
const apiCallPattern = /(fetch|axios|http)\\\\s*\\\\(/gi;
const matches = findPattern(apiCallPattern.source);

for (const match of matches) {
    const line = match.position.line;
    const lineText = document.lineAt(line).text;
    
    // Check if there's error handling nearby
    let hasErrorHandling = false;
    for (let i = Math.max(0, line - 3); i <= Math.min(document.lineCount - 1, line + 10); i++) {
        const checkLine = document.lineAt(i).text;
        if (checkLine.includes('catch') || checkLine.includes('.catch') || checkLine.includes('try')) {
            hasErrorHandling = true;
            break;
        }
    }
    
    if (!hasErrorHandling) {
        addViolation(line, match.position.character, match.text.length, 
            'API call should have error handling with try/catch or .catch()');
    }
}
\`);

// Extend from community presets (future feature)
// extend('@neon/react-best-practices');
// extend('@neon/typescript-strict');
`;

        try {
            await fs.promises.writeFile(rulesFilePath, sampleContent);
            
            const document = await vscode.workspace.openTextDocument(rulesFilePath);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage('Sample .neonrules.js file created! Customize it for your project.');
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create rules file: ${error}`);
        }
    }

    public getRuleStats(): { total: number; enabled: number; byLanguage: { [key: string]: number } } {
        const rules = Object.values(this.projectRules.rules);
        const byLanguage: { [key: string]: number } = {};
        
        for (const rule of rules) {
            for (const lang of rule.languages) {
                byLanguage[lang] = (byLanguage[lang] || 0) + 1;
            }
        }
        
        return {
            total: rules.length,
            enabled: rules.filter(r => r.enabled).length,
            byLanguage
        };
    }

    public toggleRule(ruleId: string): void {
        const rule = this.projectRules.rules[ruleId];
        if (rule) {
            rule.enabled = !rule.enabled;
            this.log(`Rule ${ruleId} ${rule.enabled ? 'enabled' : 'disabled'}`);
            
            // Re-analyze all documents
            for (const document of vscode.workspace.textDocuments) {
                this.analyzeDocument(document);
            }
        }
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
