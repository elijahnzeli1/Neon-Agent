import * as vscode from 'vscode';
import { AIProvider } from '../providers/AIProvider';

export interface RefactorResult {
    replacement: string;
    functionDeclaration?: string;
    variableDeclaration?: string;
    explanation: string;
}

export interface OptimizationResult {
    optimizedCode: string;
    improvements: string[];
    performanceGains: string[];
}

export class RefactoringAgent implements vscode.Disposable {
    private readonly aiProvider: AIProvider;
    private readonly outputChannel: vscode.OutputChannel;

    constructor(aiProvider: AIProvider) {
        this.aiProvider = aiProvider;
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent Refactoring');
    }

    public async extractFunction(
        selectedCode: string,
        language: string,
        fullCode: string
    ): Promise<RefactorResult> {
        try {
            this.log(`Extracting function from ${language} code`);

            const functionName = await this.suggestFunctionName(selectedCode, language);
            const parameters = await this.analyzeParameters(selectedCode, fullCode, language);
            const returnType = await this.analyzeReturnType(selectedCode, language);

            const prompt = `Extract the following ${language} code into a separate function:

Selected code to extract:
\`\`\`${language}
${selectedCode}
\`\`\`

Context (full code):
\`\`\`${language}
${fullCode}
\`\`\`

Please provide:
1. The function declaration with appropriate parameters and return type
2. The replacement code that calls the new function
3. A brief explanation of the extraction

Suggested function name: ${functionName}
Parameters: ${parameters.join(', ')}
Return type: ${returnType}

Format your response as:
FUNCTION:
[function declaration]

REPLACEMENT:
[replacement code]

EXPLANATION:
[brief explanation]`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} refactoring assistant. Extract functions cleanly while maintaining code functionality.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return this.parseRefactorResponse(response.content);
        } catch (error) {
            this.log(`Error extracting function: ${error}`);
            throw error;
        }
    }

    public async extractVariable(
        selectedExpression: string,
        language: string,
        fullCode: string
    ): Promise<RefactorResult> {
        try {
            this.log(`Extracting variable from ${language} expression`);

            const variableName = await this.suggestVariableName(selectedExpression, language);
            const variableType = await this.analyzeExpressionType(selectedExpression, language);

            const prompt = `Extract the following ${language} expression into a variable:

Expression to extract:
\`\`\`${language}
${selectedExpression}
\`\`\`

Context:
\`\`\`${language}
${fullCode}
\`\`\`

Please provide:
1. The variable declaration
2. The replacement code that uses the new variable
3. A brief explanation

Suggested variable name: ${variableName}
Type: ${variableType}

Format your response as:
VARIABLE:
[variable declaration]

REPLACEMENT:
[replacement code]

EXPLANATION:
[brief explanation]`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} refactoring assistant. Extract variables cleanly while maintaining code functionality.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            const result = this.parseRefactorResponse(response.content);
            // For variable extraction, put the declaration in variableDeclaration field
            result.variableDeclaration = result.functionDeclaration;
            result.functionDeclaration = undefined;

            return result;
        } catch (error) {
            this.log(`Error extracting variable: ${error}`);
            throw error;
        }
    }

    public async optimizeCode(code: string, language: string): Promise<string> {
        try {
            this.log(`Optimizing ${language} code`);

            const prompt = `Optimize the following ${language} code for better performance, readability, and maintainability:

\`\`\`${language}
${code}
\`\`\`

Please:
1. Improve performance where possible
2. Enhance readability and code style
3. Apply best practices for ${language}
4. Maintain the same functionality
5. Add comments where helpful

Return only the optimized code without explanations.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} developer specializing in code optimization. Focus on performance, readability, and best practices.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return this.cleanCodeResponse(response.content);
        } catch (error) {
            this.log(`Error optimizing code: ${error}`);
            throw error;
        }
    }

    public async convertToAsync(code: string, language: string): Promise<string> {
        try {
            this.log(`Converting ${language} code to async/await pattern`);

            const prompt = `Convert the following ${language} code to use async/await pattern:

\`\`\`${language}
${code}
\`\`\`

Please:
1. Convert callback or promise chains to async/await
2. Add proper error handling with try/catch
3. Maintain the same functionality
4. Follow ${language} best practices for async code

Return only the converted code.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} developer specializing in asynchronous programming patterns.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return this.cleanCodeResponse(response.content);
        } catch (error) {
            this.log(`Error converting to async: ${error}`);
            throw error;
        }
    }

    public async improveReadability(code: string, language: string): Promise<string> {
        try {
            this.log(`Improving readability of ${language} code`);

            const prompt = `Improve the readability of the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Please:
1. Add meaningful variable and function names
2. Break down complex expressions
3. Add helpful comments
4. Improve code structure and formatting
5. Follow ${language} naming conventions
6. Maintain the same functionality

Return only the improved code.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} developer focused on writing clean, readable code.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return this.cleanCodeResponse(response.content);
        } catch (error) {
            this.log(`Error improving readability: ${error}`);
            throw error;
        }
    }

    public async modernizeCode(code: string, language: string): Promise<string> {
        try {
            this.log(`Modernizing ${language} code`);

            let modernizationPrompt = '';
            
            switch (language) {
                case 'javascript':
                case 'typescript':
                    modernizationPrompt = `
- Use ES6+ features (arrow functions, destructuring, template literals)
- Replace var with const/let
- Use modern JavaScript APIs
- Apply functional programming concepts where appropriate`;
                    break;
                case 'python':
                    modernizationPrompt = `
- Use f-strings instead of format()
- Apply type hints where appropriate
- Use modern Python idioms and built-ins
- Leverage list/dict comprehensions`;
                    break;
                case 'java':
                    modernizationPrompt = `
- Use modern Java features (streams, lambdas, var keyword)
- Apply records and pattern matching where appropriate
- Use modern collection methods
- Improve exception handling`;
                    break;
                default:
                    modernizationPrompt = `
- Apply modern language features and best practices
- Use latest idioms and patterns
- Improve performance with modern APIs`;
            }

            const prompt = `Modernize the following ${language} code using current best practices:

\`\`\`${language}
${code}
\`\`\`

Please apply modern ${language} features:${modernizationPrompt}

Maintain the same functionality while using modern language constructs.
Return only the modernized code.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert modern ${language} developer who stays current with the latest language features and best practices.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return this.cleanCodeResponse(response.content);
        } catch (error) {
            this.log(`Error modernizing code: ${error}`);
            throw error;
        }
    }

    public async addErrorHandling(code: string, language: string): Promise<string> {
        try {
            this.log(`Adding error handling to ${language} code`);

            const prompt = `Add comprehensive error handling to the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Please:
1. Identify potential error conditions
2. Add appropriate try/catch or error handling patterns
3. Include meaningful error messages
4. Follow ${language} error handling best practices
5. Add logging where appropriate
6. Maintain the same core functionality

Return only the code with added error handling.`;

            const response = await this.aiProvider.chat([
                {
                    role: 'system',
                    content: `You are an expert ${language} developer specializing in robust error handling and defensive programming.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            return this.cleanCodeResponse(response.content);
        } catch (error) {
            this.log(`Error adding error handling: ${error}`);
            throw error;
        }
    }

    private async suggestFunctionName(code: string, language: string): Promise<string> {
        // Simple heuristic-based function name suggestion
        const words: string[] = code.toLowerCase().match(/\b\w+\b/g) || [];
        const commonWords = ['get', 'set', 'calculate', 'process', 'handle', 'create', 'update', 'delete'];
        
        for (const word of commonWords) {
            if (words.includes(word)) {
                return `${word}Data`;
            }
        }
        
        return 'extractedFunction';
    }

    private async suggestVariableName(expression: string, language: string): Promise<string> {
        // Simple heuristic-based variable name suggestion
        if (expression.includes('length')) return 'length';
        if (expression.includes('count')) return 'count';
        if (expression.includes('index')) return 'index';
        if (expression.includes('result')) return 'result';
        if (expression.includes('value')) return 'value';
        
        return 'extractedValue';
    }

    private async analyzeParameters(selectedCode: string, fullCode: string, language: string): Promise<string[]> {
        // Simple analysis of potential parameters
        const variables = selectedCode.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
        const declarations = fullCode.match(/(?:let|const|var|int|string|boolean)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g) || [];
        
        const declaredVars = declarations.map(decl => decl.split(/\s+/)[1]);
        const parameters = variables.filter(v => !declaredVars.includes(v) && v !== 'function');
        
        return [...new Set(parameters)]; // Remove duplicates
    }

    private async analyzeReturnType(code: string, language: string): Promise<string> {
        if (code.includes('return')) {
            if (language === 'typescript' || language === 'java') {
                // Try to infer type based on returned value
                if (code.includes('return true') || code.includes('return false')) return 'boolean';
                if (code.includes('return 0') || code.includes('return 1')) return 'number';
                if (code.includes('return "') || code.includes("return '")) return 'string';
            }
            return language === 'typescript' ? 'any' : '';
        }
        return language === 'typescript' ? 'void' : '';
    }

    private async analyzeExpressionType(expression: string, language: string): Promise<string> {
        if (language === 'typescript' || language === 'java') {
            if (expression.includes('"') || expression.includes("'")) return 'string';
            if (/^\d+$/.test(expression.trim())) return 'number';
            if (expression.includes('true') || expression.includes('false')) return 'boolean';
            if (expression.includes('[') || expression.includes('Array')) return 'array';
            if (expression.includes('{') || expression.includes('Object')) return 'object';
        }
        return 'auto';
    }

    private parseRefactorResponse(response: string): RefactorResult {
        const functionMatch = response.match(/FUNCTION:\s*([\s\S]*?)(?=REPLACEMENT:|$)/);
        const replacementMatch = response.match(/REPLACEMENT:\s*([\s\S]*?)(?=EXPLANATION:|$)/);
        const explanationMatch = response.match(/EXPLANATION:\s*([\s\S]*?)$/);
        
        // If structured format is not found, try to extract from code blocks
        if (!functionMatch || !replacementMatch) {
            const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
            return {
                replacement: codeBlocks[1] ? this.cleanCodeBlock(codeBlocks[1]) : response,
                functionDeclaration: codeBlocks[0] ? this.cleanCodeBlock(codeBlocks[0]) : undefined,
                explanation: explanationMatch ? explanationMatch[1].trim() : 'Function extracted successfully'
            };
        }

        return {
            replacement: replacementMatch[1].trim(),
            functionDeclaration: functionMatch[1].trim(),
            explanation: explanationMatch ? explanationMatch[1].trim() : 'Refactoring completed successfully'
        };
    }

    private cleanCodeResponse(response: string): string {
        // Remove markdown code blocks if present
        let cleaned = response.replace(/```[\w]*\n([\s\S]*?)\n```/g, '$1');
        
        // Remove any explanatory text before or after code
        const lines = cleaned.split('\n');
        let startIndex = 0;
        let endIndex = lines.length - 1;
        
        // Find the actual code start
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() && !lines[i].startsWith('//') && !lines[i].startsWith('#')) {
                startIndex = i;
                break;
            }
        }
        
        // Find the actual code end
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() && !lines[i].startsWith('//') && !lines[i].startsWith('#')) {
                endIndex = i;
                break;
            }
        }
        
        return lines.slice(startIndex, endIndex + 1).join('\n');
    }

    private cleanCodeBlock(codeBlock: string): string {
        return codeBlock.replace(/```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
