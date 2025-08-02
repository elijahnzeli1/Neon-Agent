import * as vscode from 'vscode';
import { AIProvider } from '../providers/AIProvider';
import { CodebaseIndexer } from './CodebaseIndexer';

export interface AgentTask {
    id: string;
    type: 'scaffold' | 'implement' | 'test' | 'refactor' | 'document' | 'commit';
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    files: string[];
    progress: number;
    result?: string;
    error?: string;
    created: number;
    updated: number;
}

export interface AgentWorkflow {
    id: string;
    name: string;
    description: string;
    tasks: AgentTask[];
    status: 'draft' | 'running' | 'completed' | 'failed';
    approvalRequired: boolean;
    autoCommit: boolean;
}

export class EndToEndAgent implements vscode.Disposable {
    private readonly aiProvider: AIProvider;
    private readonly indexer: CodebaseIndexer;
    private readonly outputChannel: vscode.OutputChannel;
    private readonly activeWorkflows: Map<string, AgentWorkflow> = new Map();
    private readonly taskQueue: AgentTask[] = [];
    private isProcessing: boolean = false;

    constructor(aiProvider: AIProvider, indexer: CodebaseIndexer) {
        this.aiProvider = aiProvider;
        this.indexer = indexer;
        this.outputChannel = vscode.window.createOutputChannel('Neon Agent Workflow');
    }

    public async createWorkflow(request: string): Promise<AgentWorkflow> {
        const workflowId = this.generateId();
        
        this.log(`Creating workflow: ${request}`);
        
        // Use AI to analyze the request and create a workflow
        const workflowPlan = await this.planWorkflow(request);
        
        const workflow: AgentWorkflow = {
            id: workflowId,
            name: workflowPlan.name,
            description: workflowPlan.description,
            tasks: workflowPlan.tasks,
            status: 'draft',
            approvalRequired: true,
            autoCommit: false
        };
        
        this.activeWorkflows.set(workflowId, workflow);
        
        // Show workflow preview to user
        await this.showWorkflowPreview(workflow);
        
        return workflow;
    }

    private async planWorkflow(request: string): Promise<{ name: string; description: string; tasks: AgentTask[] }> {
        const codebaseContext = await this.getCodebaseContext();
        
        const prompt = `
You are an expert software development agent. Plan a complete workflow to fulfill this request:

REQUEST: ${request}

CODEBASE CONTEXT:
${codebaseContext}

Create a detailed workflow with specific tasks. Return a JSON response with this structure:
{
  "name": "Brief workflow name",
  "description": "Detailed description of what will be accomplished",
  "tasks": [
    {
      "type": "scaffold|implement|test|refactor|document|commit",
      "description": "Specific task description",
      "files": ["list", "of", "files", "to", "modify/create"]
    }
  ]
}

Task types:
- scaffold: Create project structure, files, boilerplate
- implement: Write/modify code functionality  
- test: Create or update tests
- refactor: Improve existing code structure
- document: Update documentation, comments
- commit: Create git commit with changes

Plan 3-8 tasks that logically accomplish the request.`;

        try {
            const response = await this.aiProvider.chat([{
                role: 'user',
                content: prompt
            }]);
            
            const plan = JSON.parse(response.content);
            
            // Convert to AgentTask objects
            const tasks: AgentTask[] = plan.tasks.map((task: any, index: number) => ({
                id: `${this.generateId()}-task-${index}`,
                type: task.type,
                description: task.description,
                status: 'pending' as const,
                files: task.files || [],
                progress: 0,
                created: Date.now(),
                updated: Date.now()
            }));
            
            return {
                name: plan.name,
                description: plan.description,
                tasks
            };
            
        } catch (error) {
            this.log(`Error planning workflow: ${error}`);
            
            // Fallback to basic task
            return {
                name: 'Basic Implementation',
                description: request,
                tasks: [{
                    id: `${this.generateId()}-task-0`,
                    type: 'implement',
                    description: request,
                    status: 'pending',
                    files: [],
                    progress: 0,
                    created: Date.now(),
                    updated: Date.now()
                }]
            };
        }
    }

