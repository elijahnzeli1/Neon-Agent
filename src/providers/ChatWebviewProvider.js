const vscode = require('vscode');

class ChatWebviewProvider {
    constructor(context, aiService) {
        this.context = context;
        this.aiService = aiService;
        this.webviewView = null;
        this.chatHistory = [];
    }

    resolveWebviewView(webviewView, _context, _token) {
        this.webviewView = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getWebviewContent();

        webviewView.webview.onDidReceiveMessage(async (message) => {
            await this.handleMessage(message);
        });
    }

    async handleMessage(message) {
        switch (message.type) {
        case 'chat':
            await this.handleChatMessage(message.text);
            break;
        case 'clear':
            this.clearChat();
            break;
        case 'export':
            await this.exportChat();
            break;
        case 'ready':
            // Webview is ready, send initial data if needed
            this.sendMessage({
                type: 'initialize',
                history: this.chatHistory
            });
            break;
        }
    }

    async handleChatMessage(text) {
        if (!text.trim()) return;

        // Add user message to history
        const userMessage = { role: 'user', content: text, timestamp: new Date() };
        this.chatHistory.push(userMessage);

        // Send user message to webview
        this.sendMessage({
            type: 'message',
            message: userMessage
        });

        try {
            // Get context from active editor
            const activeEditor = vscode.window.activeTextEditor;
            let context = '';

            if (activeEditor) {
                const selection = activeEditor.selection;
                if (!selection.isEmpty) {
                    context = `Selected code (${activeEditor.document.languageId}):\n`;
                    context += activeEditor.document.getText(selection);
                } else {
                    context = `Current file: ${activeEditor.document.fileName} (${activeEditor.document.languageId})`;
                }
            }

            // Get AI response
            const response = await this.aiService.chat(
                text,
                context,
                this.chatHistory.slice(-10) // Last 10 messages for context
            );

            // Add assistant message to history
            const assistantMessage = {
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            this.chatHistory.push(assistantMessage);

            // Send assistant message to webview
            this.sendMessage({
                type: 'message',
                message: assistantMessage
            });

        } catch (error) {
            console.error('Chat error:', error);

            const errorMessage = {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`,
                timestamp: new Date(),
                error: true
            };

            this.chatHistory.push(errorMessage);
            this.sendMessage({
                type: 'message',
                message: errorMessage
            });
        }
    }

    clearChat() {
        this.chatHistory = [];
        this.sendMessage({ type: 'clear' });
    }

    async exportChat() {
        if (this.chatHistory.length === 0) {
            vscode.window.showInformationMessage('No chat history to export');
            return;
        }

        try {
            const chatText = this.chatHistory.map(msg => {
                const timestamp = msg.timestamp.toLocaleString();
                const role = msg.role === 'user' ? 'You' : 'Neon Agent';
                return `[${timestamp}] ${role}: ${msg.content}`;
            }).join('\n\n');

            const document = await vscode.workspace.openTextDocument({
                content: chatText,
                language: 'markdown'
            });

            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export chat: ${error.message}`);
        }
    }

    sendMessage(message) {
        if (this.webviewView) {
            this.webviewView.webview.postMessage(message);
        }
    }

    show() {
        if (this.webviewView) {
            this.webviewView.show();
        }
    }

    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Agent Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .title {
            font-weight: bold;
            color: var(--vscode-panelTitle-activeForeground);
        }

        .controls {
            display: flex;
            gap: 5px;
        }

        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 11px;
        }

        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .btn.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .chat-container {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            padding: 5px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            background: var(--vscode-editor-background);
        }

        .message {
            margin-bottom: 15px;
            padding: 8px;
            border-radius: 5px;
            line-height: 1.4;
        }

        .message.user {
            background: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
        }

        .message.assistant {
            background: var(--vscode-editor-selectionBackground);
            border-left: 3px solid var(--vscode-textPreformat-foreground);
        }

        .message.error {
            background: var(--vscode-inputValidation-errorBackground);
            border-left: 3px solid var(--vscode-inputValidation-errorBorder);
        }

        .message-header {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 12px;
            opacity: 0.8;
        }

