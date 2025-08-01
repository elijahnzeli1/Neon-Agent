import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AIProvider } from '../providers/AIProvider';

export interface DocumentationConfig {
    includePrivate: boolean;
    includeInternal: boolean;
    format: 'markdown' | 'html' | 'jsdoc';
    language: string;
}

export class DocumentationGenerator implements vscode.Disposable {
    private readonly aiProvider: AIProvider;
    private readonly outputChannel: vscode.OutputChannel;

    constructor(aiProvider: AIProvider) {
        this.aiProvider = aiProvider;
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent Documentation');
    }

    public async generateDocumentation(
        code: string, 
        language: string, 
        config?: Partial<DocumentationConfig>
    ): Promise<string> {
        try {
            this.log(`Generating documentation for ${language} code`);

            const fullConfig: DocumentationConfig = {
                includePrivate: false,
                includeInternal: false,
                format: 'markdown',
                language,
                ...config
            };

            const prompt = this.buildDocumentationPrompt(code, fullConfig);
            
            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert technical writer specializing in ${language} documentation. Create comprehensive, clear, and well-structured documentation.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return this.formatDocumentation(response.content, fullConfig.format);
        } catch (error) {
            this.log(`Error generating documentation: ${error}`);
            throw error;
        }
    }

    public async addComments(code: string, language: string): Promise<string> {
        try {
            this.log(`Adding comments to ${language} code`);

            const prompt = `Add comprehensive inline comments to the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Please:
1. Add meaningful comments explaining complex logic
2. Document function parameters and return values
3. Explain the purpose of classes and methods
4. Add TODO comments for potential improvements
5. Use appropriate comment syntax for ${language}
6. Don't over-comment obvious code

Return only the commented code without explanations.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} developer who writes clear, helpful comments that enhance code understanding.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return this.cleanCodeResponse(response.content);
        } catch (error) {
            this.log(`Error adding comments: ${error}`);
            throw error;
        }
    }

    public async generateReadme(workspacePath: string): Promise<string> {
        try {
            this.log(`Generating README for workspace: ${workspacePath}`);

            const projectInfo = await this.analyzeProject(workspacePath);
            
            const prompt = `Generate a comprehensive README.md for this project:

Project Information:
${projectInfo}

Please include:
1. Project title and description
2. Features and capabilities
3. Installation instructions
4. Usage examples
5. API documentation (if applicable)
6. Configuration options
7. Contributing guidelines
8. License information
9. Contact/support information

Make it professional and engaging for both users and contributors.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: 'You are an expert technical writer specializing in creating engaging and comprehensive README files for software projects.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return response.content;
        } catch (error) {
            this.log(`Error generating README: ${error}`);
            throw error;
        }
    }

    public async generateApiDocs(code: string, language: string): Promise<string> {
        try {
            this.log(`Generating API documentation for ${language} code`);

            const functions = this.extractFunctions(code, language);
            const classes = this.extractClasses(code, language);
            
            const prompt = `Generate comprehensive API documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Functions found: ${functions.join(', ')}
Classes found: ${classes.join(', ')}

Please provide:
1. API overview and usage
2. Detailed function/method documentation
3. Parameter descriptions with types
4. Return value documentation
5. Example usage for each function/class
6. Error conditions and exceptions
7. Best practices and notes

Format as markdown with clear sections and code examples.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert API documentation writer for ${language} projects.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return response.content;
        } catch (error) {
            this.log(`Error generating API docs: ${error}`);
            throw error;
        }
    }

    public async generateChangelog(workspacePath: string): Promise<string> {
        try {
            this.log(`Generating changelog for workspace: ${workspacePath}`);

            // Try to get git history
            const gitHistory = await this.getGitHistory(workspacePath);
            const packageInfo = await this.getPackageInfo(workspacePath);

            const prompt = `Generate a CHANGELOG.md file for this project:

Package Information:
${packageInfo}

Recent Git History:
${gitHistory}

Please format as a standard changelog with:
1. Version numbers and dates
2. Added, Changed, Deprecated, Removed, Fixed, Security sections
3. Clear descriptions of changes
4. Links to issues/PRs where applicable
5. Follow Keep a Changelog format

If no git history is available, create a template structure.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: 'You are an expert at creating well-structured changelogs following industry standards.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return response.content;
        } catch (error) {
            this.log(`Error generating changelog: ${error}`);
            throw error;
        }
    }

