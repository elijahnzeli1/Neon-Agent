import * as vscode from 'vscode';
import { AICompletionProvider } from './providers/AICompletionProvider';
import { AIProvider } from './providers/AIProvider';
import { CodeAnalyzer } from './services/CodeAnalyzer';
import { RefactoringAgent } from './services/RefactoringAgent';
import { DocumentationGenerator } from './services/DocumentationGenerator';
import { NeonAgentWebviewProvider } from './providers/NeonAgentWebviewProvider';

let aiProvider: AIProvider;
let completionProvider: AICompletionProvider;
let codeAnalyzer: CodeAnalyzer;
let refactoringAgent: RefactoringAgent;
let documentationGenerator: DocumentationGenerator;
let webviewProvider: NeonAgentWebviewProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Neon Agent AI Extension is now active!');

    // Initialize AI providers and services
    aiProvider = new AIProvider();
    completionProvider = new AICompletionProvider(aiProvider);
    codeAnalyzer = new CodeAnalyzer(aiProvider);
    refactoringAgent = new RefactoringAgent(aiProvider);
    documentationGenerator = new DocumentationGenerator(aiProvider);
    webviewProvider = new NeonAgentWebviewProvider(context.extensionUri, aiProvider);

    // Register inline completion provider
    const completionDisposable = vscode.languages.registerInlineCompletionItemProvider(
        { pattern: '**' },
        completionProvider
    );

    // Register webview provider
    const webviewDisposable = vscode.window.registerWebviewViewProvider(
        'neonAgent.chatView',
        webviewProvider
    );

    // Register commands
    registerCommands(context);

    // Register disposables
    context.subscriptions.push(
        completionDisposable,
        webviewDisposable,
        aiProvider,
        completionProvider,
        codeAnalyzer,
        refactoringAgent,
        documentationGenerator,
        webviewProvider
    );

    // Show welcome message
    vscode.window.showInformationMessage(
        '🤖 Neon Agent is ready! Use Ctrl+Shift+P and search for "Neon Agent" commands.'
    );
}

