const { AIService } = require('./AIService');

class CodeAnalyzer {
    constructor() {
        this.aiService = new AIService();
    }

    async analyze(code, language = 'javascript', filePath = '') {
        try {
            const analysis = {
                summary: '',
                issues: [],
                suggestions: [],
                complexity: 'unknown',
                maintainability: 'unknown',
                performance: 'unknown',
                security: 'unknown',
                metrics: {
                    linesOfCode: 0,
                    cyclomaticComplexity: 0,
                    maintainabilityIndex: 0
                }
            };

            // Basic metrics
            analysis.metrics.linesOfCode = this.countLines(code);
            analysis.metrics.cyclomaticComplexity = this.calculateCyclomaticComplexity(code, language);
            analysis.metrics.maintainabilityIndex = this.calculateMaintainabilityIndex(code, language);

            // Static analysis
            const staticAnalysis = this.performStaticAnalysis(code, language);
            analysis.issues = staticAnalysis.issues;
            analysis.suggestions.push(...staticAnalysis.suggestions);

            // AI-powered analysis
            if (this.aiService.model) {
                const aiAnalysis = await this.performAIAnalysis(code, language, filePath);
                analysis.summary = aiAnalysis.summary;
                analysis.suggestions.push(...aiAnalysis.suggestions);
                analysis.complexity = aiAnalysis.complexity;
                analysis.maintainability = aiAnalysis.maintainability;
                analysis.performance = aiAnalysis.performance;
                analysis.security = aiAnalysis.security;
            } else {
                analysis.summary = 'Basic analysis completed. Enable AI for detailed insights.';
            }

            return analysis;
        } catch (error) {
            console.error('Analysis error:', error);
            return {
                summary: 'Analysis failed',
                issues: [{ type: 'error', message: error.message }],
                suggestions: ['Fix the analysis error to get proper insights'],
                complexity: 'unknown',
                maintainability: 'unknown',
                performance: 'unknown',
                security: 'unknown',
                metrics: { linesOfCode: 0, cyclomaticComplexity: 0, maintainabilityIndex: 0 }
            };
        }
    }

    countLines(code) {
        return code.split('\n').filter(line => line.trim().length > 0).length;
    }

