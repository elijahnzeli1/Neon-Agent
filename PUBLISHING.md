# Publishing Neon Agent to VS Code Marketplace

This guide walks you through publishing your Neon Agent extension to the official Visual Studio Code Marketplace.

## 📋 Prerequisites

### 1. Microsoft Account & Azure DevOps
- Create a Microsoft account if you don't have one
- Sign up for Azure DevOps at https://dev.azure.com/
- Create an organization in Azure DevOps

### 2. Publisher Account
- Visit https://marketplace.visualstudio.com/manage
- Sign in with your Microsoft account
- Create a new publisher profile

### 3. Personal Access Token (PAT)
1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Create new token with these scopes:
   - **Marketplace**: `Manage`
   - **Organization**: `All accessible organizations`
3. Copy and save the token securely

## 🛠️ Installation & Setup

### 1. Install VSCE (Visual Studio Code Extension Manager)
```bash
npm install -g @vscode/vsce
```

### 2. Login to VSCE
```bash
vsce login <your-publisher-name>
```
Enter your Personal Access Token when prompted.

## 📦 Pre-Publishing Checklist

### 1. Verify Extension Files
- [ ] `package.json` has all required fields
- [ ] `README.md` is comprehensive and well-formatted
- [ ] `CHANGELOG.md` documents version history
- [ ] License file exists (`LICENSE`)
- [ ] Extension icon exists (recommended: 128x128px PNG)

### 2. Update package.json
Ensure these fields are properly configured:

```json
{
  "name": "neon-agent",
  "displayName": "Neon Agent - AI Coding Assistant",
  "description": "Advanced AI-powered coding assistant with real-time completion, intelligent refactoring, and comprehensive code analysis",
  "version": "1.0.0",
  "publisher": "your-publisher-name",
  "repository": {
    "type": "git",
    "url": "https://github.com/elijahnzeli1/Neon-Agent.git"
  },
  "bugs": {
    "url": "https://github.com/elijahnzeli1/Neon-Agent/issues"
  },
  "homepage": "https://github.com/elijahnzeli1/Neon-Agent#readme",
  "license": "MIT",
  "icon": "images/icon.png",
  "categories": [
    "Machine Learning",
    "Programming Languages",
    "Snippets",
    "Other"
  ],
  "keywords": [
    "ai",
    "artificial intelligence",
    "code completion",
    "refactoring",
    "code analysis",
    "documentation",
    "openai",
    "anthropic",
    "google ai"
  ]
}
```

### 3. Create Extension Icon
Create a 128x128px PNG icon at `images/icon.png`:
- Use your brand colors
- Make it recognizable and professional
- Ensure good visibility on both light and dark backgrounds

### 4. Test Extension Thoroughly
```bash
# Compile TypeScript
npm run compile

# Test in development mode
# Press F5 in VS Code

# Run linting
npm run lint

# Package locally to test
vsce package
```

## 🚀 Publishing Steps

### 1. Package the Extension
```bash
# Create .vsix package file
vsce package
```

### 2. Publish to Marketplace
```bash
# Publish directly
vsce publish

# Or publish with version bump
vsce publish patch   # 1.0.0 → 1.0.1
vsce publish minor   # 1.0.0 → 1.1.0
vsce publish major   # 1.0.0 → 2.0.0
```

### 3. Verify Publication
- Visit https://marketplace.visualstudio.com/
- Search for "Neon Agent"
- Verify all information displays correctly

## 📝 Important Considerations

### Security & Privacy
- **API Keys**: Never include API keys in the extension
- **User Data**: Clearly document data handling in privacy policy
- **Permissions**: Request only necessary permissions

### Marketplace Guidelines
- Follow [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- Ensure high-quality description and screenshots
- Provide clear installation and usage instructions

### Pricing & Licensing
- Your extension is currently MIT licensed (free)
- Consider if you want to offer premium features
- Review marketplace terms of service

## 🔄 Version Management

### Semantic Versioning
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

### Release Process
1. Update `CHANGELOG.md`
2. Test thoroughly
3. Commit changes
4. Run `vsce publish [patch|minor|major]`
5. Create GitHub release tag

## 🛡️ Post-Publication

### 1. Monitor Extension Health
- Check marketplace analytics
- Monitor user reviews and ratings
- Respond to issues on GitHub

### 2. Continuous Updates
- Regular security updates
- Feature improvements based on user feedback
- Keep dependencies updated

### 3. Marketing & Growth
- Share on social media
- Write blog posts about features
- Engage with VS Code community

## 📊 Marketplace Optimization

### 1. Extension Listing
- Write compelling description
- Add high-quality screenshots/GIFs
- Include feature highlights
- Use relevant tags and categories

### 2. README Enhancement
- Add badges (downloads, version, rating)
- Include demo GIFs
- Provide clear setup instructions
- Document all features with examples

### 3. SEO Optimization
- Use relevant keywords in description
- Optimize extension name and tags
- Regular updates improve ranking

## 🚨 Common Issues & Solutions

### Publishing Errors
```bash
# Error: Publisher not found
vsce login <your-publisher-name>

# Error: Token expired
vsce logout
vsce login <your-publisher-name>

# Error: Package validation failed
npm run lint
npm run compile
```

### Icon Issues
- Ensure icon is exactly 128x128px
- Use PNG format
- Check file path in package.json

### Version Conflicts
```bash
# Check current version
vsce show <publisher>.<extension-name>

# Force version update
vsce publish --force
```

## 📚 Additional Resources

- [VS Code Publishing Documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Azure DevOps PAT Guide](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)

---

## 🎯 Quick Publishing Checklist

- [ ] Azure DevOps account created
- [ ] Publisher profile created
- [ ] Personal Access Token generated
- [ ] VSCE installed globally
- [ ] Extension thoroughly tested
- [ ] Icon added (128x128px PNG)
- [ ] README.md polished
- [ ] package.json updated with publisher name
- [ ] All TypeScript compiled without errors
- [ ] Extension packaged successfully
- [ ] Published to marketplace
- [ ] Listing verified on marketplace

**Ready to publish? Run `vsce package` first to test, then `vsce publish` to go live!**