        .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .message-content code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
        }

        .message-content pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
            margin: 5px 0;
        }

        .input-container {
            display: flex;
            gap: 5px;
        }

        .input-field {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            border-radius: 2px;
            resize: none;
            font-family: inherit;
            font-size: inherit;
        }

        .input-field:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .send-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            border-radius: 2px;
            cursor: pointer;
            white-space: nowrap;
        }

        .send-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state h3 {
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }

        .typing-indicator {
            display: none;
            padding: 8px;
            font-style: italic;
            color: var(--vscode-descriptionForeground);
        }

        .typing-indicator.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">🤖 Neon Agent</div>
        <div class="controls">
            <button class="btn secondary" onclick="exportChat()">Export</button>
            <button class="btn secondary" onclick="clearChat()">Clear</button>
        </div>
    </div>

    <div class="chat-container" id="chatContainer">
        <div class="empty-state" id="emptyState">
            <h3>Welcome to Neon Agent!</h3>
            <p>Start a conversation by typing a message below.</p>
            <p>I can help you with:</p>
            <ul style="text-align: left; display: inline-block;">
                <li>Code analysis and suggestions</li>
                <li>Debugging assistance</li>
                <li>Code generation</li>
                <li>Best practices guidance</li>
                <li>Technical questions</li>
            </ul>
        </div>
        <div id="messages"></div>
        <div class="typing-indicator" id="typingIndicator">Neon Agent is thinking...</div>
    </div>

    <div class="input-container">
        <textarea 
            class="input-field" 
            id="messageInput" 
            placeholder="Ask Neon Agent anything..."
            rows="1"
        ></textarea>
        <button class="send-btn" id="sendBtn" onclick="sendMessage()">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let chatHistory = [];
        let isWaitingForResponse = false;

        // DOM elements
        const chatContainer = document.getElementById('chatContainer');
        const messagesContainer = document.getElementById('messages');
        const emptyState = document.getElementById('emptyState');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const typingIndicator = document.getElementById('typingIndicator');

        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Send message on Enter (Shift+Enter for new line)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'initialize':
                    chatHistory = message.history || [];
                    renderMessages();
                    break;
                case 'message':
                    addMessage(message.message);
                    break;
                case 'clear':
                    clearMessages();
                    break;
            }
        });

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || isWaitingForResponse) return;

            vscode.postMessage({
                type: 'chat',
                text: text
            });

            messageInput.value = '';
            messageInput.style.height = 'auto';
            isWaitingForResponse = true;
            updateSendButton();
            showTypingIndicator();
        }

        function addMessage(message) {
            chatHistory.push(message);
            renderMessage(message);
            hideEmptyState();
            scrollToBottom();
            
            if (message.role === 'assistant') {
                isWaitingForResponse = false;
                updateSendButton();
                hideTypingIndicator();
            }
        }

        function renderMessages() {
            messagesContainer.innerHTML = '';
            chatHistory.forEach(message => renderMessage(message));
            
            if (chatHistory.length > 0) {
                hideEmptyState();
            }
            
            scrollToBottom();
        }

        function renderMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${message.role}\${message.error ? ' error' : ''}\`;
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';
            headerDiv.textContent = \`\${message.role === 'user' ? 'You' : 'Neon Agent'} • \${formatTime(message.timestamp)}\`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = formatMessageContent(message.content);
            
            messageDiv.appendChild(headerDiv);
            messageDiv.appendChild(contentDiv);
            messagesContainer.appendChild(messageDiv);
        }

        function formatMessageContent(content) {
            // Simple markdown-like formatting
            return content
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
        }

        function formatTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        function clearMessages() {
            chatHistory = [];
            messagesContainer.innerHTML = '';
            showEmptyState();
        }

        function clearChat() {
            vscode.postMessage({ type: 'clear' });
        }

        function exportChat() {
            vscode.postMessage({ type: 'export' });
        }

        function hideEmptyState() {
            emptyState.style.display = 'none';
        }

        function showEmptyState() {
            emptyState.style.display = 'flex';
        }

        function showTypingIndicator() {
            typingIndicator.classList.add('show');
            scrollToBottom();
        }

        function hideTypingIndicator() {
            typingIndicator.classList.remove('show');
        }

        function updateSendButton() {
            sendBtn.disabled = isWaitingForResponse;
            sendBtn.textContent = isWaitingForResponse ? 'Sending...' : 'Send';
        }

        function scrollToBottom() {
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 10);
        }

        // Initialize
        vscode.postMessage({ type: 'ready' });
    </script>
</body>
</html>`;
    }
}

module.exports = { ChatWebviewProvider };
