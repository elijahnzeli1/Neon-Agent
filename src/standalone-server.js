const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const { AIService } = require('./services/AIService');
const { CodeAnalyzer } = require('./services/CodeAnalyzer');

class NeonAgentStandaloneServer {
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
        // Root route - Dashboard
        this.app.get('/', (req, res) => {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(this.getDashboardHTML());
        });

        // Simple test route
        this.app.get('/test', (req, res) => {
            const html = `<!DOCTYPE html>
<html>
<head>
    <title>Simple Test</title>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial; padding: 20px; background: lightblue;">
    <h1>✅ Server is Working!</h1>
    <p>If you can see this, the server is responding correctly.</p>
    <p>Current time: ${new Date().toISOString()}</p>
    <a href="/">Go to Dashboard</a>
</body>
</html>`;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        });

        // Debug route to check what's being sent
        this.app.get('/debug', (req, res) => {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.send('This is plain text. If you can see this, the server is working.');
        });

        // Health check - HTML version
        this.app.get('/health', (req, res) => {
            const acceptHeader = req.headers.accept;
            if (acceptHeader && acceptHeader.includes('application/json')) {
                res.json({ status: 'ok', timestamp: new Date().toISOString() });
            } else {
                res.send(this.getHealthHTML());
            }
        });

        // Health check - JSON API
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: '1.0.0'
            });
        });        // AI Chat endpoint
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

    getDashboardHTML() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Agent - AI Coding Assistant</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 3rem;
        }
        
        .header h1 {
            font-size: 3rem;
            margin-bottom: 0.5rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header .tagline {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .status-card {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stat-box {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 10px;
            text-align: center;
            border-left: 4px solid #667eea;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
        }
        
        .api-section {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .api-endpoint {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        
        .method {
            display: inline-block;
            padding: 0.3rem 0.6rem;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.8rem;
            margin-right: 0.5rem;
        }
        
        .method.get { background: #d4edda; color: #155724; }
        .method.post { background: #d1ecf1; color: #0c5460; }
        
        .endpoint-url {
            font-family: 'Courier New', monospace;
            color: #495057;
        }
        
        .test-area {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            margin: 0.5rem;
            transition: background 0.3s;
        }
        
        .btn:hover {
            background: #5a67d8;
        }
        
        .response-area {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 1rem;
            margin-top: 1rem;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            min-height: 100px;
            white-space: pre-wrap;
        }
        
        .status-online {
            color: #28a745;
            font-weight: bold;
        }
        
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Neon Agent</h1>
            <div class="tagline">AI-Powered Coding Assistant API Server</div>
        </div>
        
        <div class="status-card">
            <h2>🚀 Server Status</h2>
            <div class="status-grid">
                <div class="stat-box">
                    <div class="stat-value status-online">ONLINE</div>
                    <div class="stat-label">Server Status</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="uptime">-</div>
                    <div class="stat-label">Uptime</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="memory">-</div>
                    <div class="stat-label">Memory Usage</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">v1.0.0</div>
                    <div class="stat-label">Version</div>
                </div>
            </div>
        </div>
        
        <div class="api-section">
            <h2>📡 API Endpoints</h2>
            
            <div class="api-endpoint">
                <span class="method get">GET</span>
                <span class="endpoint-url">/api/health</span>
                <div style="margin-top: 0.5rem; color: #666;">Server health and status information</div>
            </div>
            
            <div class="api-endpoint">
                <span class="method post">POST</span>
                <span class="endpoint-url">/api/chat</span>
                <div style="margin-top: 0.5rem; color: #666;">AI chat interface for coding assistance</div>
            </div>
            
            <div class="api-endpoint">
                <span class="method post">POST</span>
                <span class="endpoint-url">/api/analyze</span>
                <div style="margin-top: 0.5rem; color: #666;">Code analysis and quality assessment</div>
            </div>
            
            <div class="api-endpoint">
                <span class="method post">POST</span>
                <span class="endpoint-url">/api/generate</span>
                <div style="margin-top: 0.5rem; color: #666;">AI-powered code generation</div>
            </div>
            
            <div class="api-endpoint">
                <span class="method post">POST</span>
                <span class="endpoint-url">/api/complete</span>
                <div style="margin-top: 0.5rem; color: #666;">Intelligent code completion suggestions</div>
            </div>
        </div>
        
        <div class="test-area">
            <h2>🧪 Test API</h2>
            <p>Click the buttons below to test the API endpoints:</p>
            
            <button class="btn" onclick="testHealth()">Test Health</button>
            <button class="btn" onclick="testChat()">Test Chat</button>
            <button class="btn" onclick="testAnalyze()">Test Code Analysis</button>
            
            <div class="response-area" id="response">
Click a button above to test the API endpoints...
            </div>
        </div>
    </div>
    
    <script>
        // Update server stats
        async function updateStats() {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                
                if (data.uptime) {
                    document.getElementById('uptime').textContent = 
                        Math.round(data.uptime / 60) + 'm';
                }
                
                if (data.memory) {
                    const memMB = Math.round(data.memory.heapUsed / 1024 / 1024);
                    document.getElementById('memory').textContent = memMB + 'MB';
                }
            } catch (error) {
                console.error('Failed to update stats:', error);
            }
        }
        
        // Test functions
        async function testHealth() {
            setLoading(true);
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                showResponse('Health Check Result:', JSON.stringify(data, null, 2));
            } catch (error) {
                showResponse('Error:', error.message);
            }
            setLoading(false);
        }
        
        async function testChat() {
            setLoading(true);
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: 'Hello! Can you help me with JavaScript?'
                    })
                });
                const data = await response.json();
                showResponse('Chat Test Result:', JSON.stringify(data, null, 2));
            } catch (error) {
                showResponse('Error:', error.message);
            }
            setLoading(false);
        }
        
        async function testAnalyze() {
            setLoading(true);
            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: 'console.log("Hello, World!");',
                        language: 'javascript'
                    })
                });
                const data = await response.json();
                showResponse('Code Analysis Result:', JSON.stringify(data, null, 2));
            } catch (error) {
                showResponse('Error:', error.message);
            }
            setLoading(false);
        }
        
        function showResponse(title, content) {
            document.getElementById('response').textContent = title + '\\n\\n' + content;
        }
        
        function setLoading(loading) {
            const container = document.querySelector('.test-area');
            if (loading) {
                container.classList.add('loading');
                showResponse('Loading...', 'Please wait...');
            } else {
                container.classList.remove('loading');
            }
        }
        
        // Update stats every 5 seconds
        updateStats();
        setInterval(updateStats, 5000);
    </script>
