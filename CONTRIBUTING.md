# Contributing to Neon Agent

Thank you for your interest in contributing to Neon Agent! This guide will help you get started with contributing to the project.

## 🤝 Ways to Contribute

- **Bug Reports**: Found a bug? Let us know!
- **Feature Requests**: Have an idea for a new feature?
- **Code Contributions**: Fix bugs or implement new features
- **Documentation**: Improve our docs and guides
- **Testing**: Help test new features and report issues
- **Translations**: Help make Neon Agent available in more languages

## 🛠️ Development Setup

### Prerequisites
- Node.js 16+ and npm
- VS Code 1.74+
- Git
- TypeScript 4.9+

### Getting Started
1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/elijahnzeli1/Neon-Agent.git
   cd Neon-Agent
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Compile TypeScript**:
   ```bash
   npm run compile
   ```
5. **Open in VS Code**:
   ```bash
   code .
   ```
6. **Press F5** to run the extension in a new Extension Development Host

### Development Workflow
1. **Create a branch** for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Run linting**:
   ```bash
   npm run lint
   ```
5. **Commit your changes**:
   ```bash
   git commit -m "feat: add new feature"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request** on GitHub

## 📝 Coding Standards

### TypeScript Guidelines
- Use TypeScript for all new code
- Follow strict type checking
- Use interfaces for complex types
- Document public APIs with JSDoc

### Code Style
- Use ESLint configuration provided
- 2-space indentation
- Semicolons required
- Prefer `const` over `let`
- Use meaningful variable names

### Example Code Structure
```typescript
/**
 * Represents a code completion provider
 */
export interface CompletionProvider {
  /**
   * Provides code completions for the given context
   */
  provideCompletions(context: CompletionContext): Promise<CompletionItem[]>;
}

export class AICompletionProvider implements CompletionProvider {
  private readonly apiClient: AIClient;
  
  constructor(apiClient: AIClient) {
    this.apiClient = apiClient;
  }
  
  public async provideCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    // Implementation
  }
}
```

## 🧪 Testing

### Running Tests
```bash
npm test
```

### Writing Tests
- Create tests for all new features
- Place tests in `src/test/` directory
- Use descriptive test names
- Test both success and error cases

### Test Example
```typescript
import * as assert from 'assert';
import { AIProvider } from '../providers/AIProvider';

suite('AIProvider Tests', () => {
  test('should initialize with valid config', () => {
    const provider = new AIProvider();
    assert.ok(provider);
  });
  
  test('should handle API errors gracefully', async () => {
    // Test implementation
  });
});
```

## 📋 Pull Request Guidelines

### Before Submitting
- [ ] Code follows our style guidelines
- [ ] Tests pass locally
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventions

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Extension tested in development host

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass
- [ ] Documentation updated
```

## 🐛 Bug Reports

When reporting bugs, please include:

### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 10]
- VS Code Version: [e.g. 1.74.0]
- Extension Version: [e.g. 1.0.0]
- AI Provider: [e.g. OpenAI GPT-4]

**Additional context**
Any other context about the problem.
```

## 🚀 Feature Requests

For feature requests, please provide:

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots about the feature request.

**Implementation ideas**
If you have ideas about how to implement this feature.
```

## 📚 Documentation

### Updating Documentation
- Update README.md for user-facing changes
- Update SETUP.md for configuration changes
- Add JSDoc comments for code documentation
- Update CHANGELOG.md with your changes

### Documentation Standards
- Use clear, concise language
- Include code examples where helpful
- Keep formatting consistent
- Test all code examples

## 🔄 Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, backwards compatible

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
- `feat(completion): add support for multiple AI providers`
- `fix(chat): resolve memory leak in chat history`
- `docs(readme): update installation instructions`

## 🏗️ Architecture Guidelines

### Project Structure
```
src/
├── extension.ts           # Main extension entry point
├── providers/            # AI and completion providers
│   ├── AIProvider.ts
│   └── AICompletionProvider.ts
├── services/             # Core services
│   ├── CodeAnalyzer.ts
│   ├── RefactoringAgent.ts
│   └── DocumentationGenerator.ts
├── utils/                # Utility functions
└── test/                 # Test files
```

### Adding New Features

1. **Plan the feature**: Create an issue to discuss the feature
2. **Design the API**: Define interfaces and types
3. **Implement core logic**: Add the main functionality
4. **Add tests**: Ensure good test coverage
5. **Update documentation**: Include usage examples
6. **Test thoroughly**: Manual and automated testing

### Code Organization
- Keep files focused and single-purpose
- Use dependency injection
- Separate concerns (UI, business logic, data)
- Make classes disposable for proper cleanup

## 🔒 Security Guidelines

### API Key Handling
- Never log API keys
- Use secure storage for keys
- Validate API keys before use
- Provide clear error messages for invalid keys

### User Data
- Don't store user code unnecessarily
- Respect user privacy settings
- Use secure communication channels
- Minimize data collection

## 🌍 Community

### Getting Help
- Check existing issues and discussions
- Join our community chat (if available)
- Ask questions in GitHub Discussions
- Reach out to maintainers

### Code of Conduct
Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## 📞 Contact

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community chat
- **Email**: For private matters and security issues

---

Thank you for contributing to Neon Agent! 🎉
