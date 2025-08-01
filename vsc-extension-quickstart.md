# Neon Agent - VS Code Extension Quickstart Guide

This guide will help you execute and test your Neon Agent AI Coding Assistant extension.

## 🚀 How to Execute the Extension

### Method 1: Development Mode (Recommended for Testing)

1. **Open VS Code in the project folder:**
   ```bash
   cd "c:\Users\ELITEBOOK 840 G3\Neon-Agent"
   code .
   ```

2. **Ensure TypeScript is compiled:**
   - Press `Ctrl+Shift+P` and run `Tasks: Run Task`
   - Select `npm: compile` or run in terminal:
   ```bash
   npm run compile
   ```

3. **Launch Extension Development Host:**
   - Press `F5` or `Ctrl+F5`
   - OR press `Ctrl+Shift+P` and run `Debug: Start Debugging`
   - This opens a new VS Code window titled `[Extension Development Host]`

   ```bash
   npm install -g vsce
   vsce package
   ```

4. **Test the extension in the new window:**
   - The extension is now active in the Development Host window
   - Try the commands and features listed below

### Method 2: Install as VSIX Package

1. **Package the extension:**
   ```bash
   npm install -g vsce
   vsce package
   ```

2. **Install the generated .vsix file:**
   - Press `Ctrl+Shift+P`
   - Run `Extensions: Install from VSIX...`
   - Select the generated `neon-agent-1.0.0.vsix` file

## 🎯 Available Features & Commands

Once the extension is running, you can access these features:

## 🎯 Available Features & Commands

Once the extension is running, you can access these features:

### 🤖 AI Chat Interface
- **Access:** Explorer panel → "AI Assistant" section
- **Command:** `Neon Agent: Open AI Chat`
- **Shortcut:** `Ctrl+Shift+P` → type "Neon Agent"

### 📝 Code Analysis Commands
1. **Explain Code** (`Ctrl+Alt+E`)
   - Select code → Right-click → "🤖 Neon Agent" → "Explain Code"
   - Or use Command Palette: `Neon Agent: Explain Code`

2. **Find Bugs** (`Ctrl+Alt+B`)
   - Select code → Right-click → "🤖 Neon Agent" → "Find Bugs"
   - Analyzes code for potential issues and security vulnerabilities

3. **Generate Tests** 
   - Select function/class → Command Palette → `Neon Agent: Generate Tests`
   - Creates comprehensive unit tests

### 🔧 Refactoring Tools
1. **Extract Function** (`Ctrl+Alt+F`)
   - Select code block → `Neon Agent: Extract Function`

2. **Extract Variable** (`Ctrl+Alt+V`)
   - Select expression → `Neon Agent: Extract Variable`

3. **Optimize Code** (`Ctrl+Alt+O`)
   - Improve performance and readability

4. **Modernize Code**
   - Convert to latest language features (async/await, etc.)

### 📚 Documentation Generation
1. **Generate Documentation** (`Ctrl+Alt+D`)
   - Auto-generate function/class documentation

2. **Add Comments**
   - Add meaningful inline comments to code

3. **Generate README**
   - Create comprehensive project documentation

### ⚡ Real-time Features
- **AI Code Completion:** Automatic intelligent suggestions as you type
- **Context-aware suggestions:** Based on surrounding code
- **Multi-language support:** Works with JavaScript, TypeScript, Python, and more

## ⚙️ Configuration Setup

Before using AI features, configure your API keys:

## ⚙️ Configuration Setup

Before using AI features, configure your API keys:

### 1. Open VS Code Settings
- Press `Ctrl+,` or `File → Preferences → Settings`
- Search for "Neon Agent"

### 2. Configure AI Providers
```json
{
  "neonAgent.ai.provider": "openai",
  "neonAgent.openai.apiKey": "your-openai-api-key-here",
  "neonAgent.anthropic.apiKey": "your-anthropic-api-key-here",
  "neonAgent.google.apiKey": "your-google-api-key-here",
  "neonAgent.completion.enabled": true,
  "neonAgent.completion.contextLines": 20
}
```

### 3. Available Providers
- **OpenAI:** GPT-4, GPT-3.5-turbo models
- **Anthropic:** Claude-3 models  
- **Google:** Gemini Pro
- **Local:** Ollama, llamafile (set baseUrl)

## 🔧 Troubleshooting

### Extension Not Loading
1. Check TypeScript compilation: `npm run compile`
2. Restart Extension Development Host: `Ctrl+R` in dev window
3. Check VS Code Developer Console: `Help → Toggle Developer Tools`

### API Errors
1. Verify API keys are correctly set in settings
2. Check internet connection
3. Ensure API provider quotas are not exceeded

### Commands Not Working
1. Ensure extension is activated (should see "Neon Agent" in status bar)
2. Try reloading the window: `Ctrl+Shift+P` → `Developer: Reload Window`
3. Check for TypeScript compilation errors in terminal

## Extension Settings

This extension contributes the following settings:

## Extension Settings

This extension contributes the following settings:

