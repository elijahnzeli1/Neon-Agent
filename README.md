# Neon Agent - AI-Powered VS Code Extension

Neon Agent is an intelligent coding assistant that brings AI-powered features directly into your VS Code editor. Inspired by modern AI coding tools, it provides real-time code analysis, intelligent suggestions, and interactive chat capabilities.

## Features

### 🤖 Interactive AI Chat
- Built-in chat interface for coding assistance
- Context-aware responses based on your current file/selection
- Export chat history for reference
- Real-time conversation with AI

### 🔍 Smart Code Analysis
- Real-time code quality analysis
- Performance optimization suggestions
- Security vulnerability detection
- Best practices recommendations

### ⚡ Intelligent Code Completion
- AI-powered code suggestions
- Context-aware completions
- Multi-language support

### 🛠 Code Actions & Refactoring
- Quick fixes for common issues
- AI-powered refactoring suggestions
- Code explanation and documentation

### 🌐 Express.js Backend
- RESTful API for AI services
- WebSocket support for real-time communication
- Modular Express.js architecture

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your AI API key in VS Code settings
4. Press `F5` to run the extension in development mode

## Configuration

Open VS Code settings and configure Neon Agent:

- `neon-agent.apiKey`: Your Google AI API key
- `neon-agent.model`: AI model to use (default: gemini-pro)
- `neon-agent.autoSuggest`: Enable automatic code suggestions

## Usage

### Getting Started
1. Install the extension
2. Set your API key in settings
3. Use `Ctrl+Shift+N` (or `Cmd+Shift+N` on Mac) to open the chat
4. Start coding and get real-time suggestions!

### Commands
- `Neon Agent: Activate` - Enable active monitoring
- `Neon Agent: Open Chat` - Open the chat interface
- `Neon Agent: Analyze Code` - Analyze selected code or file

### Context Menu Actions
- Right-click in editor or explorer to access Neon Agent features
- Analyze files, explain code, or get refactoring suggestions

## Architecture

### Extension Structure
```
src/
├── extension.js              # Main extension entry point
├── server.js                 # Express.js server
├── services/
│   ├── AIService.js          # AI integration service
│   └── CodeAnalyzer.js       # Code analysis engine
└── providers/
    ├── NeonAgentProvider.js  # Core extension provider
    └── ChatWebviewProvider.js # Chat interface provider
```

### Express.js API Endpoints
- `POST /api/chat` - AI chat interface
- `POST /api/analyze` - Code analysis
- `POST /api/generate` - Code generation
- `POST /api/complete` - Code completion
- WebSocket support for real-time communication

## Development

### Running in Development
1. Open the project in VS Code
2. Press `F5` to launch extension development host
3. Test features in the new VS Code window

### Building
```bash
npm run compile
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

## API Integration

Currently supports Google's Generative AI (Gemini). To use:

1. Get an API key from [Google AI Studio](https://makersuite.google.com/)
2. Add the key to your VS Code settings
3. Start using Neon Agent!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Roadmap

- [ ] Multi-model AI support (OpenAI, Anthropic, etc.)
- [ ] Custom code templates and snippets
- [ ] Team collaboration features
- [ ] Plugin marketplace integration
- [ ] Advanced debugging assistance
- [ ] Code review automation

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- Create an issue for bug reports or feature requests
- Join our community discussions
- Check the documentation for detailed guides

---

**Neon Agent** - Empowering developers with AI-driven coding assistance.
