import * as vscode from 'vscode';
import { AIProvider } from './AIProvider';

interface CompletionCache {
    [key: string]: {
        items: vscode.InlineCompletionItem[];
        timestamp: number;
    };
}

export class AICompletionProvider implements vscode.InlineCompletionItemProvider, vscode.Disposable {
    private readonly aiProvider: AIProvider;
    private readonly cache: CompletionCache = {};
    private readonly cacheTimeout = 30000; // 30 seconds
    private readonly debounceTimeout = 300; // 300ms
    private debounceTimer: NodeJS.Timeout | null = null;
    private isEnabled: boolean = true;

    constructor(aiProvider: AIProvider) {
        this.aiProvider = aiProvider;
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
        
        if (!this.isEnabled || token.isCancellationRequested) {
            return null;
        }

        // Check configuration
        const config = vscode.workspace.getConfiguration('neonAgent');
        if (!config.get('completion.enabled', true)) {
            return null;
        }

        // Don't provide completions for very short text
        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);
        
        if (textBeforeCursor.trim().length < 2) {
            return null;
        }

        // Generate cache key
        const cacheKey = this.generateCacheKey(document, position, textBeforeCursor);
        
        // Check cache first
        const cached = this.getCachedCompletion(cacheKey);
        if (cached) {
            return cached;
        }

        // Debounce rapid requests
        return new Promise((resolve) => {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
                try {
                    const completions = await this.generateCompletions(document, position, textBeforeCursor, token);
                    
                    if (completions && completions.length > 0) {
                        this.cacheCompletion(cacheKey, completions);
                    }
                    
                    resolve(completions);
                } catch (error) {
                    console.error('AI completion error:', error);
                    resolve(null);
                }
            }, this.debounceTimeout);
        });
    }

    private async generateCompletions(
        document: vscode.TextDocument,
        position: vscode.Position,
        textBeforeCursor: string,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | null> {
        
        const context = this.buildContext(document, position);
        const language = document.languageId;
        
        try {
            // Convert VS Code CancellationToken to AbortSignal
            const abortController = new AbortController();
            const cancelListener = token.onCancellationRequested(() => {
                abortController.abort();
            });

            const suggestions = await this.aiProvider.getCodeCompletion(
                textBeforeCursor,
                context,
                language,
                abortController.signal
            );

            cancelListener.dispose();

            if (token.isCancellationRequested) {
                return null;
            }

            return suggestions.map(suggestion => new vscode.InlineCompletionItem(
                suggestion,
                new vscode.Range(position, position)
            ));

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return null; // Request was cancelled
            }
            
            console.error('Failed to generate AI completions:', error);
            return null;
        }
    }

    private buildContext(document: vscode.TextDocument, position: vscode.Position): string {
        const config = vscode.workspace.getConfiguration('neonAgent');
        const contextLines = config.get('completion.contextLines', 20);
        
        // Get context before current position
        const startLine = Math.max(0, position.line - contextLines);
        const endLine = Math.min(document.lineCount - 1, position.line + contextLines);
        
        let context = '';
        
        // Add preceding context
        for (let i = startLine; i < position.line; i++) {
            context += document.lineAt(i).text + '\n';
        }
        
        // Add current line up to cursor
        context += document.lineAt(position.line).text.substring(0, position.character);
        
        // Add following context (for better understanding)
        for (let i = position.line + 1; i <= endLine; i++) {
            context += '\n' + document.lineAt(i).text;
        }
        
        return context.trim();
    }

    private generateCacheKey(document: vscode.TextDocument, position: vscode.Position, text: string): string {
        const contextHash = this.hashString(this.buildContext(document, position));
        return `${document.uri.fsPath}:${position.line}:${position.character}:${this.hashString(text)}:${contextHash}`;
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    private getCachedCompletion(key: string): vscode.InlineCompletionItem[] | null {
        const cached = this.cache[key];
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.items;
        }
        
        // Clean up expired cache entry
        if (cached) {
            delete this.cache[key];
        }
        
        return null;
    }

    private cacheCompletion(key: string, items: vscode.InlineCompletionItem[]): void {
        this.cache[key] = {
            items,
            timestamp: Date.now()
        };
        
        // Periodically clean up old cache entries
        this.cleanupCache();
    }

    private cleanupCache(): void {
        const now = Date.now();
        const keys = Object.keys(this.cache);
        
        for (const key of keys) {
            if (now - this.cache[key].timestamp > this.cacheTimeout) {
                delete this.cache[key];
            }
        }
    }

    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        if (!enabled) {
            this.clearCache();
        }
    }

    public clearCache(): void {
        Object.keys(this.cache).forEach(key => delete this.cache[key]);
    }

    public dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.clearCache();
    }
}
