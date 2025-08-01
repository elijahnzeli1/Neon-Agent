import * as vscode from 'vscode';
import { AIProvider } from '../providers/AIProvider';

export interface AnalysisResult {
    explanation?: string;
    bugs?: Bug[];
    suggestions?: string[];
    complexity?: ComplexityMetrics;
    tests?: string;
}

export interface Bug {
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
}

export interface ComplexityMetrics {
    cyclomaticComplexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
    cognitiveComplexity: number;
}

export class CodeAnalyzer implements vscode.Disposable {
    private readonly aiProvider: AIProvider;
    private readonly outputChannel: vscode.OutputChannel;

    constructor(aiProvider: AIProvider) {
        this.aiProvider = aiProvider;
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent Code Analyzer');
    }

    public async explainCode(code: string, language: string): Promise<string> {
        try {
            this.log(`Explaining ${language} code (${code.length} characters)`);
            
            // First try AI explanation
            const aiExplanation = await this.aiProvider.explainCode(code, language);
            
            // Enhance with static analysis
            const complexity = this.calculateComplexity(code, language);
            const patterns = this.identifyPatterns(code, language);
            
            let explanation = aiExplanation;
            
            if (complexity.cyclomaticComplexity > 10) {
                explanation += `\n\n⚠️ **Complexity Warning**: This code has high cyclomatic complexity (${complexity.cyclomaticComplexity}). Consider refactoring for better maintainability.`;
            }
            
            if (patterns.length > 0) {
                explanation += `\n\n**Design Patterns Detected**: ${patterns.join(', ')}`;
            }
            
            return explanation;
        } catch (error) {
            this.log(`Error explaining code: ${error}`);
            throw error;
        }
    }

    public async findBugs(code: string, language: string): Promise<string> {
        try {
            this.log(`Analyzing ${language} code for bugs`);
            
            // Combine AI analysis with static analysis
            const aiAnalysis = await this.aiProvider.findBugs(code, language);
            const staticBugs = this.performStaticAnalysis(code, language);
            
            let report = aiAnalysis;
            
            if (staticBugs.length > 0) {
                report += '\n\n## Static Analysis Results\n\n';
                staticBugs.forEach((bug, index) => {
                    report += `${index + 1}. **Line ${bug.line}** (${bug.severity}): ${bug.message}\n`;
                    if (bug.suggestion) {
                        report += `   💡 Suggestion: ${bug.suggestion}\n`;
                    }
                    report += '\n';
                });
            }
            
            return report;
        } catch (error) {
            this.log(`Error finding bugs: ${error}`);
            throw error;
        }
    }

    public async generateTests(code: string, language: string): Promise<string> {
        try {
            this.log(`Generating tests for ${language} code`);
            
            // Analyze code structure to inform test generation
            const functions = this.extractFunctions(code, language);
            const classes = this.extractClasses(code, language);
            
            let prompt = `Generate comprehensive unit tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
            
            if (functions.length > 0) {
                prompt += `Functions to test: ${functions.join(', ')}\n`;
            }
            
            if (classes.length > 0) {
                prompt += `Classes to test: ${classes.join(', ')}\n`;
            }
            
            prompt += 'Include tests for:\n- Normal cases\n- Edge cases\n- Error conditions\n- Boundary values';
            
            return await this.aiProvider.generateTests(code, language);
        } catch (error) {
            this.log(`Error generating tests: ${error}`);
            throw error;
        }
    }

    public async reviewCode(code: string, language: string): Promise<string> {
        try {
            this.log(`Performing code review for ${language} code`);
            
            const explanation = await this.explainCode(code, language);
            const bugs = await this.findBugs(code, language);
            const complexity = this.calculateComplexity(code, language);
            const suggestions = this.generateSuggestions(code, language, complexity);
            
            let review = `# Code Review Report\n\n`;
            review += `## Code Analysis\n${explanation}\n\n`;
            review += `## Bug Analysis\n${bugs}\n\n`;
            review += `## Complexity Metrics\n`;
            review += `- Cyclomatic Complexity: ${complexity.cyclomaticComplexity}\n`;
            review += `- Lines of Code: ${complexity.linesOfCode}\n`;
            review += `- Maintainability Index: ${complexity.maintainabilityIndex}\n`;
            review += `- Cognitive Complexity: ${complexity.cognitiveComplexity}\n\n`;
            
            if (suggestions.length > 0) {
                review += `## Improvement Suggestions\n`;
                suggestions.forEach((suggestion, index) => {
                    review += `${index + 1}. ${suggestion}\n`;
                });
            }
            
            return review;
        } catch (error) {
            this.log(`Error reviewing code: ${error}`);
            throw error;
        }
    }