    calculateCyclomaticComplexity(code, language) {
        // Basic cyclomatic complexity calculation
        const complexityKeywords = {
            javascript: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?'],
            typescript: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?'],
            python: ['if', 'elif', 'else', 'for', 'while', 'try', 'except', 'and', 'or'],
            java: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?'],
            csharp: ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?']
        };

        const keywords = complexityKeywords[language] || complexityKeywords.javascript;
        let complexity = 1; // Base complexity

        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = code.match(regex);
            if (matches) {
                complexity += matches.length;
            }
        });

        return complexity;
    }

    calculateMaintainabilityIndex(code, language) {
        // Simplified maintainability index calculation
        const linesOfCode = this.countLines(code);
        const cyclomaticComplexity = this.calculateCyclomaticComplexity(code, language);

        // Simplified formula (actual MI is more complex)
        const maintainabilityIndex = Math.max(0,
            171 - 5.2 * Math.log(linesOfCode) - 0.23 * cyclomaticComplexity
        );

        return Math.round(maintainabilityIndex);
    }

    performStaticAnalysis(code, language) {
        const issues = [];
        const suggestions = [];

        // Language-specific static analysis
        switch (language) {
        case 'javascript':
        case 'typescript':
            this.analyzeJavaScript(code, issues, suggestions);
            break;
        case 'python':
            this.analyzePython(code, issues, suggestions);
            break;
        case 'java':
            this.analyzeJava(code, issues, suggestions);
            break;
        default:
            suggestions.push('Enable language-specific analysis for more detailed insights');
        }

        // General code quality checks
        this.performGeneralAnalysis(code, issues, suggestions);

        return { issues, suggestions };
    }

    analyzeJavaScript(code, issues, suggestions) {
        // Check for common JavaScript issues
        if (code.includes('var ')) {
            issues.push({ type: 'warning', message: 'Consider using let or const instead of var' });
            suggestions.push('Replace var declarations with let or const for better scoping');
        }

        if (code.includes('== ') || code.includes('!= ')) {
            issues.push({ type: 'warning', message: 'Consider using strict equality (=== or !==)' });
            suggestions.push('Use strict equality operators to avoid type coercion issues');
        }

        if (code.match(/console\.log/g)) {
            issues.push({ type: 'info', message: 'Console.log statements found' });
            suggestions.push('Remove console.log statements before production');
        }

        if (!code.includes('use strict')) {
            suggestions.push('Consider adding "use strict" directive for better error handling');
        }
    }

    analyzePython(code, issues, suggestions) {
        // Check for common Python issues
        if (code.match(/except:/g)) {
            issues.push({ type: 'warning', message: 'Bare except clauses found' });
            suggestions.push('Specify exception types in except clauses');
        }

        if (code.includes('print(')) {
            issues.push({ type: 'info', message: 'Print statements found' });
            suggestions.push('Consider using logging instead of print statements');
        }

        if (!code.match(/^def \w+\(/m)) {
            suggestions.push('Consider breaking code into functions for better organization');
        }
    }

    analyzeJava(code, issues, suggestions) {
        // Check for common Java issues
        if (code.includes('System.out.println')) {
            issues.push({ type: 'info', message: 'System.out.println statements found' });
            suggestions.push('Consider using a logging framework instead of System.out.println');
        }

        if (!code.match(/public class \w+/)) {
            suggestions.push('Ensure proper class structure and naming conventions');
        }
    }

    performGeneralAnalysis(code, issues, suggestions) {
        const lines = code.split('\n');

        // Check for long lines
        lines.forEach((line, index) => {
            if (line.length > 120) {
                issues.push({
                    type: 'info',
                    message: `Long line at line ${index + 1} (${line.length} characters)`
                });
            }
        });

        // Check for TODO/FIXME comments
        const todoRegex = /(TODO|FIXME|HACK|BUG)/gi;
        const todoMatches = code.match(todoRegex);
        if (todoMatches) {
            issues.push({
                type: 'info',
                message: `${todoMatches.length} TODO/FIXME comment(s) found`
            });
        }

        // Check for empty functions/methods
        const emptyFunctionRegex = /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/g;
        if (code.match(emptyFunctionRegex)) {
            issues.push({ type: 'warning', message: 'Empty functions found' });
            suggestions.push('Implement or remove empty functions');
        }
    }

    async performAIAnalysis(code, language, filePath) {
        try {
            const analysisPrompt = `
Analyze the following ${language} code and provide insights:

File: ${filePath || 'Unknown'}

\`\`\`${language}
${code}
\`\`\`

Provide analysis in the following format:

SUMMARY: [Brief overview of the code's purpose and quality]

COMPLEXITY: [low/medium/high]

MAINTAINABILITY: [low/medium/high] 

PERFORMANCE: [low/medium/high]

SECURITY: [low/medium/high]

SUGGESTIONS:
- [Specific improvement suggestion 1]
- [Specific improvement suggestion 2]
- [Specific improvement suggestion 3]

Focus on:
- Code structure and organization
- Performance optimizations
- Security vulnerabilities
- Best practices compliance
- Maintainability improvements`;

            const response = await this.aiService.chat(analysisPrompt);
            return this.parseAIAnalysis(response);
        } catch (error) {
            console.error('AI analysis error:', error);
            return {
                summary: 'AI analysis unavailable',
                complexity: 'unknown',
                maintainability: 'unknown',
                performance: 'unknown',
                security: 'unknown',
                suggestions: []
            };
        }
    }

    parseAIAnalysis(response) {
        const analysis = {
            summary: '',
            complexity: 'unknown',
            maintainability: 'unknown',
            performance: 'unknown',
            security: 'unknown',
            suggestions: []
        };

        try {
            const lines = response.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.startsWith('SUMMARY:')) {
                    analysis.summary = line.replace('SUMMARY:', '').trim();
                } else if (line.startsWith('COMPLEXITY:')) {
                    analysis.complexity = line.replace('COMPLEXITY:', '').trim().toLowerCase();
                } else if (line.startsWith('MAINTAINABILITY:')) {
                    analysis.maintainability = line.replace('MAINTAINABILITY:', '').trim().toLowerCase();
                } else if (line.startsWith('PERFORMANCE:')) {
                    analysis.performance = line.replace('PERFORMANCE:', '').trim().toLowerCase();
                } else if (line.startsWith('SECURITY:')) {
                    analysis.security = line.replace('SECURITY:', '').trim().toLowerCase();
                } else if (line.startsWith('SUGGESTIONS:')) {
                    // Parse suggestions
                    for (let j = i + 1; j < lines.length; j++) {
                        const suggestionLine = lines[j].trim();
                        if (suggestionLine.startsWith('-')) {
                            analysis.suggestions.push(suggestionLine.replace('-', '').trim());
                        }
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Error parsing AI analysis:', error);
        }

        return analysis;
    }
}

module.exports = { CodeAnalyzer };