</body>
</html>`;
    }

    getHealthHTML() {
        const uptime = Math.round(process.uptime());
        const memory = process.memoryUsage();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Agent - Health Check</title>
    <style>
        body {
            font-family: 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }
        .health-card {
            background: white;
            color: #333;
            padding: 3rem;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            min-width: 400px;
        }
        .status {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .status.healthy { color: #28a745; }
        .details {
            margin-top: 2rem;
            text-align: left;
        }
        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        .back-link {
            margin-top: 2rem;
        }
        .back-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: bold;
        }
        .back-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="health-card">
        <div class="status healthy">✅ HEALTHY</div>
        <h1>Neon Agent Server</h1>
        <p>All systems operational</p>
        
        <div class="details">
            <div class="detail-item">
                <span>Status:</span>
                <span style="color: #28a745; font-weight: bold;">OK</span>
            </div>
            <div class="detail-item">
                <span>Uptime:</span>
                <span>${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s</span>
            </div>
            <div class="detail-item">
                <span>Memory:</span>
                <span>${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB</span>
            </div>
            <div class="detail-item">
                <span>Timestamp:</span>
                <span>${new Date().toISOString()}</span>
            </div>
        </div>
        
        <div class="back-link">
            <a href="/">← Back to Dashboard</a>
        </div>
    </div>
</body>
</html>`;
    }

    start(port = 3000) {
        this.server = http.createServer(this.app);
        this.setupWebSocket();

        this.server.listen(port, () => {
            console.log(`Neon Agent standalone server running on port ${port}`);
            console.log(`Health check: http://localhost:${port}/health`);
            console.log(`API endpoints available at: http://localhost:${port}/api/`);
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
            console.log('Neon Agent standalone server stopped');
        }
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const port = process.env.PORT || 3000;
    const server = new NeonAgentStandaloneServer();
    server.start(port);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down server...');
        server.stop();
        process.exit(0);
    });
}

module.exports = NeonAgentStandaloneServer;