    public async generateJSDoc(code: string): Promise<string> {
        try {
            this.log('Generating JSDoc comments');

            const prompt = `Add JSDoc comments to the following JavaScript/TypeScript code:

\`\`\`javascript
${code}
\`\`\`

Please:
1. Add proper JSDoc blocks for all functions and classes
2. Document parameters with @param tags
3. Document return values with @returns tags
4. Add @throws tags for exceptions
5. Include @example tags with usage examples
6. Use @since, @author, @version where appropriate
7. Follow JSDoc best practices

Return only the code with JSDoc comments added.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: 'You are an expert at writing comprehensive JSDoc documentation for JavaScript and TypeScript code.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return this.cleanCodeResponse(response.content);
        } catch (error) {
            this.log(`Error generating JSDoc: ${error}`);
            throw error;
        }
    }

    private buildDocumentationPrompt(code: string, config: DocumentationConfig): string {
        let prompt = `Generate comprehensive documentation for this ${config.language} code:\n\n`;
        prompt += `\`\`\`${config.language}\n${code}\n\`\`\`\n\n`;
        
        prompt += 'Please include:\n';
        prompt += '1. Overview and purpose\n';
        prompt += '2. Detailed API documentation\n';
        prompt += '3. Usage examples\n';
        prompt += '4. Parameter and return value descriptions\n';
        prompt += '5. Error handling information\n';
        prompt += '6. Performance considerations\n';
        prompt += '7. Related functions or dependencies\n\n';

        if (!config.includePrivate) {
            prompt += 'Exclude private methods and internal implementation details.\n';
        }

        if (!config.includeInternal) {
            prompt += 'Focus on public API and user-facing functionality.\n';
        }

        prompt += `Format the output as ${config.format}.`;

        return prompt;
    }

    private async analyzeProject(workspacePath: string): Promise<string> {
        let projectInfo = `Workspace Path: ${workspacePath}\n\n`;

        try {
            // Analyze package.json
            const packageJsonPath = path.join(workspacePath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                projectInfo += `Package Name: ${packageJson.name || 'Unknown'}\n`;
                projectInfo += `Version: ${packageJson.version || 'Unknown'}\n`;
                projectInfo += `Description: ${packageJson.description || 'No description'}\n`;
                projectInfo += `Main Entry: ${packageJson.main || 'Unknown'}\n`;
                
                if (packageJson.scripts) {
                    projectInfo += `Scripts: ${Object.keys(packageJson.scripts).join(', ')}\n`;
                }
                
                if (packageJson.dependencies) {
                    projectInfo += `Dependencies: ${Object.keys(packageJson.dependencies).join(', ')}\n`;
                }
                
                projectInfo += '\n';
            }

            // Analyze project structure
            const files = fs.readdirSync(workspacePath);
            const sourceFiles = files.filter(file => 
                file.endsWith('.js') || 
                file.endsWith('.ts') || 
                file.endsWith('.py') || 
                file.endsWith('.java') ||
                file.endsWith('.cpp') ||
                file.endsWith('.c')
            );
            
            projectInfo += `Source Files: ${sourceFiles.join(', ')}\n`;
            
            // Check for common directories
            const commonDirs = ['src', 'lib', 'test', 'tests', 'docs', 'examples'];
            const existingDirs = commonDirs.filter(dir => 
                fs.existsSync(path.join(workspacePath, dir)) && 
                fs.statSync(path.join(workspacePath, dir)).isDirectory()
            );
            
            if (existingDirs.length > 0) {
                projectInfo += `Directories: ${existingDirs.join(', ')}\n`;
            }

            // Check for configuration files
            const configFiles = files.filter(file => 
                file.includes('config') || 
                file.startsWith('.') || 
                file.endsWith('.json') ||
                file.endsWith('.yml') ||
                file.endsWith('.yaml')
            );
            
            if (configFiles.length > 0) {
                projectInfo += `Config Files: ${configFiles.join(', ')}\n`;
            }

        } catch (error) {
            projectInfo += `Analysis Error: ${error}\n`;
        }

        return projectInfo;
    }

    private async getGitHistory(workspacePath: string): Promise<string> {
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);

            const { stdout } = await execPromise('git log --oneline -10', { cwd: workspacePath });
            return stdout || 'No git history available';
        } catch (error) {
            return 'Git not available or not a git repository';
        }
    }

    private async getPackageInfo(workspacePath: string): Promise<string> {
        try {
            const packageJsonPath = path.join(workspacePath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                return JSON.stringify(packageJson, null, 2);
            }
            return 'No package.json found';
        } catch (error) {
            return `Error reading package.json: ${error}`;
        }
    }

    private extractFunctions(code: string, language: string): string[] {
        const functions: string[] = [];
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                const jsRegex = /(?:function\s+(\w+)|(\w+)\s*(?:=|:)\s*(?:function|\([^)]*\)\s*=>)|(?:async\s+)?(\w+)\s*\([^)]*\)\s*{)/g;
                let match;
                while ((match = jsRegex.exec(code)) !== null) {
                    functions.push(match[1] || match[2] || match[3]);
                }
                break;
            
            case 'python':
                const pyRegex = /def\s+(\w+)/g;
                while ((match = pyRegex.exec(code)) !== null) {
                    functions.push(match[1]);
                }
                break;
                
            case 'java':
                const javaRegex = /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/g;
                while ((match = javaRegex.exec(code)) !== null) {
                    functions.push(match[1]);
                }
                break;
        }
        
        return functions;
    }

    private extractClasses(code: string, language: string): string[] {
        const classes: string[] = [];
        const classRegex = /class\s+(\w+)/g;
        let match;
        
        while ((match = classRegex.exec(code)) !== null) {
            classes.push(match[1]);
        }
        
        return classes;
    }

    private formatDocumentation(content: string, format: string): string {
        switch (format) {
            case 'html':
                // Convert markdown to basic HTML
                return content
                    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/```[\w]*\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>')
                    .replace(/`(.*?)`/g, '<code>$1</code>')
                    .replace(/\n/g, '<br>');
            
            case 'jsdoc':
                // Format as JSDoc comments
                return content
                    .split('\n')
                    .map(line => ` * ${line}`)
                    .join('\n');
            
            case 'markdown':
            default:
                return content;
        }
    }

    private cleanCodeResponse(response: string): string {
        // Remove markdown code blocks if present
        let cleaned = response.replace(/```[\w]*\n([\s\S]*?)\n```/g, '$1');
        
        // Remove explanatory text
        const lines = cleaned.split('\n');
        let startIndex = 0;
        
        // Find the actual code start
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() && 
                !lines[i].toLowerCase().includes('here') && 
                !lines[i].toLowerCase().includes('code') &&
                !lines[i].startsWith('Note:') &&
                !lines[i].startsWith('The ')) {
                startIndex = i;
                break;
            }
        }
        
        return lines.slice(startIndex).join('\n').trim();
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