    private performStaticAnalysis(code: string, language: string): Bug[] {
        const bugs: Bug[] = [];
        const lines = code.split('\n');
        
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();
            
            // Common issues across languages
            if (trimmedLine.includes('TODO') || trimmedLine.includes('FIXME')) {
                bugs.push({
                    line: lineNumber,
                    severity: 'info',
                    message: 'TODO/FIXME comment found',
                    suggestion: 'Consider addressing this before production'
                });
            }
            
            // Language-specific checks
            switch (language) {
                case 'javascript':
                case 'typescript':
                    this.analyzeJavaScript(line, lineNumber, bugs);
                    break;
                case 'python':
                    this.analyzePython(line, lineNumber, bugs);
                    break;
                case 'java':
                    this.analyzeJava(line, lineNumber, bugs);
                    break;
            }
        });
        
        return bugs;
    }

    private analyzeJavaScript(line: string, lineNumber: number, bugs: Bug[]): void {
        const trimmedLine = line.trim();
        
        // Check for == instead of ===
        if (trimmedLine.includes('==') && !trimmedLine.includes('===')) {
            bugs.push({
                line: lineNumber,
                severity: 'warning',
                message: 'Use strict equality (===) instead of loose equality (==)',
                suggestion: 'Replace == with === for type-safe comparison'
            });
        }
        
        // Check for var usage
        if (trimmedLine.startsWith('var ')) {
            bugs.push({
                line: lineNumber,
                severity: 'warning',
                message: 'Avoid using var, use let or const instead',
                suggestion: 'Use const for constants or let for variables'
            });
        }
        
        // Check for console.log in production code
        if (trimmedLine.includes('console.log')) {
            bugs.push({
                line: lineNumber,
                severity: 'info',
                message: 'Console.log statement found',
                suggestion: 'Remove console.log before production deployment'
            });
        }
    }

    private analyzePython(line: string, lineNumber: number, bugs: Bug[]): void {
        const trimmedLine = line.trim();
        
        // Check for bare except
        if (trimmedLine === 'except:') {
            bugs.push({
                line: lineNumber,
                severity: 'warning',
                message: 'Bare except clause catches all exceptions',
                suggestion: 'Specify the exception type to catch'
            });
        }
        
        // Check for print statements
        if (trimmedLine.includes('print(')) {
            bugs.push({
                line: lineNumber,
                severity: 'info',
                message: 'Print statement found',
                suggestion: 'Consider using logging instead of print'
            });
        }
    }

    private analyzeJava(line: string, lineNumber: number, bugs: Bug[]): void {
        const trimmedLine = line.trim();
        
        // Check for System.out.println
        if (trimmedLine.includes('System.out.println')) {
            bugs.push({
                line: lineNumber,
                severity: 'info',
                message: 'System.out.println found',
                suggestion: 'Use a proper logging framework instead'
            });
        }
    }

    private calculateComplexity(code: string, language: string): ComplexityMetrics {
        const lines = code.split('\n').filter(line => line.trim().length > 0);
        const linesOfCode = lines.length;
        
        // Calculate cyclomatic complexity
        let cyclomaticComplexity = 1; // Base complexity
        const complexityKeywords = ['if', 'else', 'while', 'for', 'case', 'catch', '&&', '||', '?'];
        
        for (const line of lines) {
            for (const keyword of complexityKeywords) {
                const regex = new RegExp(`\\b${keyword}\\b`, 'g');
                const matches = line.match(regex);
                if (matches) {
                    cyclomaticComplexity += matches.length;
                }
            }
        }
        
        // Calculate cognitive complexity (simplified)
        let cognitiveComplexity = 0;
        let nestingLevel = 0;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Increase nesting level
            if (trimmedLine.includes('{') || trimmedLine.endsWith(':')) {
                nestingLevel++;
            }
            
            // Decrease nesting level
            if (trimmedLine.includes('}')) {
                nestingLevel = Math.max(0, nestingLevel - 1);
            }
            
            // Add cognitive complexity for control structures
            const cognitiveKeywords = ['if', 'else if', 'while', 'for', 'case', 'catch'];
            for (const keyword of cognitiveKeywords) {
                if (trimmedLine.includes(keyword)) {
                    cognitiveComplexity += 1 + nestingLevel;
                }
            }
        }
        
        // Calculate maintainability index (simplified)
        const maintainabilityIndex = Math.max(0, 
            171 - 5.2 * Math.log(cyclomaticComplexity) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode)
        );
        
        return {
            cyclomaticComplexity,
            linesOfCode,
            maintainabilityIndex: Math.round(maintainabilityIndex),
            cognitiveComplexity
        };
    }

    private identifyPatterns(code: string, language: string): string[] {
        const patterns: string[] = [];
        
        // Check for common design patterns
        if (code.includes('class') && code.includes('extends')) {
            patterns.push('Inheritance');
        }
        
        if (code.includes('interface') || code.includes('implements')) {
            patterns.push('Interface Implementation');
        }
        
        if (code.includes('factory') || code.includes('Factory')) {
            patterns.push('Factory Pattern');
        }
        
        if (code.includes('singleton') || code.includes('Singleton')) {
            patterns.push('Singleton Pattern');
        }
        
        if (code.includes('observer') || code.includes('Observer')) {
            patterns.push('Observer Pattern');
        }
        
        if (code.includes('async') && code.includes('await')) {
            patterns.push('Async/Await Pattern');
        }
        
        return patterns;
    }

    private extractFunctions(code: string, language: string): string[] {
        const functions: string[] = [];
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                const jsRegex = /(?:function\s+(\w+)|(\w+)\s*(?:=|:)\s*(?:function|\([^)]*\)\s*=>))/g;
                let match;
                while ((match = jsRegex.exec(code)) !== null) {
                    functions.push(match[1] || match[2]);
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

    private generateSuggestions(code: string, language: string, complexity: ComplexityMetrics): string[] {
        const suggestions: string[] = [];
        
        if (complexity.cyclomaticComplexity > 10) {
            suggestions.push('Consider breaking down complex functions into smaller, more focused functions');
        }
        
        if (complexity.linesOfCode > 50) {
            suggestions.push('This function/file is quite long. Consider splitting it into smaller modules');
        }
        
        if (complexity.maintainabilityIndex < 20) {
            suggestions.push('Low maintainability index. Consider refactoring to improve readability');
        }
        
        if (complexity.cognitiveComplexity > 15) {
            suggestions.push('High cognitive complexity. Simplify control flow and reduce nesting');
        }
        
        // Language-specific suggestions
        switch (language) {
            case 'javascript':
            case 'typescript':
                if (!code.includes('const') && !code.includes('let')) {
                    suggestions.push('Use modern JavaScript features like const/let instead of var');
                }
                break;
                
            case 'python':
                if (!code.includes('def ') && code.length > 20) {
                    suggestions.push('Consider organizing code into functions for better structure');
                }
                break;
        }
        
        return suggestions;
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
