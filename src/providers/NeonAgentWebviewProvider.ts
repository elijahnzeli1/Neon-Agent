import * as vscode from 'vscode';
import { AIProvider } from '../providers/AIProvider';

export class NeonAgentWebviewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    public static readonly viewType = 'neonAgent.chatView';
    
    private _view?: vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;
    private readonly aiProvider: AIProvider;
    private chatHistory: Array<{role: 'user' | 'assistant', content: string, timestamp: Date}> = [];

    constructor(extensionUri: vscode.Uri, aiProvider: AIProvider) {
        this._extensionUri = extensionUri;
        this.aiProvider = aiProvider;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleChatMessage(data.message);
                    break;
                case 'clearChat':
                    this.clearChat();
                    break;
                case 'exportChat':
                    this.exportChat();
                    break;
            }
        });
    }

    private async handleChatMessage(message: string) {
        if (!this._view) return;

        try {
            // Add user message to history
            this.chatHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date()
            });

            // Update UI to show user message and thinking state
            this._view.webview.postMessage({
                type: 'userMessage',
                message: message,
                timestamp: new Date().toISOString()
            });

            this._view.webview.postMessage({
                type: 'thinking'
            });

            // Get context from current editor
            const context = this.getCurrentContext();
            
            // Prepare AI messages
            const aiMessages = [
                {
                    role: 'system' as const,
                    content: `You are Neon Agent, an expert AI coding assistant. You help developers with:
- Code analysis and explanation
- Bug finding and fixing
- Code generation and completion
- Refactoring suggestions
- Documentation generation
- Best practices advice

Current context: ${context}

Be helpful, accurate, and provide actionable advice. Use markdown formatting for code blocks.`
                },
                ...this.chatHistory.slice(-10).map(msg => ({ // Keep last 10 messages for context
                    role: msg.role,
                    content: msg.content
                }))
            ];

            // Get AI response
            const response = await this.aiProvider.chat(aiMessages);

            // Add AI response to history
            this.chatHistory.push({
                role: 'assistant',
                content: response.content,
                timestamp: new Date()
            });

            // Send response to webview
            this._view.webview.postMessage({
                type: 'assistantMessage',
                message: response.content,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Chat error:', error);
            this._view.webview.postMessage({
                type: 'error',
                message: `Sorry, I encountered an error: ${error}`
            });
        }
    }

    private getCurrentContext(): string {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return 'No active editor';
        }

        const document = editor.document;
        const selection = editor.selection;
        
        let context = `File: ${document.fileName}\nLanguage: ${document.languageId}\n`;
        
        if (!selection.isEmpty) {
            context += `Selected text:\n\`\`\`${document.languageId}\n${document.getText(selection)}\n\`\`\`\n`;
        } else {
            // Get some context around cursor
            const line = editor.selection.active.line;
            const startLine = Math.max(0, line - 5);
            const endLine = Math.min(document.lineCount - 1, line + 5);
            const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
            context += `Context around cursor:\n\`\`\`${document.languageId}\n${document.getText(range)}\n\`\`\`\n`;
        }

        return context;
    }

    private clearChat() {
        this.chatHistory = [];
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearChat' });
        }
    }

    private exportChat() {
        if (this.chatHistory.length === 0) {
            vscode.window.showInformationMessage('No chat history to export');
            return;
        }

        const chatExport = this.chatHistory.map(msg => 
            `**${msg.role.toUpperCase()}** (${msg.timestamp.toLocaleString()}):\n${msg.content}\n\n`
        ).join('');

        vscode.workspace.openTextDocument({
            content: `# Neon Agent Chat Export\n\n${chatExport}`,
            language: 'markdown'
        }).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Agent</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
            margin: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .header {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
            text-align: center;
        }

        .header h2 {
            margin: 0;
            color: var(--vscode-sideBarTitle-foreground);
        }

        .chat-container {
            flex: 1;
            overflow-y: auto;
            border: 1px solid var(--vscode-sideBar-border);
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
            background: var(--vscode-editor-background);
        }

        .message {
            margin-bottom: 15px;
            padding: 8px 12px;
            border-radius: 6px;
            position: relative;
        }

        .user-message {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            margin-left: 20px;
        }

        .assistant-message {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-sideBar-border);
            margin-right: 20px;
        }

        .message-header {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 5px;
            font-weight: bold;
        }

        .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .message-content code {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-textSeparator-foreground);
            border-radius: 3px;
            padding: 2px 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }

        .message-content pre {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-textSeparator-foreground);
            border-radius: 3px;
            padding: 10px;
            overflow-x: auto;
            margin: 10px 0;
        }

        .message-content pre code {
            background: none;
            border: none;
            padding: 0;
        }

        .input-container {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }

        .input-wrapper {
            flex: 1;
            position: relative;
        }

        textarea {
            width: 100%;
            min-height: 60px;
            max-height: 120px;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            resize: vertical;
        }

        textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        button {
            padding: 8px 16px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-size: var(--vscode-font-size);
            white-space: nowrap;
        }

        button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .action-buttons {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
        }

        .action-buttons button {
            font-size: 0.85em;
            padding: 4px 8px;
        }

        .thinking {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }

        .thinking-dots {
            display: inline-block;
        }

        .thinking-dots::after {
            content: '';
            animation: thinking 1.5s infinite;
        }

        @keyframes thinking {
            0%, 20% { content: '.'; }
            40% { content: '..'; }
            60%, 100% { content: '...'; }
        }

        .welcome-message {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            margin: 20px 0;
            font-style: italic;
        }

        .error-message {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>🤖 Neon Agent</h2>
        <p>AI-Powered Coding Assistant</p>
    </div>

    <div class="action-buttons">
        <button onclick="clearChat()">Clear Chat</button>
        <button onclick="exportChat()">Export Chat</button>
    </div>

    <div class="chat-container" id="chatContainer">
        <div class="welcome-message">
            👋 Hello! I'm Neon Agent, your AI coding assistant.<br>
            Ask me anything about your code, and I'll help you analyze, improve, and understand it better.
        </div>
    </div>

    <div class="input-container">
        <div class="input-wrapper">
            <textarea 
                id="messageInput" 
                placeholder="Ask me about your code, request explanations, bug fixes, refactoring suggestions..." 
                onkeydown="handleKeyDown(event)"
            ></textarea>
        </div>
        <button onclick="sendMessage()" id="sendButton">Send</button>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });

            messageInput.value = '';
            sendButton.disabled = true;
        }

        function clearChat() {
            vscode.postMessage({ type: 'clearChat' });
            chatContainer.innerHTML = '<div class="welcome-message">👋 Hello! I\\'m Neon Agent, your AI coding assistant.<br>Ask me anything about your code, and I\\'ll help you analyze, improve, and understand it better.</div>';
        }

        function exportChat() {
            vscode.postMessage({ type: 'exportChat' });
        }

        function handleKeyDown(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }

        function addMessage(role, content, timestamp) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}-message\`;
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';
            headerDiv.textContent = \`\${role === 'user' ? '👤 You' : '🤖 Neon Agent'} - \${new Date(timestamp).toLocaleTimeString()}\`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            // Simple markdown parsing for code blocks
            const formattedContent = content
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\*\\*([^\\*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*([^\\*]+)\\*/g, '<em>$1</em>');
            
            contentDiv.innerHTML = formattedContent;
            
            messageDiv.appendChild(headerDiv);
            messageDiv.appendChild(contentDiv);
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function showThinking() {
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'thinking';
            thinkingDiv.id = 'thinking';
            thinkingDiv.innerHTML = '<span>🤖 Neon Agent is thinking</span><span class="thinking-dots"></span>';
            chatContainer.appendChild(thinkingDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function removeThinking() {
            const thinkingDiv = document.getElementById('thinking');
            if (thinkingDiv) {
                thinkingDiv.remove();
            }
        }

        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            chatContainer.appendChild(errorDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'userMessage':
                    addMessage('user', message.message, message.timestamp);
                    break;
                    
                case 'assistantMessage':
                    removeThinking();
                    addMessage('assistant', message.message, message.timestamp);
                    sendButton.disabled = false;
                    break;
                    
                case 'thinking':
                    showThinking();
                    break;
                    
                case 'error':
                    removeThinking();
                    showError(message.message);
                    sendButton.disabled = false;
                    break;
                    
                case 'clearChat':
                    clearChat();
                    break;
            }
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Focus on input when webview loads
        messageInput.focus();
    </script>
</body>
</html>`;
    }

    public dispose() {
        // Clean up resources
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
