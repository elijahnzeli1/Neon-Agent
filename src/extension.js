const vscode = require('vscode');
const { NeonAgentProvider } = require('./providers/NeonAgentProvider');
const { ChatWebviewProvider } = require('./providers/ChatWebviewProvider');
const { CodeAnalyzer } = require('./services/CodeAnalyzer');
const { AIService } = require('./services/AIService');
const server = require('./server');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Neon Agent is now active!');

    // Initialize services
    const aiService = new AIService();
    const codeAnalyzer = new CodeAnalyzer();

    // Initialize providers
    const neonAgentProvider = new NeonAgentProvider(context, aiService);
    const chatProvider = new ChatWebviewProvider(context, aiService);

    // Register the chat webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('neon-agent.chatView', chatProvider)
    );

    // Register commands
    const activateCommand = vscode.commands.registerCommand('neon-agent.activate', () => {
        vscode.window.showInformationMessage('Neon Agent activated!');
        neonAgentProvider.activate();
    });

    const chatCommand = vscode.commands.registerCommand('neon-agent.chat', () => {
        chatProvider.show();
    });

    const analyzeCommand = vscode.commands.registerCommand('neon-agent.analyze', async (uri) => {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const analysis = await codeAnalyzer.analyze(document.getText(), document.languageId);

            vscode.window.showInformationMessage(`Analysis complete: ${analysis.summary}`);

            // Show detailed analysis in output channel
            const outputChannel = vscode.window.createOutputChannel('Neon Agent Analysis');
            outputChannel.clear();
            outputChannel.appendLine('=== Neon Agent Code Analysis ===');
            outputChannel.appendLine(`File: ${uri.fsPath}`);
            outputChannel.appendLine(`Language: ${document.languageId}`);
            outputChannel.appendLine('');
            outputChannel.appendLine('Summary:');
            outputChannel.appendLine(analysis.summary);
            outputChannel.appendLine('');
            outputChannel.appendLine('Suggestions:');
            analysis.suggestions.forEach((suggestion, index) => {
                outputChannel.appendLine(`${index + 1}. ${suggestion}`);
            });
            outputChannel.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
        }
    });

    // Register event listeners
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && vscode.workspace.getConfiguration('neon-agent').get('autoSuggest')) {
            neonAgentProvider.onActiveEditorChanged(editor);
        }
    });

    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
        if (vscode.workspace.getConfiguration('neon-agent').get('autoSuggest')) {
            neonAgentProvider.onDocumentChanged(event);
        }
    });

    // Add all subscriptions
    context.subscriptions.push(
        activateCommand,
        chatCommand,
        analyzeCommand,
        onDidChangeActiveTextEditor,
        onDidChangeTextDocument
    );

    // Start the Express server for API endpoints
    const port = vscode.workspace.getConfiguration('neon-agent').get('serverPort') || 3000;
    server.start(port, context);

    // Show welcome message
    vscode.window.showInformationMessage(
        'Neon Agent is ready! Use Ctrl+Shift+N to open chat.',
        'Open Chat'
    ).then(selection => {
        if (selection === 'Open Chat') {
            vscode.commands.executeCommand('neon-agent.chat');
        }
    });
}

function deactivate() {
    console.log('Neon Agent deactivated');
    server.stop();
}

module.exports = {
    activate,
    deactivate
};
