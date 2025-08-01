# Neon Agent - AI Coding Assistant

![Neon Agent Logo](https://img.shields.io/badge/AI-Powered-blue?style=for-the-badge)
![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-brightgreen?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**Neon Agent** is an advanced AI-powered coding assistant that revolutionizes your development workflow with intelligent code completion, automated refactoring, comprehensive analysis, and seamless documentation generation.

## 🚀 Key Features

### 🧠 AI-Powered Code Completion
- **Real-time suggestions** with context awareness
- **Multiple AI providers** support (OpenAI, Anthropic Claude, Google Gemini, Local models)
- **Debounced completions** for optimal performance
- **Intelligent caching** to reduce API calls

### 🔧 Intelligent Refactoring
- **Extract functions** and variables automatically
- **Optimize code** for better performance and readability
- **Convert to async/await** patterns
- **Modernize code** with latest language features
- **Add comprehensive error handling**

### 🔍 Code Analysis & Bug Detection
- **Explain complex code** with AI-powered insights
- **Find bugs and security vulnerabilities**
- **Generate comprehensive unit tests**
- **Calculate complexity metrics**
- **Provide improvement suggestions**

### 📚 Documentation Generation
- **Auto-generate documentation** for functions and classes
- **Add meaningful comments** to code
- **Create README files** for projects
- **Generate API documentation**
- **Export chat conversations**

### 💬 Interactive AI Chat
- **Built-in chat interface** within VS Code
- **Context-aware conversations** about your code
- **Export chat history** for later reference
- **Multiple AI model support**

## 🛠️ Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Neon Agent"
4. Click Install

### From Source
1. Clone the repository:
   ```bash
   git clone https://github.com/elijahnzeli1/Neon-Agent.git
   cd Neon-Agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

4. Package the extension:
   ```bash
   npm run package
   ```

5. Install the generated `.vsix` file in VS Code

## ⚙️ Configuration

### API Key Setup

Set up your AI provider API key in one of these ways:

#### Method 1: VS Code Settings
1. Open VS Code Settings (`Ctrl+,`)
2. Search for "Neon Agent"
3. Enter your API key for your chosen provider

#### Method 2: Environment Variable
```bash
export NEON_AGENT_API_KEY="your-api-key-here"
```

#### Method 3: Command Palette
1. Press `Ctrl+Shift+P`
2. Type "Neon Agent: Configure AI Provider"
3. Select your provider and enter the API key

### Configuration Options

```json
{
  "neonAgent.ai.provider": "openai",           // AI provider: openai, anthropic, google, local
  "neonAgent.ai.model": "gpt-4",               // AI model to use
  "neonAgent.ai.temperature": 0.7,             // Response creativity (0-2)
  "neonAgent.ai.maxTokens": 2048,              // Maximum response length
  "neonAgent.completion.enabled": true,        // Enable code completion
  "neonAgent.completion.contextLines": 20,     // Context lines for completion
  "neonAgent.completion.debounceMs": 300       // Debounce delay in ms
}
```

## 🎯 Usage

### Code Completion
Simply start typing in any supported language file. Neon Agent will provide intelligent suggestions based on your code context.

### Code Analysis
1. **Explain Code**: Select code and press `Ctrl+Shift+E` or right-click → "🤖 Neon Agent" → "Explain Code"
2. **Find Bugs**: Right-click in editor → "🤖 Neon Agent" → "Find Bugs"
3. **Generate Tests**: Select code → "🤖 Neon Agent" → "Generate Tests"

### Refactoring
1. **Extract Function**: Select code and press `Ctrl+Shift+F` or use context menu
2. **Extract Variable**: Select expression → "🤖 Neon Agent" → "Extract Variable"
3. **Optimize Code**: "🤖 Neon Agent" → "Optimize Code"

### Documentation
1. **Generate Docs**: "🤖 Neon Agent" → "Generate Documentation"
2. **Add Comments**: "🤖 Neon Agent" → "Add Comments"
3. **Generate README**: Command Palette → "Neon Agent: Generate README"

### AI Chat
1. Press `Ctrl+Shift+A` to open the AI chat
2. Ask questions about your code
3. Get contextual help and suggestions

## 🔧 Supported AI Providers

### OpenAI
- **Models**: GPT-4, GPT-3.5-turbo, GPT-4-turbo
- **API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)

### Anthropic Claude
- **Models**: Claude-3 Opus, Claude-3 Sonnet, Claude-3 Haiku
- **API Key**: Get from [Anthropic Console](https://console.anthropic.com/)

### Google Gemini
- **Models**: Gemini Pro, Gemini Pro Vision
- **API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Local Models
- **Ollama**: Run models locally with Ollama
- **llamafile**: Use llamafile for local inference
- **Custom APIs**: Connect to any OpenAI-compatible API

## 📋 Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Open AI Chat | `Ctrl+Shift+A` | Open the interactive AI chat panel |
| Explain Code | `Ctrl+Shift+E` | Get AI explanation of selected code |
| Extract Function | `Ctrl+Shift+F` | Extract selected code into a function |
| Find Bugs | - | Analyze code for potential issues |
| Generate Tests | - | Create unit tests for selected code |
| Optimize Code | - | Improve code performance and readability |
| Generate Documentation | - | Create comprehensive documentation |
| Add Comments | - | Add meaningful comments to code |
| Generate README | - | Create a README file for the project |

## 🔌 Extension Development

### Prerequisites
- Node.js 16+
- TypeScript 4.9+
- VS Code 1.74+

### Development Setup
1. Clone and install:
   ```bash
   git clone https://github.com/elijahnzeli1/Neon-Agent.git
   cd Neon-Agent
   npm install
   ```

2. Open in VS Code:
   ```bash
   code .
   ```

3. Press `F5` to run the extension in a new Extension Development Host

### Build Commands
```bash
npm run compile          # Compile TypeScript
npm run watch           # Watch for changes
npm run lint            # Run ESLint
npm run test            # Run tests
npm run package         # Package extension
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Guidelines
1. **TypeScript**: Use TypeScript for all new code
2. **ESLint**: Follow the established linting rules
3. **Testing**: Add tests for new features
4. **Documentation**: Update docs for any changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **GitHub**: [https://github.com/elijahnzeli1/Neon-Agent](https://github.com/elijahnzeli1/Neon-Agent)
- **VS Code Marketplace**: [Coming Soon]
- **Issues**: [https://github.com/elijahnzeli1/Neon-Agent/issues](https://github.com/elijahnzeli1/Neon-Agent/issues)
- **Documentation**: [https://github.com/elijahnzeli1/Neon-Agent/wiki](https://github.com/elijahnzeli1/Neon-Agent/wiki)

## 🙏 Acknowledgments

- VS Code Extension API team for excellent documentation
- OpenAI, Anthropic, and Google for powerful AI models
- The open-source community for inspiration and feedback

---

**Made with ❤️ by the Neon Agent team**

*Transform your coding experience with AI-powered assistance*

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
