# Neon Agent - Setup Guide

This comprehensive guide will walk you through setting up Neon Agent, from installation to advanced configuration.

## 📋 Prerequisites

Before installing Neon Agent, ensure you have:

- **Visual Studio Code** 1.74.0 or higher
- **Node.js** 16.x or higher (for development)
- **TypeScript** 4.9+ (for development)
- An **AI API key** from one of the supported providers

## 🚀 Quick Start

### 1. Installation

#### Option A: From VS Code Marketplace (Recommended)
1. Open Visual Studio Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) to open Extensions
3. Search for "Neon Agent"
4. Click "Install" on the Neon Agent extension
5. Reload VS Code when prompted

#### Option B: From VSIX File
1. Download the latest `.vsix` file from [releases](https://github.com/elijahnzeli1/Neon-Agent/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
4. Select the downloaded `.vsix` file
5. Reload VS Code

### 2. First-Time Configuration

After installation, you'll need to configure an AI provider:

1. Press `Ctrl+Shift+P` to open Command Palette
2. Type "Neon Agent: Configure AI Provider"
3. Select your preferred AI provider
4. Enter your API key when prompted

## 🔑 AI Provider Setup

### OpenAI Setup
1. **Get API Key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Create Account**: Sign up or log in to your OpenAI account
3. **Generate Key**: Click "Create new secret key"
4. **Copy Key**: Save the key (starts with `sk-`)
5. **Configure**: Use the Command Palette or Settings to add the key

**Recommended Models**:
- `gpt-4` - Best quality, higher cost
- `gpt-3.5-turbo` - Good balance of quality and cost
- `gpt-4-turbo` - Latest model with improved performance

### Anthropic Claude Setup
1. **Get API Key**: Visit [Anthropic Console](https://console.anthropic.com/)
2. **Create Account**: Sign up for an Anthropic account
3. **Generate Key**: Create a new API key
4. **Copy Key**: Save the key (starts with `sk-ant-`)
5. **Configure**: Add to Neon Agent settings

**Recommended Models**:
- `claude-3-opus-20240229` - Highest capability
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fast and efficient

### Google Gemini Setup
1. **Get API Key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Create Account**: Sign in with your Google account
3. **Generate Key**: Create a new API key
4. **Copy Key**: Save the generated key
5. **Configure**: Add to Neon Agent settings

**Available Models**:
- `gemini-pro` - Text generation
- `gemini-pro-vision` - Text and image understanding

### Local Models Setup

#### Using Ollama
1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai/)
2. **Start Ollama**: Run `ollama serve` in terminal
3. **Pull Model**: `ollama pull llama2` (or your preferred model)
4. **Configure Neon Agent**:
   - Provider: `local`
   - Base URL: `http://localhost:11434`
   - Model: `llama2`

#### Using llamafile
1. **Download**: Get a llamafile from [Mozilla llamafile](https://github.com/Mozilla-Ocho/llamafile)
2. **Run**: Execute the llamafile (it starts a local server)
3. **Configure Neon Agent**:
   - Provider: `local`
   - Base URL: `http://localhost:8080` (or the port llamafile uses)
   - Model: Based on your llamafile

## ⚙️ Configuration Options

### Basic Settings

Open VS Code Settings (`Ctrl+,`) and search for "Neon Agent":

```json
{
  // AI Provider Configuration
  "neonAgent.ai.provider": "openai",
  "neonAgent.ai.apiKey": "your-api-key-here",
  "neonAgent.ai.model": "gpt-4",
  
  // Response Configuration
  "neonAgent.ai.temperature": 0.7,
  "neonAgent.ai.maxTokens": 2048,
  
  // Code Completion
  "neonAgent.completion.enabled": true,
  "neonAgent.completion.contextLines": 20,
  "neonAgent.completion.debounceMs": 300
}
```

### Advanced Configuration

#### Environment Variables
Create a `.env` file in your workspace or set system environment variables:

```bash
# Primary API key (fallback if not set in settings)
NEON_AGENT_API_KEY=your-api-key-here

# Optional: Override specific providers
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-key

# Custom base URLs
NEON_AGENT_BASE_URL=http://localhost:11434
```

#### Workspace-Specific Settings
Create `.vscode/settings.json` in your project:

```json
{
  "neonAgent.ai.provider": "anthropic",
  "neonAgent.ai.model": "claude-3-sonnet-20240229",
  "neonAgent.completion.contextLines": 30,
  "neonAgent.ai.temperature": 0.5
}
```

#### User vs Workspace Settings
- **User Settings**: Apply globally to all VS Code instances
- **Workspace Settings**: Apply only to the current project
- **Environment Variables**: Override both user and workspace settings

## 🎯 Feature Configuration

### Code Completion
Fine-tune the completion behavior:

```json
{
  "neonAgent.completion.enabled": true,          // Enable/disable completions
  "neonAgent.completion.contextLines": 20,       // Context window size
  "neonAgent.completion.debounceMs": 300,        // Delay before request
  "neonAgent.completion.maxSuggestions": 3,      // Number of suggestions
  "neonAgent.completion.minLineLength": 10       // Minimum line length to trigger
}
```

### AI Model Selection
Choose models based on your needs:

| Use Case | Recommended Model | Provider |
|----------|------------------|-----------|
| Code completion | `gpt-3.5-turbo` | OpenAI |
| Code analysis | `gpt-4` | OpenAI |
| Documentation | `claude-3-sonnet` | Anthropic |
| Quick questions | `gemini-pro` | Google |
| Local/Offline | `llama2` | Ollama |

### Performance Tuning

#### Reduce API Costs
```json
{
  "neonAgent.ai.provider": "google",          // Google Gemini is cost-effective
  "neonAgent.ai.model": "gemini-pro",
  "neonAgent.ai.maxTokens": 1024,            // Reduce token limit
  "neonAgent.completion.debounceMs": 500      // Increase debounce
}
```

#### Maximize Quality
```json
{
  "neonAgent.ai.provider": "openai",
  "neonAgent.ai.model": "gpt-4",
  "neonAgent.ai.temperature": 0.3,           // More deterministic
  "neonAgent.ai.maxTokens": 4096,            // Larger responses
  "neonAgent.completion.contextLines": 50    // More context
}
```

#### Optimize for Speed
```json
{
  "neonAgent.ai.provider": "openai",
  "neonAgent.ai.model": "gpt-3.5-turbo",
  "neonAgent.completion.debounceMs": 200,    // Faster triggering
  "neonAgent.completion.contextLines": 10    // Less context
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. API Key Not Working
**Symptoms**: Error messages about invalid API keys

**Solutions**:
- Verify the API key is correct and properly formatted
- Check if the key has sufficient credits/quota
- Ensure the key is for the right provider
- Try regenerating the API key

#### 2. No Code Completions
**Symptoms**: Completions not appearing while typing

**Solutions**:
- Check if `neonAgent.completion.enabled` is `true`
- Verify your API key is configured
- Increase `neonAgent.completion.debounceMs` if requests are too frequent
- Check the VS Code Output panel for error messages

#### 3. Slow Performance
**Symptoms**: Long delays in responses

**Solutions**:
- Use a faster model (e.g., `gpt-3.5-turbo` instead of `gpt-4`)
- Reduce `neonAgent.completion.contextLines`
- Increase `neonAgent.completion.debounceMs`
- Consider using a local model

#### 4. Chat Not Responding
**Symptoms**: AI chat window shows errors

**Solutions**:
- Check your internet connection
- Verify API key permissions
- Check if the AI service is experiencing outages
- Try switching to a different AI provider

#### 5. Extension Not Loading
**Symptoms**: Neon Agent commands not appearing

**Solutions**:
- Reload VS Code (`Ctrl+Shift+P` → "Developer: Reload Window")
- Check if the extension is enabled in Extensions panel
- Update VS Code to the latest version
- Reinstall the extension

### Debug Mode

Enable debug logging to troubleshoot issues:

1. Open VS Code Settings
2. Search for "neonAgent.debug.enabled"
3. Set to `true`
4. Check the "Neon Agent" output channel for detailed logs

### Performance Monitoring

Monitor API usage and performance:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Neon Agent: Show Statistics"
3. Review token usage, response times, and error rates

## 🔄 Updating

### Automatic Updates
If installed from the marketplace, VS Code will automatically update the extension.

### Manual Updates
1. Download the latest release
2. Uninstall the current version
3. Install the new version
4. Reload VS Code

### Migration
When updating from older versions:

1. **Backup Settings**: Export your current settings
2. **Update Extension**: Install the new version
3. **Migrate Config**: Update configuration keys if needed
4. **Test Features**: Verify all features work correctly

## 📞 Support

If you encounter issues not covered in this guide:

1. **Check Issues**: Search [GitHub Issues](https://github.com/elijahnzeli1/Neon-Agent/issues)
2. **Read Docs**: Visit the [documentation](https://github.com/elijahnzeli1/Neon-Agent/wiki)
3. **Create Issue**: Report bugs or request features
4. **Community**: Join discussions in the repository

## 🎓 Advanced Usage

### Custom Prompts
You can customize AI prompts by modifying settings (advanced users):

```json
{
  "neonAgent.prompts.codeExplanation": "Explain this code in detail, focusing on...",
  "neonAgent.prompts.bugAnalysis": "Analyze this code for potential bugs...",
  "neonAgent.prompts.refactoring": "Suggest refactoring improvements..."
}
```

### Multiple AI Providers
Configure different providers for different tasks:

```json
{
  "neonAgent.providers": {
    "completion": {
      "provider": "openai",
      "model": "gpt-3.5-turbo"
    },
    "analysis": {
      "provider": "anthropic", 
      "model": "claude-3-sonnet-20240229"
    },
    "documentation": {
      "provider": "google",
      "model": "gemini-pro"
    }
  }
}
```

### Workspace Integration
Set up project-specific configurations:

1. Create `.vscode/neon-agent.json` in your project
2. Define project-specific prompts and settings
3. Share with your team via version control

---

**Need help?** Open an issue on [GitHub](https://github.com/elijahnzeli1/Neon-Agent/issues) or check our [documentation](https://github.com/elijahnzeli1/Neon-Agent/wiki).
