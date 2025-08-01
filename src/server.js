const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const { AIService } = require('./services/AIService');
const { CodeAnalyzer } = require('./services/CodeAnalyzer');

class NeonAgentServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.wss = null;
        this.aiService = new AIService();
        this.codeAnalyzer = new CodeAnalyzer();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());

        // CORS configuration
        this.app.use(cors({
            origin: ['vscode-webview://*', 'http://localhost:*'],
            credentials: true
        }));

        // Logging
        this.app.use(morgan('combined'));

        // Body parsing
        this.app.use(bodyParser.json({ limit: '10mb' }));
        this.app.use(bodyParser.urlencoded({ extended: true }));

        // Static files (for webview assets)
        this.app.use('/assets', express.static('assets'));
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // AI Chat endpoint
        this.app.post('/api/chat', async (req, res) => {
            try {
                const { message, context, history } = req.body;

                if (!message) {
                    return res.status(400).json({ error: 'Message is required' });
                }

                const response = await this.aiService.chat(message, context, history);
                res.json({ response, timestamp: new Date().toISOString() });
            } catch (error) {
                console.error('Chat error:', error);
                res.status(500).json({ error: 'Failed to process chat message' });
            }
        });

        // Code analysis endpoint
        this.app.post('/api/analyze', async (req, res) => {
            try {
                const { code, language, filePath } = req.body;

                if (!code) {
                    return res.status(400).json({ error: 'Code is required' });
                }

                const analysis = await this.codeAnalyzer.analyze(code, language, filePath);
                res.json(analysis);
            } catch (error) {
                console.error('Analysis error:', error);
                res.status(500).json({ error: 'Failed to analyze code' });
            }
        });

        // Code generation endpoint
        this.app.post('/api/generate', async (req, res) => {
            try {
                const { prompt, language, context } = req.body;

                if (!prompt) {
                    return res.status(400).json({ error: 'Prompt is required' });
                }

                const code = await this.aiService.generateCode(prompt, language, context);
                res.json({ code, timestamp: new Date().toISOString() });
            } catch (error) {
                console.error('Generation error:', error);
                res.status(500).json({ error: 'Failed to generate code' });
            }
        });

        // Code completion endpoint
        this.app.post('/api/complete', async (req, res) => {
            try {
                const { code, position, language } = req.body;

                if (!code) {
                    return res.status(400).json({ error: 'Code is required' });
                }

                const completions = await this.aiService.getCompletions(code, position, language);
                res.json({ completions, timestamp: new Date().toISOString() });
            } catch (error) {
                console.error('Completion error:', error);
                res.status(500).json({ error: 'Failed to get completions' });
            }
        });

        // Error handling middleware
        this.app.use((error, req, res, _next) => {
            console.error('Server error:', error);
            res.status(500).json({
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not found',
                timestamp: new Date().toISOString()
            });
        });
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({ server: this.server });

        this.wss.on('connection', (ws) => {
            console.log('WebSocket client connected');

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);

                    switch (data.type) {
                    case 'chat': {
                        const response = await this.aiService.chat(data.message, data.context);
                        ws.send(JSON.stringify({
                            type: 'chat-response',
                            response,
                            id: data.id
                        }));
                        break;
                    }
                    case 'analyze': {
                        const analysis = await this.codeAnalyzer.analyze(data.code, data.language);
                        ws.send(JSON.stringify({
                            type: 'analysis-response',
                            analysis,
                            id: data.id
                        }));
                        break;
                    }
                    default:
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'Unknown message type',
                            id: data.id
                        }));
                    }
                } catch (error) {
                    console.error('WebSocket error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: error.message
                    }));
                }
            });

            ws.on('close', () => {
                console.log('WebSocket client disconnected');
            });
        });
    }

    start(port = 3000, context = null) {
        this.server = http.createServer(this.app);
        this.setupWebSocket();

        this.server.listen(port, () => {
            console.log(`Neon Agent server running on port ${port}`);
            if (context) {
                context.globalState.update('serverPort', port);
            }
        });

        this.server.on('error', (error) => {
            console.error('Server error:', error);
        });

        return this.server;
    }

    stop() {
        if (this.wss) {
            this.wss.close();
        }
        if (this.server) {
            this.server.close();
            console.log('Neon Agent server stopped');
        }
    }
}

const serverInstance = new NeonAgentServer();

module.exports = serverInstance;
