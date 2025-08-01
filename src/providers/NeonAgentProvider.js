const vscode = require('vscode');

class NeonAgentProvider {
    constructor(context, aiService) {
        this.context = context;
        this.aiService = aiService;
        this.isActive = false;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('neon-agent');
        this.context.subscriptions.push(this.diagnosticCollection);
    }

    activate() {
        this.isActive = true;
        vscode.window.showInformationMessage('Neon Agent is now actively monitoring your code');

        // Start monitoring the active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            this.onActiveEditorChanged(activeEditor);
        }
    }

    deactivate() {
        this.isActive = false;
        this.diagnosticCollection.clear();
        vscode.window.showInformationMessage('Neon Agent monitoring disabled');
    }

    async onActiveEditorChanged(editor) {
        if (!this.isActive || !editor) return;

        try {
            // Provide context-aware suggestions for the current file
            await this.analyzeDocument(editor.document);
        } catch (error) {
            console.error('Error analyzing document:', error);
        }
    }

    async onDocumentChanged(event) {
        if (!this.isActive) return;

        try {
            // Debounce the analysis to avoid too many calls
            if (this.analysisTimeout) {
                clearTimeout(this.analysisTimeout);
            }

            this.analysisTimeout = setTimeout(async () => {
                await this.analyzeDocument(event.document);
            }, 2000); // Wait 2 seconds after last change
        } catch (error) {
            console.error('Error handling document change:', error);
        }
    }

    async analyzeDocument(document) {
        if (!document || document.isUntitled) return;

        try {
            const code = document.getText();
            const language = document.languageId;

            // Skip analysis for very large files
            if (code.length > 100000) {
                return;
            }

            // Get AI-powered insights
            const suggestions = await this.getSuggestions(code, language);

            // Convert suggestions to VS Code diagnostics
            const diagnostics = this.convertSuggestionsToDiagnostics(suggestions, document);

            // Update diagnostics
            this.diagnosticCollection.set(document.uri, diagnostics);

        } catch (error) {
            console.error('Error analyzing document:', error);
        }
    }

    async getSuggestions(code, language) {
        try {
            if (!this.aiService.model) {
                return [];
            }

            const prompt = `
Analyze this ${language} code and provide specific, actionable suggestions for improvement.
Focus on:
- Code quality issues
- Performance optimizations  
- Security vulnerabilities
- Best practices violations

Code:
\`\`\`${language}
${code}
\`\`\`

Provide suggestions in this format:
LINE:number MESSAGE:suggestion text SEVERITY:error|warning|info

Example:
LINE:5 MESSAGE:Consider using const instead of var for immutable variables SEVERITY:warning
LINE:12 MESSAGE:Potential security vulnerability: user input not validated SEVERITY:error

Suggestions:`;

            const response = await this.aiService.chat(prompt);
            return this.parseSuggestions(response);
        } catch (error) {
            console.error('Error getting AI suggestions:', error);
            return [];
        }
    }

    parseSuggestions(response) {
        const suggestions = [];
        const lines = response.split('\n');

        for (const line of lines) {
            const match = line.match(/LINE:(\d+)\s+MESSAGE:(.*?)\s+SEVERITY:(error|warning|info)/);
            if (match) {
                suggestions.push({
                    line: parseInt(match[1]) - 1, // Convert to 0-based
                    message: match[2].trim(),
                    severity: match[3]
                });
            }
        }

        return suggestions;
    }

    convertSuggestionsToDiagnostics(suggestions, document) {
        const diagnostics = [];

        for (const suggestion of suggestions) {
            try {
                const line = Math.max(0, Math.min(suggestion.line, document.lineCount - 1));
                const range = document.lineAt(line).range;

                let severity;
                switch (suggestion.severity) {
                case 'error':
                    severity = vscode.DiagnosticSeverity.Error;
                    break;
                case 'warning':
                    severity = vscode.DiagnosticSeverity.Warning;
                    break;
                default:
                    severity = vscode.DiagnosticSeverity.Information;
                }

                const diagnostic = new vscode.Diagnostic(
                    range,
                    suggestion.message,
                    severity
                );
                diagnostic.source = 'Neon Agent';
                diagnostics.push(diagnostic);
            } catch (error) {
                console.error('Error creating diagnostic:', error);
            }
        }

        return diagnostics;
    }

    async provideInlineCompletions(document, position) {
        if (!this.isActive || !this.aiService.model) {
            return null;
        }

        try {
            const code = document.getText();
            const offset = document.offsetAt(position);

            const completions = await this.aiService.getCompletions(code, offset, document.languageId);

            return completions.map(completion => ({
                insertText: completion,
                range: new vscode.Range(position, position)
            }));
        } catch (error) {
            console.error('Error providing completions:', error);
            return null;
        }
    }

    async provideCodeActions(document, range, context) {
        const actions = [];

        try {
            // Add code action for explaining selected code
            if (!range.isEmpty) {
                const explainAction = new vscode.CodeAction(
                    'Explain with Neon Agent',
                    vscode.CodeActionKind.Empty
                );
                explainAction.command = {
                    command: 'neon-agent.explain',
                    title: 'Explain with Neon Agent',
                    arguments: [document.getText(range), document.languageId]
                };
                actions.push(explainAction);

                // Add code action for refactoring selected code
                const refactorAction = new vscode.CodeAction(
                    'Refactor with Neon Agent',
                    vscode.CodeActionKind.Refactor
                );
                refactorAction.command = {
                    command: 'neon-agent.refactor',
                    title: 'Refactor with Neon Agent',
                    arguments: [document, range]
                };
                actions.push(refactorAction);
            }

            // Add actions for diagnostics
            for (const diagnostic of context.diagnostics) {
                if (diagnostic.source === 'Neon Agent') {
                    const fixAction = new vscode.CodeAction(
                        `Fix: ${diagnostic.message}`,
                        vscode.CodeActionKind.QuickFix
                    );
                    fixAction.command = {
                        command: 'neon-agent.fix',
                        title: 'Fix with Neon Agent',
                        arguments: [document, diagnostic]
                    };
                    actions.push(fixAction);
                }
            }
        } catch (error) {
            console.error('Error providing code actions:', error);
        }

        return actions;
    }
}

module.exports = { NeonAgentProvider };
