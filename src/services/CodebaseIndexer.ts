import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface IndexedFile {
    path: string;
    relativePath: string;
    language: string;
    content: string;
    functions: string[];
    classes: string[];
    imports: string[];
    exports: string[];
    lastModified: number;
    size: number;
}

export interface SearchResult {
    file: IndexedFile;
    relevance: number;
    matches: string[];
    context: string;
}

export class CodebaseIndexer implements vscode.Disposable {
    private readonly outputChannel: vscode.OutputChannel;
    private readonly indexedFiles: Map<string, IndexedFile> = new Map();
    private readonly fileWatcher: vscode.FileSystemWatcher;
    private readonly excludePatterns: string[] = [
        '**/node_modules/**',
        '**/dist/**',
        '**/out/**',
        '**/build/**',
        '**/.git/**',
        '**/.vscode/**',
        '**/coverage/**',
        '**/*.min.js',
        '**/*.map',
        '**/package-lock.json',
        '**/yarn.lock'
    ];

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent Indexer');
        
        // Watch for file changes
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);
        this.fileWatcher.onDidCreate(this.onFileCreated.bind(this));
        this.fileWatcher.onDidChange(this.onFileChanged.bind(this));
        this.fileWatcher.onDidDelete(this.onFileDeleted.bind(this));
        
        // Initial indexing
        this.indexWorkspace();
    }

    private async indexWorkspace(): Promise<void> {
        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        this.log('Starting workspace indexing...');
        
        for (const folder of vscode.workspace.workspaceFolders) {
            await this.indexDirectory(folder.uri.fsPath);
        }
        
        this.log(`Indexing complete. ${this.indexedFiles.size} files indexed.`);
    }

    private async indexDirectory(dirPath: string): Promise<void> {
        try {
            const files = await vscode.workspace.findFiles(
                '**/*',
                `{${this.excludePatterns.join(',')}}`
            );

            for (const file of files) {
                await this.indexFile(file.fsPath);
            }
        } catch (error) {
            this.log(`Error indexing directory ${dirPath}: ${error}`);
        }
    }

    private async indexFile(filePath: string): Promise<void> {
        try {
            const stat = await fs.promises.stat(filePath);
            
            // Skip large files (>1MB)
            if (stat.size > 1024 * 1024) {
                return;
            }

            const content = await fs.promises.readFile(filePath, 'utf8');
            const language = this.detectLanguage(filePath);
            const relativePath = vscode.workspace.asRelativePath(filePath);

            const indexedFile: IndexedFile = {
                path: filePath,
                relativePath,
                language,
                content,
                functions: this.extractFunctions(content, language),
                classes: this.extractClasses(content, language),
                imports: this.extractImports(content, language),
                exports: this.extractExports(content, language),
                lastModified: stat.mtime.getTime(),
                size: stat.size
            };

            this.indexedFiles.set(filePath, indexedFile);
        } catch (error) {
            this.log(`Error indexing file ${filePath}: ${error}`);
        }
    }

    private detectLanguage(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap: { [key: string]: string } = {
            '.js': 'javascript',
            '.jsx': 'javascriptreact',
            '.ts': 'typescript',
            '.tsx': 'typescriptreact',
            '.py': 'python',
            '.java': 'java',
            '.cs': 'csharp',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.json': 'json',
            '.yml': 'yaml',
            '.yaml': 'yaml',
            '.xml': 'xml',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'sass',
            '.less': 'less',
            '.md': 'markdown',
            '.sql': 'sql',
            '.sh': 'shell',
            '.bash': 'shell',
            '.ps1': 'powershell'
        };
        
        return languageMap[ext] || 'plaintext';
    }

    private extractFunctions(content: string, language: string): string[] {
        const functions: string[] = [];
        
        try {
            switch (language) {
                case 'javascript':
                case 'typescript':
                case 'javascriptreact':
                case 'typescriptreact':
                    const jsRegex = /(?:function\s+(\w+)|(\w+)\s*(?:=|:)\s*(?:function|\([^)]*\)\s*=>)|class\s+\w+\s*{[^}]*(\w+)\s*\([^)]*\))/g;
                    let match;
                    while ((match = jsRegex.exec(content)) !== null) {
                        functions.push(match[1] || match[2] || match[3]);
                    }
                    break;
                    
                case 'python':
                    const pyRegex = /def\s+(\w+)/g;
                    while ((match = pyRegex.exec(content)) !== null) {
                        functions.push(match[1]);
                    }
                    break;
                    
                case 'java':
                case 'csharp':
                    const javaRegex = /(?:public|private|protected|static)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/g;
                    while ((match = javaRegex.exec(content)) !== null) {
                        functions.push(match[1]);
                    }
                    break;
            }
        } catch (error) {
            this.log(`Error extracting functions: ${error}`);
        }
        
        return functions;
    }

    private extractClasses(content: string, language: string): string[] {
        const classes: string[] = [];
        
        try {
            switch (language) {
                case 'javascript':
                case 'typescript':
                case 'javascriptreact':
                case 'typescriptreact':
                    const jsRegex = /class\s+(\w+)/g;
                    let match;
                    while ((match = jsRegex.exec(content)) !== null) {
                        classes.push(match[1]);
                    }
                    break;
                    
                case 'python':
                    const pyRegex = /class\s+(\w+)/g;
                    while ((match = pyRegex.exec(content)) !== null) {
                        classes.push(match[1]);
                    }
                    break;
                    
                case 'java':
                case 'csharp':
                    const javaRegex = /(?:public|private|protected)?\s*class\s+(\w+)/g;
                    while ((match = javaRegex.exec(content)) !== null) {
                        classes.push(match[1]);
                    }
                    break;
            }
        } catch (error) {
            this.log(`Error extracting classes: ${error}`);
        }
        
        return classes;
    }

    private extractImports(content: string, language: string): string[] {
        const imports: string[] = [];
        
        try {
            switch (language) {
                case 'javascript':
                case 'typescript':
                case 'javascriptreact':
                case 'typescriptreact':
                    const jsRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
                    let match;
                    while ((match = jsRegex.exec(content)) !== null) {
                        imports.push(match[1]);
                    }
                    break;
                    
                case 'python':
                    const pyRegex = /(?:import\s+(\w+)|from\s+(\w+)\s+import)/g;
                    while ((match = pyRegex.exec(content)) !== null) {
                        imports.push(match[1] || match[2]);
                    }
                    break;
                    
                case 'java':
                    const javaRegex = /import\s+([\w.]+)/g;
                    while ((match = javaRegex.exec(content)) !== null) {
                        imports.push(match[1]);
                    }
                    break;
            }
        } catch (error) {
            this.log(`Error extracting imports: ${error}`);
        }
        
        return imports;
    }

    private extractExports(content: string, language: string): string[] {
        const exports: string[] = [];
        
        try {
            switch (language) {
                case 'javascript':
                case 'typescript':
                case 'javascriptreact':
                case 'typescriptreact':
                    const jsRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)?\s*(\w+)/g;
                    let match;
                    while ((match = jsRegex.exec(content)) !== null) {
                        exports.push(match[1]);
                    }
                    break;
                    
                case 'python':
                    // Python doesn't have explicit exports, consider top-level functions/classes
                    exports.push(...this.extractFunctions(content, language));
                    exports.push(...this.extractClasses(content, language));
                    break;
            }
        } catch (error) {
            this.log(`Error extracting exports: ${error}`);
        }
        
        return exports;
    }

    public async searchCodebase(query: string, maxResults: number = 10): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const queryLower = query.toLowerCase();
        
        for (const [filePath, file] of this.indexedFiles) {
            const relevance = this.calculateRelevance(query, file);
            
            if (relevance > 0) {
                const matches = this.findMatches(query, file);
                const context = this.extractContext(query, file);
                
                results.push({
                    file,
                    relevance,
                    matches,
                    context
                });
            }
        }
        
        // Sort by relevance and return top results
        return results
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, maxResults);
    }

    private calculateRelevance(query: string, file: IndexedFile): number {
        let relevance = 0;
        const queryLower = query.toLowerCase();
        const contentLower = file.content.toLowerCase();
        
        // Exact matches in file name (highest priority)
        if (file.relativePath.toLowerCase().includes(queryLower)) {
            relevance += 100;
        }
        
        // Matches in functions/classes (high priority)
        for (const func of file.functions) {
            if (func.toLowerCase().includes(queryLower)) {
                relevance += 50;
            }
        }
        
        for (const cls of file.classes) {
            if (cls.toLowerCase().includes(queryLower)) {
                relevance += 50;
            }
        }
        
        // Matches in imports/exports (medium priority)
        for (const imp of file.imports) {
            if (imp.toLowerCase().includes(queryLower)) {
                relevance += 25;
            }
        }
        
        for (const exp of file.exports) {
            if (exp.toLowerCase().includes(queryLower)) {
                relevance += 25;
            }
        }
        
        // Content matches (lower priority, but frequent)
        const contentMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
        relevance += contentMatches * 2;
        
        // Boost for recent files
        const daysSinceModified = (Date.now() - file.lastModified) / (1000 * 60 * 60 * 24);
        if (daysSinceModified < 7) {
            relevance *= 1.5;
        }
        
        return relevance;
    }

    private findMatches(query: string, file: IndexedFile): string[] {
        const matches: string[] = [];
        const queryLower = query.toLowerCase();
        
        // Find matching functions
        for (const func of file.functions) {
            if (func.toLowerCase().includes(queryLower)) {
                matches.push(`function: ${func}`);
            }
        }
        
        // Find matching classes
        for (const cls of file.classes) {
            if (cls.toLowerCase().includes(queryLower)) {
                matches.push(`class: ${cls}`);
            }
        }
        
        return matches;
    }

    private extractContext(query: string, file: IndexedFile): string {
        const lines = file.content.split('\n');
        const queryLower = query.toLowerCase();
        const contextLines: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(queryLower)) {
                // Include surrounding context
                const start = Math.max(0, i - 2);
                const end = Math.min(lines.length - 1, i + 2);
                
                for (let j = start; j <= end; j++) {
                    const lineNum = j + 1;
                    const prefix = j === i ? '→ ' : '  ';
                    contextLines.push(`${prefix}${lineNum}: ${lines[j]}`);
                }
                
                if (contextLines.length >= 10) {
                    break; // Limit context size
                }
            }
        }
        
        return contextLines.join('\n');
    }

    public getFileIndex(filePath: string): IndexedFile | undefined {
        return this.indexedFiles.get(filePath);
    }

    public getAllIndexedFiles(): IndexedFile[] {
        return Array.from(this.indexedFiles.values());
    }

    public getIndexStats(): { fileCount: number; totalSize: number; languages: { [key: string]: number } } {
        const stats = {
            fileCount: this.indexedFiles.size,
            totalSize: 0,
            languages: {} as { [key: string]: number }
        };
        
        for (const file of this.indexedFiles.values()) {
            stats.totalSize += file.size;
            stats.languages[file.language] = (stats.languages[file.language] || 0) + 1;
        }
        
        return stats;
    }

    private async onFileCreated(uri: vscode.Uri): Promise<void> {
        await this.indexFile(uri.fsPath);
    }

    private async onFileChanged(uri: vscode.Uri): Promise<void> {
        await this.indexFile(uri.fsPath);
    }

    private onFileDeleted(uri: vscode.Uri): void {
        this.indexedFiles.delete(uri.fsPath);
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public dispose(): void {
        this.fileWatcher.dispose();
        this.outputChannel.dispose();
        this.indexedFiles.clear();
    }
}