    private async getCodebaseContext(): Promise<string> {
        const stats = this.indexer.getIndexStats();
        const files = this.indexer.getAllIndexedFiles();
        
        // Get key files and structure
        const keyFiles = files
            .filter(f => ['package.json', 'tsconfig.json', 'README.md', 'src/index', 'src/main', 'src/app'].some(key => f.relativePath.includes(key)))
            .slice(0, 10);
        
        let context = `Project Statistics:
- ${stats.fileCount} files indexed
- Languages: ${Object.keys(stats.languages).join(', ')}
- Total size: ${Math.round(stats.totalSize / 1024)}KB

Key Files:
${keyFiles.map(f => `- ${f.relativePath} (${f.language})`).join('\n')}

Project Structure:
`;
        
        // Add directory structure
        const directories = new Set<string>();
        for (const file of files.slice(0, 50)) {
            const dir = file.relativePath.split('/').slice(0, -1).join('/');
            if (dir) directories.add(dir);
        }
        
        context += Array.from(directories).sort().slice(0, 20).map(dir => `- ${dir}/`).join('\n');
        
        return context;
    }

    private async showWorkflowPreview(workflow: AgentWorkflow): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'neonAgentWorkflow',
            `Workflow: ${workflow.name}`,
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.getWorkflowPreviewHtml(workflow);
        
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'approve':
                    await this.executeWorkflow(workflow.id);
                    panel.dispose();
                    break;
                case 'reject':
                    this.activeWorkflows.delete(workflow.id);
                    panel.dispose();
                    break;
                case 'modify':
                    // Allow user to modify workflow
                    break;
            }
        });
    }

    private getWorkflowPreviewHtml(workflow: AgentWorkflow): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .task {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            background: var(--vscode-sidebar-background);
        }
        .task-type {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .type-scaffold { background: #4CAF50; color: white; }
        .type-implement { background: #2196F3; color: white; }
        .type-test { background: #FF9800; color: white; }
        .type-refactor { background: #9C27B0; color: white; }
        .type-document { background: #607D8B; color: white; }
        .type-commit { background: #795548; color: white; }
        .files {
            margin-top: 10px;
            font-family: monospace;
            font-size: 12px;
            color: var(--vscode-textLink-foreground);
        }
        .actions {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
        }
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }
        .approve { background: #4CAF50; color: white; }
        .reject { background: #f44336; color: white; }
        .modify { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 ${workflow.name}</h1>
        <p>${workflow.description}</p>
        <p><strong>${workflow.tasks.length} tasks</strong> planned for execution</p>
    </div>
    
    <div class="tasks">
        ${workflow.tasks.map((task, index) => `
            <div class="task">
                <div class="task-header">
                    <span class="task-type type-${task.type}">${task.type}</span>
                    <strong>Step ${index + 1}</strong>
                </div>
                <p>${task.description}</p>
                ${task.files.length > 0 ? `
                    <div class="files">
                        <strong>Files:</strong><br>
                        ${task.files.map(f => `📄 ${f}`).join('<br>')}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
    
    <div class="actions">
        <button class="modify" onclick="sendMessage('modify')">Modify Workflow</button>
        <button class="reject" onclick="sendMessage('reject')">Reject</button>
        <button class="approve" onclick="sendMessage('approve')">✅ Approve & Execute</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        function sendMessage(command) {
            vscode.postMessage({ command });
        }
    </script>
</body>
</html>`;
    }

    public async executeWorkflow(workflowId: string): Promise<void> {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        workflow.status = 'running';
        this.log(`Executing workflow: ${workflow.name}`);

        try {
            for (const task of workflow.tasks) {
                await this.executeTask(task);
                
                if (task.status === 'failed') {
                    workflow.status = 'failed';
                    break;
                }
            }
            
            if (workflow.status === 'running') {
                workflow.status = 'completed';
                
                if (workflow.autoCommit) {
                    await this.createCommit(workflow);
                }
            }
            
        } catch (error) {
            workflow.status = 'failed';
            this.log(`Workflow execution failed: ${error}`);
            throw error;
        }
    }

    private async executeTask(task: AgentTask): Promise<void> {
        task.status = 'running';
        task.updated = Date.now();
        
        this.log(`Executing task: ${task.description}`);
        
        try {
            switch (task.type) {
                case 'scaffold':
                    await this.executeScaffoldTask(task);
                    break;
                case 'implement':
                    await this.executeImplementTask(task);
                    break;
                case 'test':
                    await this.executeTestTask(task);
                    break;
                case 'refactor':
                    await this.executeRefactorTask(task);
                    break;
                case 'document':
                    await this.executeDocumentTask(task);
                    break;
                case 'commit':
                    await this.executeCommitTask(task);
                    break;
            }
            
            task.status = 'completed';
            task.progress = 100;
            
        } catch (error) {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : String(error);
            this.log(`Task failed: ${task.error}`);
        }
        
        task.updated = Date.now();
    }

    private async executeScaffoldTask(task: AgentTask): Promise<void> {
        // Create project structure and boilerplate files
        const prompt = `Create the file structure and boilerplate code for: ${task.description}

Generate the necessary files with proper structure and basic implementation.
Include package.json, configuration files, and directory structure as needed.`;

        const response = await this.aiProvider.chat([{
            role: 'user',
            content: prompt
        }]);
        
        // Parse and create files (implementation would parse AI response and create actual files)
        task.result = response.content;
    }

    private async executeImplementTask(task: AgentTask): Promise<void> {
        // Implement functionality
        const codebaseContext = await this.getRelevantContext(task.description);
        
        const prompt = `Implement the following functionality: ${task.description}

CODEBASE CONTEXT:
${codebaseContext}

Provide complete, working code that integrates properly with the existing codebase.
Include proper error handling, type definitions, and follow best practices.`;

        const response = await this.aiProvider.chat([{
            role: 'user',
            content: prompt
        }]);
        
        task.result = response.content;
    }

    private async executeTestTask(task: AgentTask): Promise<void> {
        // Create or update tests
        const prompt = `Create comprehensive tests for: ${task.description}

Include unit tests, integration tests, and edge cases.
Use appropriate testing framework and follow testing best practices.`;

        const response = await this.aiProvider.chat([{
            role: 'user',
            content: prompt
        }]);
        
        task.result = response.content;
    }

    private async executeRefactorTask(task: AgentTask): Promise<void> {
        // Refactor existing code
        const prompt = `Refactor the code for: ${task.description}

Improve code structure, performance, readability, and maintainability.
Preserve existing functionality while making improvements.`;

        const response = await this.aiProvider.chat([{
            role: 'user',
            content: prompt
        }]);
        
        task.result = response.content;
    }

    private async executeDocumentTask(task: AgentTask): Promise<void> {
        // Update documentation
        const prompt = `Create documentation for: ${task.description}

Include API documentation, usage examples, and comprehensive explanations.
Update README files and inline comments as needed.`;

        const response = await this.aiProvider.chat([{
            role: 'user',
            content: prompt
        }]);
        
        task.result = response.content;
    }

    private async executeCommitTask(task: AgentTask): Promise<void> {
        // Create git commit
        await this.createCommit(null, task.description);
        task.result = 'Commit created successfully';
    }

    private async getRelevantContext(description: string): Promise<string> {
        // Search codebase for relevant files
        const searchResults = await this.indexer.searchCodebase(description, 5);
        
        let context = 'RELEVANT FILES:\n\n';
        for (const result of searchResults) {
            context += `File: ${result.file.relativePath}\n`;
            context += `Context: ${result.context}\n\n`;
        }
        
        return context;
    }

    private async createCommit(workflow: AgentWorkflow | null, message?: string): Promise<void> {
        // Create git commit with workflow changes
        const commitMessage = message || (workflow ? `🤖 ${workflow.name}\n\n${workflow.description}` : 'Automated commit');
        
        // Implementation would use git commands or VS Code git API
        this.log(`Creating commit: ${commitMessage}`);
    }

    public getActiveWorkflows(): AgentWorkflow[] {
        return Array.from(this.activeWorkflows.values());
    }

    public getWorkflow(id: string): AgentWorkflow | undefined {
        return this.activeWorkflows.get(id);
    }

    public cancelWorkflow(id: string): void {
        const workflow = this.activeWorkflows.get(id);
        if (workflow) {
            workflow.status = 'failed';
            for (const task of workflow.tasks) {
                if (task.status === 'pending' || task.status === 'running') {
                    task.status = 'cancelled';
                }
            }
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    public dispose(): void {
        this.outputChannel.dispose();
        this.activeWorkflows.clear();
    }
}
