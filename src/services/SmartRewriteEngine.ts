import * as vscode from 'vscode';
import { AIProvider } from '../providers/AIProvider';

export interface RewriteRequest {
    type: 'function' | 'class' | 'module' | 'file' | 'selection';
    target: string;
    instruction: string;
    preserveInterface?: boolean;
    preserveTests?: boolean;
    additionalContext?: string;
}

export interface RewriteResult {
    originalCode: string;
    newCode: string;
    changes: string[];
    explanation: string;
    warnings: string[];
    dependencies: string[];
}

export class SmartRewriteEngine implements vscode.Disposable {
    private readonly aiProvider: AIProvider;
    private readonly outputChannel: vscode.OutputChannel;

    constructor(aiProvider: AIProvider) {
        this.aiProvider = aiProvider;
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent Rewrite Engine');
    }

    public async rewriteCode(request: RewriteRequest): Promise<RewriteResult> {
        this.log(`Starting rewrite: ${request.instruction}`);

        try {
            const context = await this.gatherContext(request);
            const originalCode = await this.extractOriginalCode(request);
            
            const prompt = this.buildRewritePrompt(request, originalCode, context);
            const response = await this.aiProvider.chat([{
                role: 'user',
                content: prompt
            }]);

            const result = this.parseRewriteResponse(response.content, originalCode);
            
            // Validate the rewrite
            await this.validateRewrite(result, request);
            
            return result;

        } catch (error) {
            this.log(`Rewrite failed: ${error}`);
            throw error;
        }
    }

    private async gatherContext(request: RewriteRequest): Promise<string> {
        let context = '';

        // Get current file context
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const document = activeEditor.document;
            context += `Current File: ${document.fileName}\n`;
            context += `Language: ${document.languageId}\n\n`;

            // Get imports and dependencies
            const imports = this.extractImports(document.getText(), document.languageId);
            if (imports.length > 0) {
                context += `Imports:\n${imports.join('\n')}\n\n`;
            }
        }

        // Get workspace context for module-level rewrites
        if (request.type === 'module' || request.type === 'file') {
            const workspaceFiles = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx,py,java,cs}');
            const relatedFiles = workspaceFiles
                .filter(file => this.isRelatedFile(file.fsPath, request.target))
                .slice(0, 10);