### Core Settings
* `neonAgent.ai.provider`: Choose AI provider (`openai`, `anthropic`, `google`, `local`)
* `neonAgent.completion.enabled`: Enable/disable real-time code completion
* `neonAgent.completion.contextLines`: Number of context lines for completion (default: 20)

### API Configuration
* `neonAgent.openai.apiKey`: OpenAI API key for GPT models
* `neonAgent.openai.model`: OpenAI model selection (`gpt-4`, `gpt-3.5-turbo`)
* `neonAgent.anthropic.apiKey`: Anthropic API key for Claude models
* `neonAgent.anthropic.model`: Claude model selection (`claude-3-opus`, `claude-3-sonnet`)
* `neonAgent.google.apiKey`: Google API key for Gemini models
* `neonAgent.google.model`: Gemini model selection (`gemini-pro`)

### Local Model Settings
* `neonAgent.local.baseUrl`: Base URL for local model server (default: `http://localhost:11434`)
* `neonAgent.local.model`: Local model name (default: `llama2`)

### Advanced Configuration
* `neonAgent.temperature`: Creativity level for AI responses (0.0-1.0)
* `neonAgent.maxTokens`: Maximum tokens in AI responses (default: 2048)

## 📱 Quick Test Steps

1. **Start the extension:** Press `F5` to launch Extension Development Host
2. **Open a code file:** Create or open any `.js`, `.ts`, `.py`, or other code file
3. **Test completion:** Start typing code and see AI suggestions appear
4. **Test commands:** Select some code, right-click, and try "🤖 Neon Agent" options
5. **Test chat:** Check Explorer panel for "AI Assistant" section

## Known Issues

## Known Issues

- **First-time Setup:** API keys must be configured before AI features work
- **Local Models:** Require Ollama or similar local AI server to be running
- **Rate Limits:** API providers may have usage quotas that can affect performance
- **Large Files:** Very large files (>10,000 lines) may have slower completion performance

## Release Notes

### 1.0.0 - Initial Release (August 2025)

**🎉 Core Features:**
- Real-time AI-powered code completion
- Multi-provider AI support (OpenAI, Anthropic, Google, Local)
- Intelligent code analysis and bug detection
- Advanced refactoring tools
- Automated documentation generation
- Interactive AI chat assistant

**🔧 Technical Features:**
- Context-aware completions with intelligent caching
- Debounced requests for optimal performance
- Comprehensive error handling and logging
- TypeScript-first development with full type safety
- Extensible architecture for future enhancements

**🚀 Getting Started:**
1. Press `F5` to launch Extension Development Host
2. Configure API keys in VS Code settings
3. Start coding with AI assistance!

---

## 🛠️ Development Workflow

### For Extension Developers

1. **Clone and Setup:**
   ```bash
   git clone https://github.com/elijahnzeli1/Neon-Agent.git
   cd Neon-Agent
   npm install
   ```

2. **Development Mode:**
   ```bash
   npm run compile
   # Press F5 to test
   ```

3. **Watch Mode:**
   ```bash
   npm run watch
   # Auto-compiles on file changes
   ```

4. **Packaging:**
   ```bash
   npm run package
   # Creates .vsix file for distribution
   ```

## Following extension guidelines

## Following extension guidelines

For the best extension development experience:

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
* [Extension API Documentation](https://code.visualstudio.com/api)
* [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📋 Quick Reference Commands

### Keyboard Shortcuts
- `F5` - Launch Extension Development Host
- `Ctrl+Alt+E` - Explain Code
- `Ctrl+Alt+B` - Find Bugs  
- `Ctrl+Alt+R` - Refactor Code
- `Ctrl+Alt+F` - Extract Function
- `Ctrl+Alt+V` - Extract Variable
- `Ctrl+Alt+D` - Generate Documentation
- `Ctrl+Alt+O` - Optimize Code

### Terminal Commands
```bash
npm run compile     # Compile TypeScript
npm run watch      # Watch mode compilation
npm run lint       # Run ESLint
npm run test       # Run tests
npm run package    # Create VSIX package
```

## 🔗 Useful Resources

## 🔗 Useful Resources

### VS Code Extension Development
* [VS Code API Documentation](https://code.visualstudio.com/api)
* [Extension Samples](https://github.com/microsoft/vscode-extension-samples)
* [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

### AI Development
* [OpenAI API Documentation](https://platform.openai.com/docs)
* [Anthropic Claude API](https://docs.anthropic.com/)
* [Google AI Studio](https://makersuite.google.com/)

### TypeScript & Development
* [TypeScript Handbook](https://www.typescriptlang.org/docs/)
* [ESLint Configuration](https://eslint.org/docs/user-guide/configuring/)
* [Node.js Documentation](https://nodejs.org/en/docs/)

## 🎉 Start Building with AI!

Your Neon Agent extension is ready to use. Press **F5** to launch the Extension Development Host and start experiencing AI-powered coding assistance!

For detailed feature documentation, see [README.md](README.md) and [SETUP.md](SETUP.md).

**Happy Coding! 🚀**
