import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIProviderConfig {
    provider: 'openai' | 'anthropic' | 'google' | 'local';
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export class AIProvider implements vscode.Disposable {
    private openaiClient: OpenAI | null = null;
    private anthropicClient: Anthropic | null = null;
    private googleClient: GoogleGenerativeAI | null = null;
    private config: AIProviderConfig;
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent AI');
        this.config = this.loadConfiguration();
        this.initializeClients();
        
        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('neonAgent')) {
                this.config = this.loadConfiguration();
                this.initializeClients();
            }
        });
    }

    private loadConfiguration(): AIProviderConfig {
        const config = vscode.workspace.getConfiguration('neonAgent');
        
        return {
            provider: config.get('ai.provider', 'openai'),
            apiKey: config.get('ai.apiKey', process.env.NEON_AGENT_API_KEY),
            model: config.get('ai.model', this.getDefaultModel(config.get('ai.provider', 'openai'))),
            baseUrl: config.get('ai.baseUrl'),
            temperature: config.get('ai.temperature', 0.7),
            maxTokens: config.get('ai.maxTokens', 2048)
        };
    }

    private getDefaultModel(provider: string): string {
        switch (provider) {
            case 'openai': return 'gpt-4';
            case 'anthropic': return 'claude-3-sonnet-20240229';
            case 'google': return 'gemini-pro';
            case 'local': return 'llama2';
            default: return 'gpt-4';
        }
    }

    private initializeClients(): void {
        try {
            switch (this.config.provider) {
                case 'openai':
                    if (this.config.apiKey) {
                        this.openaiClient = new OpenAI({
                            apiKey: this.config.apiKey,
                            baseURL: this.config.baseUrl
                        });
                        this.log('OpenAI client initialized');
                    }
                    break;

                case 'anthropic':
                    if (this.config.apiKey) {
                        this.anthropicClient = new Anthropic({
                            apiKey: this.config.apiKey
                        });
                        this.log('Anthropic client initialized');
                    }
                    break;

                case 'google':
                    if (this.config.apiKey) {
                        this.googleClient = new GoogleGenerativeAI(this.config.apiKey);
                        this.log('Google AI client initialized');
                    }
                    break;

                case 'local':
                    this.log('Local model configuration loaded');
                    break;
            }
        } catch (error) {
            this.log(`Failed to initialize ${this.config.provider} client: ${error}`);
        }
    }

    public async chat(messages: ChatMessage[], signal?: AbortSignal): Promise<AIResponse> {
        if (!this.config.apiKey && this.config.provider !== 'local') {
            throw new Error(`API key not configured for ${this.config.provider}`);
        }

        try {
            switch (this.config.provider) {
                case 'openai':
                    return await this.chatWithOpenAI(messages, signal);
                case 'anthropic':
                    return await this.chatWithAnthropic(messages, signal);
                case 'google':
                    return await this.chatWithGoogle(messages, signal);
                case 'local':
                    return await this.chatWithLocal(messages, signal);
                default:
                    throw new Error(`Unsupported provider: ${this.config.provider}`);
            }
        } catch (error) {
            this.log(`Chat error: ${error}`);
            throw error;
        }
    }

    private async chatWithOpenAI(messages: ChatMessage[], signal?: AbortSignal): Promise<AIResponse> {
        if (!this.openaiClient) {
            throw new Error('OpenAI client not initialized');
        }

        const response = await this.openaiClient.chat.completions.create({
            model: this.config.model || 'gpt-4',
            messages: messages as any,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens
        }, { signal });

        return {
            content: response.choices[0]?.message?.content || '',
            usage: response.usage ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens
            } : undefined
        };
    }

    private async chatWithAnthropic(messages: ChatMessage[], signal?: AbortSignal): Promise<AIResponse> {
        if (!this.anthropicClient) {
            throw new Error('Anthropic client not initialized');
        }

        // Convert messages format for Anthropic
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const conversationMessages = messages.filter(m => m.role !== 'system');

        const response = await this.anthropicClient.messages.create({
            model: this.config.model || 'claude-3-sonnet-20240229',
            max_tokens: this.config.maxTokens || 2048,
            temperature: this.config.temperature,
            system: systemMessage,
            messages: conversationMessages as any
        });

        return {
            content: response.content[0]?.type === 'text' ? response.content[0].text : '',
            usage: response.usage ? {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens
            } : undefined
        };
    }

    private async chatWithGoogle(messages: ChatMessage[], signal?: AbortSignal): Promise<AIResponse> {
        if (!this.googleClient) {
            throw new Error('Google AI client not initialized');
        }

        const model = this.googleClient.getGenerativeModel({ model: this.config.model || 'gemini-pro' });
        
        // Convert messages to Google format
        const history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const lastMessage = messages[messages.length - 1];
        
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage.content);
        const response = await result.response;

        return {
            content: response.text()
        };
    }

    private async chatWithLocal(messages: ChatMessage[], signal?: AbortSignal): Promise<AIResponse> {
        // Implement local model integration (e.g., Ollama, llamafile)
        const baseUrl = this.config.baseUrl || 'http://localhost:11434';
        
        return new Promise((resolve, reject) => {
            const url = new URL('/api/chat', baseUrl);
            const postData = JSON.stringify({
                model: this.config.model || 'llama2',
                messages,
                stream: false,
                options: {
                    temperature: this.config.temperature,
                    num_predict: this.config.maxTokens
                }
            });

            const requestModule = url.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = requestModule.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const data = JSON.parse(responseData);
                            resolve({
                                content: data.message?.content || ''
                            });
                        } catch (error) {
                            reject(new Error(`Failed to parse response: ${error}`));
                        }
                    } else {
                        reject(new Error(`Local model request failed: ${res.statusCode} ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            if (signal) {
                signal.addEventListener('abort', () => {
                    req.destroy();
                    reject(new Error('Request aborted'));
                });
            }

            req.write(postData);
            req.end();
        });
    }

    public async getCodeCompletion(
        code: string, 
        context: string, 
        language: string, 
        signal?: AbortSignal
    ): Promise<string[]> {
        const prompt = this.buildCompletionPrompt(code, context, language);
        
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Provide intelligent code completions that are contextually appropriate, follow best practices, and match the existing code style. Return only the completion text without explanations.`
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        try {
            const response = await this.chat(messages, signal);
            
            // Parse multiple suggestions if available
            const suggestions = response.content
                .split('\n---\n')
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .slice(0, 3); // Limit to 3 suggestions

            return suggestions.length > 0 ? suggestions : [response.content.trim()];
        } catch (error) {
            this.log(`Code completion error: ${error}`);
            return [];
        }
    }

    private buildCompletionPrompt(code: string, context: string, language: string): string {
        return `Complete the following ${language} code. Consider the context and provide a natural continuation:

Context:
\`\`\`${language}
${context}
\`\`\`

Code to complete (cursor is at the end):
\`\`\`${language}
${code}
\`\`\`

Provide up to 3 different completion suggestions, separated by "---" if multiple options are appropriate. Focus on:
1. Contextual relevance
2. Code quality and best practices
3. Consistency with existing patterns
4. Proper ${language} syntax

Completion:`;
    }

    public async explainCode(code: string, language: string): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: 'You are an expert code reviewer and educator. Explain code clearly and comprehensively.'
            },
            {
                role: 'user',
                content: `Explain this ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Overview of what the code does
2. Step-by-step breakdown
3. Key concepts and patterns used
4. Potential improvements or concerns`
            }
        ];

        const response = await this.chat(messages);
        return response.content;
    }

    public async findBugs(code: string, language: string): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: 'You are an expert code auditor. Analyze code for bugs, security issues, and potential problems.'
            },
            {
                role: 'user',
                content: `Analyze this ${language} code for bugs and issues:

\`\`\`${language}
${code}
\`\`\`

Please identify:
1. Potential bugs or errors
2. Security vulnerabilities
3. Performance issues
4. Code quality problems
5. Suggested fixes for each issue`
            }
        ];

        const response = await this.chat(messages);
        return response.content;
    }

    public async generateTests(code: string, language: string): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are an expert test engineer. Generate comprehensive tests for ${language} code.`
            },
            {
                role: 'user',
                content: `Generate unit tests for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Comprehensive test cases covering normal and edge cases
2. Proper test structure and naming
3. Mock/stub examples where needed
4. Test data setup and teardown
5. Use appropriate testing framework for ${language}`
            }
        ];

        const response = await this.chat(messages);
        return response.content;
    }

    public isConfigured(): boolean {
        return !!(this.config.apiKey || this.config.provider === 'local');
    }

    public getProviderInfo(): string {
        return `${this.config.provider} (${this.config.model})`;
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
function fetch(arg0: string, arg1: { method: string; headers: { 'Content-Type': string; }; body: string; signal: AbortSignal | undefined; }) {
    throw new Error('Function not implemented.');
}

