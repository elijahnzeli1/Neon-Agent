# 🚀 Quick Start Guide - Neon Agent

Welcome to **Neon Agent** - your AI-powered coding assistant for VS Code!

## 📁 Project Structure

```
Neon-Agent/
├── src/
│   ├── extension.js              # VS Code extension entry point
│   ├── server.js                 # Extension-integrated server
│   ├── standalone-server.js      # Standalone API server
│   ├── services/
│   │   ├── AIService.js          # AI integration (Google Gemini)
│   │   └── CodeAnalyzer.js       # Code analysis engine
│   └── providers/
│       ├── NeonAgentProvider.js  # Core extension features
│       └── ChatWebviewProvider.js # Chat interface
├── package.json                  # Extension manifest & dependencies
├── README.md                     # Detailed documentation
└── .env.example                  # Environment variables template
```

## 🛠 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key

**For VS Code Extension:**
- Open VS Code Settings
- Search for "Neon Agent"
- Set your Google AI API key

**For Standalone Server:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API key
NEON_AGENT_API_KEY=your_google_ai_api_key_here
```

### 3. Get Google AI API Key
1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Create an account/sign in
3. Generate an API key
4. Copy the key to your configuration

## 🚀 Running the Project

### Option 1: VS Code Extension (Development)
```bash
# Open in VS Code and press F5
# This will launch a new Extension Development Host window
```

### Option 2: Standalone Server
```bash
# Start the API server
npm start

# Or for development with auto-reload
npm run dev
```

## 🌐 API Endpoints (Standalone Server)

Once running on `http://localhost:3000`:

- **Health Check:** `GET /health`
- **Chat:** `POST /api/chat`
- **Code Analysis:** `POST /api/analyze`
- **Code Generation:** `POST /api/generate`
- **Code Completion:** `POST /api/complete`

### Example API Usage

```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain what JavaScript is"}'

# Test code analysis
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"code": "console.log(\"Hello World\");", "language": "javascript"}'
```

## 🎯 Extension Features

### Commands
- `Ctrl+Shift+N` (or `Cmd+Shift+N` on Mac) - Open Chat
- `Neon Agent: Activate` - Enable active monitoring
- `Neon Agent: Analyze Code` - Analyze selected code

### Context Menu Actions
- Right-click in editor → "Analyze with Neon Agent"
- Right-click in explorer → "Analyze with Neon Agent"

### Real-time Features
- Code quality analysis as you type
- AI-powered suggestions and completions
- Security vulnerability detection
- Performance optimization recommendations

## 🔧 Development Commands

```bash
# Lint code
npm run lint

# Start standalone server
npm start

# Development server with auto-reload
npm run dev

# Run extension in development mode
# (Press F5 in VS Code)
```

## 🧪 Testing the Setup

1. **Test Standalone Server:**
   ```bash
   npm start
   # Visit http://localhost:3000/health
   ```

2. **Test VS Code Extension:**
   - Open project in VS Code
   - Press F5 to launch Extension Development Host
   - Open a JavaScript file
   - Use `Ctrl+Shift+N` to open chat
   - Right-click for context actions

## 🌟 Key Features Implemented

✅ **AI-Powered Chat Interface**
- Interactive webview with chat history
- Context-aware responses based on current file/selection
- Export chat functionality

✅ **Smart Code Analysis**
- Real-time static analysis
- AI-powered insights and suggestions
- Multi-language support

✅ **Express.js Backend**
- RESTful API for all AI services
- WebSocket support for real-time communication
- Standalone server capability

✅ **VS Code Integration**
- Commands, keybindings, and context menus
- Configuration through VS Code settings
- Real-time diagnostics and code actions

## 🚨 Troubleshooting

### Common Issues

1. **"Cannot find module 'vscode'"**
   - Use the standalone server: `npm start`
   - For extension development, use F5 in VS Code

2. **"AI service not initialized"**
   - Set your API key in settings or .env file
   - Verify the API key is valid

3. **Port 3000 already in use**
   - Change port in .env: `PORT=3001`
   - Or kill existing process

### Getting Help

- Check the detailed README.md for full documentation
- View the VS Code output panel for extension logs
- Check terminal output for server logs

## 🎉 Next Steps

1. **Configure your API key** (most important!)
2. **Test the chat interface** - ask it questions about your code
3. **Try code analysis** - right-click on any file
4. **Explore the API** - integrate with other tools
5. **Customize settings** - adjust AI model, auto-suggestions, etc.

Happy coding with Neon Agent! 🤖✨