function registerCommands(context: vscode.ExtensionContext) {
    // AI Chat Commands
    const chatCommand = vscode.commands.registerCommand('neonAgent.openChat', () => {
        vscode.commands.executeCommand('neonAgent.chatView.focus');
    });

    // Code Analysis Commands
    const explainCodeCommand = vscode.commands.registerCommand('neonAgent.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection.isEmpty ? undefined : selection);
        
        if (!text.trim()) {
            vscode.window.showWarningMessage('No code selected or file is empty');
            return;
        }

        try {
            const explanation = await codeAnalyzer.explainCode(text, editor.document.languageId);
            showResultInNewTab('Code Explanation', explanation, 'markdown');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to explain code: ${error}`);
        }
    });

    const findBugsCommand = vscode.commands.registerCommand('neonAgent.findBugs', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const text = editor.document.getText();
        
        try {
            const bugs = await codeAnalyzer.findBugs(text, editor.document.languageId);
            showResultInNewTab('Bug Analysis', bugs, 'markdown');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to analyze bugs: ${error}`);
        }
    });

    const generateTestsCommand = vscode.commands.registerCommand('neonAgent.generateTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection.isEmpty ? undefined : selection);
        
        try {
            const tests = await codeAnalyzer.generateTests(text, editor.document.languageId);
            showResultInNewTab('Generated Tests', tests, editor.document.languageId);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate tests: ${error}`);
        }
    });

    // Refactoring Commands
    const extractFunctionCommand = vscode.commands.registerCommand('neonAgent.extractFunction', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showWarningMessage('Please select code to extract into a function');
            return;
        }

        const selectedText = editor.document.getText(editor.selection);
        
        try {
            const refactored = await refactoringAgent.extractFunction(
                selectedText, 
                editor.document.languageId,
                editor.document.getText()
            );
            
            const edit = new vscode.WorkspaceEdit();
            edit.replace(editor.document.uri, editor.selection, refactored.replacement);
            
            if (refactored.functionDeclaration) {
                // Insert function declaration at appropriate location
                const insertPosition = findInsertPosition(editor.document);
                edit.insert(editor.document.uri, insertPosition, refactored.functionDeclaration + '\n\n');
            }
            
            await vscode.workspace.applyEdit(edit);
            vscode.window.showInformationMessage('Function extracted successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to extract function: ${error}`);
        }
    });

    const extractVariableCommand = vscode.commands.registerCommand('neonAgent.extractVariable', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showWarningMessage('Please select an expression to extract into a variable');
            return;
        }

        const selectedText = editor.document.getText(editor.selection);
        
        try {
            const refactored = await refactoringAgent.extractVariable(
                selectedText, 
                editor.document.languageId,
                editor.document.getText()
            );
            
            const edit = new vscode.WorkspaceEdit();
            edit.replace(editor.document.uri, editor.selection, refactored.replacement);
            
            // Insert variable declaration before the current line
            const line = editor.selection.start.line;
            const insertPosition = new vscode.Position(line, 0);
            edit.insert(editor.document.uri, insertPosition, refactored.variableDeclaration + '\n');
            
            await vscode.workspace.applyEdit(edit);
            vscode.window.showInformationMessage('Variable extracted successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to extract variable: ${error}`);
        }
    });

    const optimizeCodeCommand = vscode.commands.registerCommand('neonAgent.optimizeCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection.isEmpty ? undefined : selection);
        
        try {
            const optimized = await refactoringAgent.optimizeCode(text, editor.document.languageId);
            
            if (selection.isEmpty) {
                // Replace entire file
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(editor.document.getText().length)
                );
                edit.replace(editor.document.uri, fullRange, optimized);
                await vscode.workspace.applyEdit(edit);
            } else {
                // Replace selection
                const edit = new vscode.WorkspaceEdit();
                edit.replace(editor.document.uri, selection, optimized);
                await vscode.workspace.applyEdit(edit);
            }
            
            vscode.window.showInformationMessage('Code optimized successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to optimize code: ${error}`);
        }
    });

    // Documentation Commands
    const generateDocsCommand = vscode.commands.registerCommand('neonAgent.generateDocs', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection.isEmpty ? undefined : selection);
        
        try {
            const docs = await documentationGenerator.generateDocumentation(
                text, 
                editor.document.languageId
            );
            showResultInNewTab('Generated Documentation', docs, 'markdown');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate documentation: ${error}`);
        }
    });

    const addCommentsCommand = vscode.commands.registerCommand('neonAgent.addComments', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const text = editor.document.getText();
        
        try {
            const commented = await documentationGenerator.addComments(
                text, 
                editor.document.languageId
            );
            
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                editor.document.positionAt(0),
                editor.document.positionAt(text.length)
            );
            edit.replace(editor.document.uri, fullRange, commented);
            await vscode.workspace.applyEdit(edit);
            
            vscode.window.showInformationMessage('Comments added successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add comments: ${error}`);
        }
    });

    const generateReadmeCommand = vscode.commands.registerCommand('neonAgent.generateReadme', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder found');
            return;
        }

        try {
            const readme = await documentationGenerator.generateReadme(workspaceFolder.uri.fsPath);
            const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
            
            const edit = new vscode.WorkspaceEdit();
            edit.createFile(readmePath, { overwrite: true });
            edit.insert(readmePath, new vscode.Position(0, 0), readme);
            await vscode.workspace.applyEdit(edit);
            
            // Open the generated README
            const doc = await vscode.workspace.openTextDocument(readmePath);
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage('README.md generated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate README: ${error}`);
        }
    });

    // Configuration Commands
    const configureApiCommand = vscode.commands.registerCommand('neonAgent.configureApi', async () => {
        const provider = await vscode.window.showQuickPick(
            ['OpenAI', 'Anthropic Claude', 'Google Gemini', 'Local Model'],
            { placeHolder: 'Select AI provider to configure' }
        );

        if (!provider) return;

        const apiKey = await vscode.window.showInputBox({
            prompt: `Enter your ${provider} API key`,
            password: true,
            placeHolder: 'sk-...'
        });

        if (apiKey) {
            const config = vscode.workspace.getConfiguration('neonAgent');
            await config.update(`${provider.toLowerCase().replace(' ', '')}.apiKey`, apiKey, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`${provider} API key configured successfully!`);
        }
    });

    // Register all commands
    context.subscriptions.push(
        chatCommand,
        explainCodeCommand,
        findBugsCommand,
        generateTestsCommand,
        extractFunctionCommand,
        extractVariableCommand,
        optimizeCodeCommand,
        generateDocsCommand,
        addCommentsCommand,
        generateReadmeCommand,
        configureApiCommand
    );
}

function showResultInNewTab(title: string, content: string, language: string = 'plaintext') {
    vscode.workspace.openTextDocument({
        content,
        language
    }).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

function findInsertPosition(document: vscode.TextDocument): vscode.Position {
    // Find a good position to insert function (e.g., end of file or after imports)
    let insertLine = 0;
    
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        if (line.text.includes('import') || line.text.includes('require') || line.text.includes('#include')) {
            insertLine = i + 1;
        }
    }
    
    return new vscode.Position(insertLine, 0);
}

export function deactivate() {
    console.log('Neon Agent AI Extension deactivated');
}
