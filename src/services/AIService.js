const { GoogleGenerativeAI } = require('@google/generative-ai');

// Try to require vscode, fallback to null if not available (for standalone server)
let vscode;
try {
    vscode = require('vscode');
} catch (error) {
    vscode = null;
}

class AIService {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.initializeAI();
    }

    initializeAI() {
        let apiKey, modelName;

        if (vscode) {
            // Running in VS Code extension
            const config = vscode.workspace.getConfiguration('neon-agent');
            apiKey = config.get('apiKey');
            modelName = config.get('model') || 'gemini-pro';
        } else {
            // Running standalone - use environment variables
            apiKey = process.env.NEON_AGENT_API_KEY;
            modelName = process.env.NEON_AGENT_MODEL || 'gemini-pro';
        }

        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: modelName });
        }
    }

    async chat(message, context = '', history = []) {
        if (!this.model) {
            throw new Error('AI service not initialized. Please set your API key in settings.');
        }

        try {
            const prompt = this.buildChatPrompt(message, context, history);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('AI chat error:', error);
            throw new Error(`AI service error: ${error.message}`);
        }
    }

    async generateCode(prompt, language = 'javascript', context = '') {
        if (!this.model) {
            throw new Error('AI service not initialized. Please set your API key in settings.');
        }

        try {
            const codePrompt = `
You are an expert ${language} developer. Generate clean, efficient, and well-documented code based on the following request:

Request: ${prompt}

${context ? `Context: ${context}` : ''}

Requirements:
- Write production-ready code
- Include appropriate comments
- Follow best practices for ${language}
- Ensure code is secure and performant
- Return only the code without explanations

Generate the ${language} code:`;

            const result = await this.model.generateContent(codePrompt);
            const response = await result.response;
            return this.extractCode(response.text());
        } catch (error) {
            console.error('Code generation error:', error);
            throw new Error(`Code generation error: ${error.message}`);
        }
    }

    async getCompletions(code, position = 0, language = 'javascript') {
        if (!this.model) {
            throw new Error('AI service not initialized. Please set your API key in settings.');
        }

        try {
            const beforeCursor = code.substring(0, position);
            const afterCursor = code.substring(position);

            const completionPrompt = `
You are an intelligent code completion assistant for ${language}. 
Complete the following code at the cursor position marked with <CURSOR>:

${beforeCursor}<CURSOR>${afterCursor}

Provide up to 3 different completion suggestions that:
- Are syntactically correct
- Follow ${language} best practices
- Are contextually appropriate
- Are concise and useful

Return only the completion text for each suggestion, one per line:`;

            const result = await this.model.generateContent(completionPrompt);
            const response = await result.response;
            const text = response.text();

            return text.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .slice(0, 3);
        } catch (error) {
            console.error('Completion error:', error);
            throw new Error(`Completion error: ${error.message}`);
        }
    }

    async explainCode(code, language = 'javascript') {
        if (!this.model) {
            throw new Error('AI service not initialized. Please set your API key in settings.');
        }

        try {
            const explanationPrompt = `
Explain the following ${language} code in a clear and concise manner:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. A brief overview of what the code does
2. Explanation of key components/functions
3. Any notable patterns or techniques used
4. Potential improvements or concerns

Keep the explanation accessible but technically accurate.`;

            const result = await this.model.generateContent(explanationPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Code explanation error:', error);
            throw new Error(`Code explanation error: ${error.message}`);
        }
    }

    async refactorCode(code, language = 'javascript', instructions = '') {
        if (!this.model) {
            throw new Error('AI service not initialized. Please set your API key in settings.');
        }

        try {
            const refactorPrompt = `
Refactor the following ${language} code to improve it:

\`\`\`${language}
${code}
\`\`\`

${instructions ? `Specific instructions: ${instructions}` : ''}

Focus on:
- Code readability and maintainability
- Performance improvements
- Best practices for ${language}
- Proper error handling
- Clean code principles

Return the refactored code with comments explaining the changes:`;

            const result = await this.model.generateContent(refactorPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Refactoring error:', error);
            throw new Error(`Refactoring error: ${error.message}`);
        }
    }

    buildChatPrompt(message, context, history) {
        let prompt = 'You are Neon Agent, an expert AI coding assistant integrated into VS Code. ';
        prompt += 'You help developers with coding tasks, debugging, code review, and technical questions. ';
        prompt += 'Provide helpful, accurate, and actionable responses.\n\n';

        if (context) {
            prompt += `Context: ${context}\n\n`;
        }

        if (history && history.length > 0) {
            prompt += 'Conversation history:\n';
            history.forEach((item, index) => {
                prompt += `${index + 1}. User: ${item.user}\n`;
                prompt += `   Assistant: ${item.assistant}\n`;
            });
            prompt += '\n';
        }

        prompt += `User: ${message}\n\nAssistant:`;
        return prompt;
    }

    extractCode(text) {
        // Extract code from markdown code blocks
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
        const matches = text.match(codeBlockRegex);

        if (matches && matches.length > 0) {
            return matches[0].replace(/```[\w]*\n/, '').replace(/\n```$/, '');
        }

        return text;
    }

    async testConnection() {
        try {
            if (!this.model) {
                throw new Error('Model not initialized');
            }

            const result = await this.model.generateContent('Hello! Please respond with "Connection successful"');
            const response = await result.response;
            return response.text().includes('Connection successful');
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}

module.exports = { AIService };