            if (relatedFiles.length > 0) {
                context += `Related Files:\n${relatedFiles.map(f => vscode.workspace.asRelativePath(f)).join('\n')}\n\n`;
            }
        }

        // Add additional context if provided
        if (request.additionalContext) {
            context += `Additional Context:\n${request.additionalContext}\n\n`;
        }

        return context;
    }

    private async extractOriginalCode(request: RewriteRequest): Promise<string> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            throw new Error('No active editor found');
        }

        const document = activeEditor.document;
        
        switch (request.type) {
            case 'selection':
                if (activeEditor.selection.isEmpty) {
                    throw new Error('No code selected');
                }
                return document.getText(activeEditor.selection);

            case 'function':
                return this.extractFunction(document, request.target);

            case 'class':
                return this.extractClass(document, request.target);

            case 'module':
            case 'file':
                return document.getText();

            default:
                throw new Error(`Unsupported rewrite type: ${request.type}`);
        }
    }

    private extractFunction(document: vscode.TextDocument, functionName: string): string {
        const text = document.getText();
        const language = document.languageId;
        
        let regex: RegExp;
        
        switch (language) {
            case 'javascript':
            case 'typescript':
            case 'javascriptreact':
            case 'typescriptreact':
                regex = new RegExp(`(function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}|${functionName}\\s*[=:]\\s*(?:function\\s*)?\\([^)]*\\)\\s*=>\\s*\\{[\\s\\S]*?\\n\\}|${functionName}\\s*[=:]\\s*(?:function\\s*)?\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\})`, 'g');
                break;
            case 'python':
                regex = new RegExp(`(def\\s+${functionName}\\s*\\([^)]*\\):[\\s\\S]*?)(?=\\n(?:def|class|$))`, 'g');
                break;
            default:
                throw new Error(`Function extraction not supported for ${language}`);
        }

        const match = regex.exec(text);
        if (!match) {
            throw new Error(`Function '${functionName}' not found`);
        }

        return match[1];
    }

    private extractClass(document: vscode.TextDocument, className: string): string {
        const text = document.getText();
        const language = document.languageId;
        
        let regex: RegExp;
        
        switch (language) {
            case 'javascript':
            case 'typescript':
            case 'javascriptreact':
            case 'typescriptreact':
                regex = new RegExp(`(class\\s+${className}[\\s\\S]*?\\n\\})`, 'g');
                break;
            case 'python':
                regex = new RegExp(`(class\\s+${className}[\\s\\S]*?)(?=\\nclass|\\n\\S|$)`, 'g');
                break;
            case 'java':
            case 'csharp':
                regex = new RegExp(`((?:public|private|protected)?\\s*class\\s+${className}[\\s\\S]*?\\n\\})`, 'g');
                break;
            default:
                throw new Error(`Class extraction not supported for ${language}`);
        }

        const match = regex.exec(text);
        if (!match) {
            throw new Error(`Class '${className}' not found`);
        }

        return match[1];
    }

    private extractImports(content: string, language: string): string[] {
        const imports: string[] = [];
        
        switch (language) {
            case 'javascript':
            case 'typescript':
            case 'javascriptreact':
            case 'typescriptreact':
                const jsImportRegex = /import\s+.*?from\s+['"][^'"]+['"];?/g;
                const jsRequireRegex = /const\s+.*?=\s+require\(['"][^'"]+['"]\);?/g;
                imports.push(...(content.match(jsImportRegex) || []));
                imports.push(...(content.match(jsRequireRegex) || []));
                break;
                
            case 'python':
                const pyImportRegex = /(?:import\s+[\w.]+|from\s+[\w.]+\s+import\s+.*)/g;
                imports.push(...(content.match(pyImportRegex) || []));
                break;
                
            case 'java':
                const javaImportRegex = /import\s+[\w.]+\*?;/g;
                imports.push(...(content.match(javaImportRegex) || []));
                break;
        }
        
        return imports;
    }

    private isRelatedFile(filePath: string, target: string): boolean {
        const fileName = filePath.toLowerCase();
        const targetLower = target.toLowerCase();
        
        return fileName.includes(targetLower) || 
               fileName.includes(targetLower.replace(/([A-Z])/g, '-$1').toLowerCase()) ||
               fileName.includes(targetLower.replace(/([A-Z])/g, '_$1').toLowerCase());
    }

    private buildRewritePrompt(request: RewriteRequest, originalCode: string, context: string): string {
        const basePrompt = `You are an expert software engineer. Rewrite the following code according to the instructions.

REWRITE TYPE: ${request.type}
TARGET: ${request.target}
INSTRUCTION: ${request.instruction}

ORIGINAL CODE:
\`\`\`
${originalCode}
\`\`\`

CONTEXT:
${context}

REQUIREMENTS:
${request.preserveInterface ? '- MUST preserve the existing interface/API' : '- Interface can be modified if needed'}
${request.preserveTests ? '- MUST ensure existing tests continue to pass' : '- Tests may need updates'}
- Follow language best practices and conventions
- Maintain or improve performance
- Add proper error handling
- Include comprehensive comments
- Ensure type safety (for typed languages)

Please provide the rewritten code along with:
1. A clear explanation of changes made
2. Any warnings or considerations
3. Dependencies that may need to be added/updated

Format your response as:
REWRITTEN_CODE:
\`\`\`
[rewritten code here]
\`\`\`

EXPLANATION:
[explanation of changes]

CHANGES:
- [specific change 1]
- [specific change 2]
- [etc.]

WARNINGS:
- [any warnings or considerations]

DEPENDENCIES:
- [any new dependencies needed]`;

        return basePrompt;
    }

    private parseRewriteResponse(response: string, originalCode: string): RewriteResult {
        const sections = this.parseSections(response);
        
        return {
            originalCode,
            newCode: sections.REWRITTEN_CODE || sections.CODE || originalCode,
            explanation: sections.EXPLANATION || 'No explanation provided',
            changes: this.parseList(sections.CHANGES),
            warnings: this.parseList(sections.WARNINGS),
            dependencies: this.parseList(sections.DEPENDENCIES)
        };
    }

    private parseSections(response: string): { [key: string]: string } {
        const sections: { [key: string]: string } = {};
        const lines = response.split('\n');
        let currentSection = '';
        let currentContent: string[] = [];

        for (const line of lines) {
            const sectionMatch = line.match(/^([A-Z_]+):\s*$/);
            if (sectionMatch) {
                if (currentSection && currentContent.length > 0) {
                    sections[currentSection] = currentContent.join('\n').trim();
                }
                currentSection = sectionMatch[1];
                currentContent = [];
            } else if (currentSection) {
                currentContent.push(line);
            }
        }

        // Add the last section
        if (currentSection && currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
        }

        // Extract code from markdown blocks
        for (const [key, value] of Object.entries(sections)) {
            if (key.includes('CODE')) {
                const codeMatch = value.match(/```[\w]*\n([\s\S]*?)\n```/);
                if (codeMatch) {
                    sections[key] = codeMatch[1];
                }
            }
        }

        return sections;
    }

    private parseList(content: string): string[] {
        if (!content) return [];
        
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('-'))
            .map(line => line.substring(1).trim())
            .filter(line => line.length > 0);
    }

    private async validateRewrite(result: RewriteResult, request: RewriteRequest): Promise<void> {
        // Basic validation
        if (!result.newCode || result.newCode.trim().length === 0) {
            throw new Error('Rewrite produced empty code');
        }

        // Language-specific syntax validation could be added here
        // For now, we'll do basic checks

        if (request.preserveInterface) {
            await this.validateInterfacePreservation(result, request);
        }

        // Check for common issues
        this.checkForCommonIssues(result);
    }

    private async validateInterfacePreservation(result: RewriteResult, request: RewriteRequest): Promise<void> {
        // Extract function/class signatures from original and new code
        const originalSignatures = this.extractSignatures(result.originalCode);
        const newSignatures = this.extractSignatures(result.newCode);

        const missingSignatures = originalSignatures.filter(sig => 
            !newSignatures.some(newSig => this.signaturesMatch(sig, newSig))
        );

        if (missingSignatures.length > 0) {
            result.warnings.push(`Interface preservation warning: Missing signatures: ${missingSignatures.join(', ')}`);
        }
    }

    private extractSignatures(code: string): string[] {
        const signatures: string[] = [];
        
        // Extract function signatures (simplified)
        const funcRegex = /(?:function\s+(\w+)\s*\([^)]*\)|(\w+)\s*\([^)]*\)\s*[{=]|def\s+(\w+)\s*\([^)]*\))/g;
        let match;
        while ((match = funcRegex.exec(code)) !== null) {
            signatures.push(match[1] || match[2] || match[3]);
        }

        // Extract class signatures
        const classRegex = /class\s+(\w+)/g;
        while ((match = classRegex.exec(code)) !== null) {
            signatures.push(match[1]);
        }

        return signatures;
    }

    private signaturesMatch(sig1: string, sig2: string): boolean {
        return sig1.toLowerCase() === sig2.toLowerCase();
    }

    private checkForCommonIssues(result: RewriteResult): void {
        const code = result.newCode;

        // Check for TODO/FIXME comments
        if (code.includes('TODO') || code.includes('FIXME')) {
            result.warnings.push('Code contains TODO/FIXME comments that need attention');
        }

        // Check for console.log/print statements
        if (code.includes('console.log') || code.includes('print(')) {
            result.warnings.push('Code contains debug statements that should be removed');
        }

        // Check for empty catch blocks
        if (code.includes('catch') && code.includes('{}')) {
            result.warnings.push('Code contains empty catch blocks');
        }
    }

    public async applyRewrite(result: RewriteResult, range?: vscode.Range): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            throw new Error('No active editor found');
        }

        const edit = new vscode.WorkspaceEdit();
        const targetRange = range || new vscode.Range(
            new vscode.Position(0, 0),
            activeEditor.document.lineAt(activeEditor.document.lineCount - 1).range.end
        );

        edit.replace(activeEditor.document.uri, targetRange, result.newCode);
        
        const success = await vscode.workspace.applyEdit(edit);
        if (!success) {
            throw new Error('Failed to apply rewrite');
        }

        // Show summary
        this.showRewriteSummary(result);
    }

    private showRewriteSummary(result: RewriteResult): void {
        const panel = vscode.window.createWebviewPanel(
            'rewriteSummary',
            'Rewrite Summary',
            vscode.ViewColumn.Beside,
            { enableScripts: false }
        );

        panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .section { margin: 20px 0; }
        .warning { color: var(--vscode-errorForeground); }
        .change { color: var(--vscode-gitDecoration-modifiedResourceForeground); }
        .dependency { color: var(--vscode-textLink-foreground); }
        pre { background: var(--vscode-textBlockQuote-background); padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🔄 Rewrite Complete</h1>
    
    <div class="section">
        <h3>Explanation</h3>
        <p>${result.explanation}</p>
    </div>
    
    ${result.changes.length > 0 ? `
        <div class="section">
            <h3>Changes Made</h3>
            <ul>
                ${result.changes.map(change => `<li class="change">${change}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
    
    ${result.warnings.length > 0 ? `
        <div class="section">
            <h3>⚠️ Warnings</h3>
            <ul>
                ${result.warnings.map(warning => `<li class="warning">${warning}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
    
    ${result.dependencies.length > 0 ? `
        <div class="section">
            <h3>📦 Dependencies</h3>
            <ul>
                ${result.dependencies.map(dep => `<li class="dependency">${dep}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
</body>
</html>`;
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
