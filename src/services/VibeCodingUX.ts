import * as vscode from 'vscode';

export interface VibeSettings {
    enabled: boolean;
    focusMode: 'minimal' | 'distraction-free' | 'zen';
    visualFeedback: 'subtle' | 'moderate' | 'prominent';
    aiSuggestionStyle: 'inline' | 'popup' | 'sidebar';
    ambientSounds: boolean;
    flowStateTracking: boolean;
    productivityMetrics: boolean;
}

export interface FlowMetrics {
    sessionStart: number;
    sessionDuration: number;
    linesWritten: number;
    completionsAccepted: number;
    interruptionCount: number;
    focusScore: number;
    productivityLevel: 'low' | 'medium' | 'high' | 'flow';
}

export class VibeCodingUX implements vscode.Disposable {
    private readonly statusBarItem: vscode.StatusBarItem;
    private readonly settings: VibeSettings;
    private currentSession: FlowMetrics | null = null;
    private decorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({});
    private flowStateDecorations: vscode.TextEditorDecorationType[] = [];
    private readonly disposables: vscode.Disposable[] = [];
    private lastKeyPress: number = 0;
    private typingVelocity: number[] = [];

    constructor() {
        // Load settings
        this.settings = this.loadSettings();
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'neonAgent.toggleVibeMode';
        this.disposables.push(this.statusBarItem);

        // Create decoration types for flow state visualization
        this.createDecorationTypes();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateStatusBar();
        this.applyVibeMode();
    }

    private loadSettings(): VibeSettings {
        const config = vscode.workspace.getConfiguration('neonAgent.vibe');
        
        return {
            enabled: config.get('enabled', true),
            focusMode: config.get('focusMode', 'minimal'),
            visualFeedback: config.get('visualFeedback', 'subtle'),
            aiSuggestionStyle: config.get('aiSuggestionStyle', 'inline'),
            ambientSounds: config.get('ambientSounds', false),
            flowStateTracking: config.get('flowStateTracking', true),
            productivityMetrics: config.get('productivityMetrics', true)
        };
    }

    private createDecorationTypes(): void {
        // Subtle highlight for recently written code
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('neonAgent.recentCode.background'),
            borderRadius: '2px',
            after: {
                contentText: '',
                margin: '0 0 0 10px'
            }
        });

        // Flow state indicators
        this.flowStateDecorations = [
            // Low flow
            vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: '◯',
                    color: new vscode.ThemeColor('neonAgent.flow.low'),
                    margin: '0 5px 0 0'
                }
            }),
            // Medium flow
            vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: '◐',
                    color: new vscode.ThemeColor('neonAgent.flow.medium'),
                    margin: '0 5px 0 0'
                }
            }),
            // High flow
            vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: '●',
                    color: new vscode.ThemeColor('neonAgent.flow.high'),
                    margin: '0 5px 0 0'
                }
            }),
            // Flow state
            vscode.window.createTextEditorDecorationType({
                before: {
                    contentText: '✦',
                    color: new vscode.ThemeColor('neonAgent.flow.state'),
                    margin: '0 5px 0 0'
                }
            })
        ];
    }

    private setupEventListeners(): void {
        // Track typing for flow state
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(this.onTextChange.bind(this)),
            vscode.window.onDidChangeActiveTextEditor(this.onEditorChange.bind(this)),
            vscode.workspace.onDidChangeConfiguration(this.onConfigChange.bind(this))
        );

        // Track focus for interruption detection
        this.disposables.push(
            vscode.window.onDidChangeWindowState(this.onWindowStateChange.bind(this))
        );
    }

    private onTextChange(event: vscode.TextDocumentChangeEvent): void {
        if (!this.settings.enabled || !this.currentSession) {
            return;
        }

        const now = Date.now();
        const timeSinceLastKeyPress = now - this.lastKeyPress;
        
        // Track typing velocity
        if (timeSinceLastKeyPress < 2000) { // Within 2 seconds
            this.typingVelocity.push(timeSinceLastKeyPress);
            if (this.typingVelocity.length > 10) {
                this.typingVelocity.shift(); // Keep only last 10 intervals
            }
        }

        this.lastKeyPress = now;

        // Update session metrics
        for (const change of event.contentChanges) {
            if (change.text.includes('\n')) {
                this.currentSession.linesWritten++;
            }
        }

        // Apply visual feedback
        this.applyVisualFeedback(event);
        
        // Update flow state
        this.updateFlowState();
    }

    private onEditorChange(editor: vscode.TextEditor | undefined): void {
        if (!editor) {
            return;
        }

        // Apply vibe mode decorations to new editor
        this.applyVibeMode();
    }

    private onConfigChange(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration('neonAgent.vibe')) {
            Object.assign(this.settings, this.loadSettings());
            this.applyVibeMode();
            this.updateStatusBar();
        }
    }

    private onWindowStateChange(state: vscode.WindowState): void {
        if (!this.settings.enabled || !this.currentSession) {
            return;
        }

        if (!state.focused) {
            this.currentSession.interruptionCount++;
        }
    }

    private applyVisualFeedback(event: vscode.TextDocumentChangeEvent): void {
        if (this.settings.visualFeedback === 'subtle') {
            this.applySubtleFeedback(event);
        } else if (this.settings.visualFeedback === 'moderate') {
            this.applyModerateFeedback(event);
        } else if (this.settings.visualFeedback === 'prominent') {
            this.applyProminentFeedback(event);
        }
    }

    private applySubtleFeedback(event: vscode.TextDocumentChangeEvent): void {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document !== event.document) {
            return;
        }

        // Subtle highlight for recently written code
        const decorations: vscode.DecorationOptions[] = [];
        
        for (const change of event.contentChanges) {
            if (change.text.length > 0) {
                decorations.push({
                    range: new vscode.Range(change.range.start, change.range.end)
                });
            }
        }

        activeEditor.setDecorations(this.decorationType, decorations);
        
        // Clear decorations after a short delay
        setTimeout(() => {
            activeEditor.setDecorations(this.decorationType, []);
        }, 1000);
    }

    private applyModerateFeedback(event: vscode.TextDocumentChangeEvent): void {
        this.applySubtleFeedback(event);
        
        // Add more visual cues like subtle animations or color changes
        // This would require more complex decoration management
    }

    private applyProminentFeedback(event: vscode.TextDocumentChangeEvent): void {
        this.applyModerateFeedback(event);
        
        // Add prominent visual feedback like glowing effects or progress indicators
        // This would integrate with theme colors and user preferences
    }

    private updateFlowState(): void {
        if (!this.currentSession || !this.settings.flowStateTracking) {
            return;
        }

        const now = Date.now();
        const sessionDuration = now - this.currentSession.sessionStart;
        
        // Calculate typing velocity
        const avgVelocity = this.typingVelocity.length > 0 
            ? this.typingVelocity.reduce((a, b) => a + b, 0) / this.typingVelocity.length
            : 0;

        // Calculate focus score based on various factors
        let focusScore = 0;

        // Consistent typing velocity indicates flow
        if (avgVelocity > 0 && avgVelocity < 500) {
            focusScore += 30;
        }

        // Fewer interruptions = better focus
        const interruptionRate = this.currentSession.interruptionCount / (sessionDuration / 60000); // per minute
        if (interruptionRate < 0.5) {
            focusScore += 25;
        }

        // Sustained session indicates deep work
        if (sessionDuration > 25 * 60 * 1000) { // 25 minutes (Pomodoro)
            focusScore += 25;
        }

        // High lines written indicates productivity
        const linesPerMinute = this.currentSession.linesWritten / (sessionDuration / 60000);
        if (linesPerMinute > 2) {
            focusScore += 20;
        }

        this.currentSession.focusScore = focusScore;
        
        // Determine productivity level
        if (focusScore >= 80) {
            this.currentSession.productivityLevel = 'flow';
        } else if (focusScore >= 60) {
            this.currentSession.productivityLevel = 'high';
        } else if (focusScore >= 40) {
            this.currentSession.productivityLevel = 'medium';
        } else {
            this.currentSession.productivityLevel = 'low';
        }

        // Update status bar
        this.updateStatusBar();
        
        // Apply flow state decorations
        this.applyFlowStateDecorations();
    }

    private applyFlowStateDecorations(): void {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || !this.currentSession) {
            return;
        }

        // Clear existing decorations
        this.flowStateDecorations.forEach(decoration => {
            activeEditor.setDecorations(decoration, []);
        });

        // Apply decoration based on current flow state
        const level = this.currentSession.productivityLevel;
        let decorationIndex = 0;
        
        switch (level) {
            case 'low': decorationIndex = 0; break;
            case 'medium': decorationIndex = 1; break;
            case 'high': decorationIndex = 2; break;
            case 'flow': decorationIndex = 3; break;
        }

        // Add flow indicator at the beginning of the first line
        const firstLine = activeEditor.document.lineAt(0);
        const decoration: vscode.DecorationOptions = {
            range: new vscode.Range(0, 0, 0, 0)
        };

        activeEditor.setDecorations(this.flowStateDecorations[decorationIndex], [decoration]);
    }

    private applyVibeMode(): void {
        if (!this.settings.enabled) {
            return;
        }

        // Apply focus mode styling
        this.applyFocusMode();
        
        // Configure AI suggestion style
        this.configureAISuggestions();
        
        // Show/hide UI elements based on mode
        this.configureUIVisibility();
    }

    private applyFocusMode(): void {
        const config = vscode.workspace.getConfiguration();
        
        switch (this.settings.focusMode) {
            case 'minimal':
                // Minimal distractions
                config.update('workbench.activityBar.visible', true, vscode.ConfigurationTarget.Global);
                config.update('workbench.statusBar.visible', true, vscode.ConfigurationTarget.Global);
                config.update('workbench.sideBar.location', 'left', vscode.ConfigurationTarget.Global);
                break;
                
            case 'distraction-free':
                // Hide some UI elements
                config.update('workbench.activityBar.visible', false, vscode.ConfigurationTarget.Global);
                config.update('breadcrumbs.enabled', false, vscode.ConfigurationTarget.Global);
                break;
                
            case 'zen':
                // Maximum focus - hide everything non-essential
                config.update('workbench.activityBar.visible', false, vscode.ConfigurationTarget.Global);
                config.update('workbench.statusBar.visible', false, vscode.ConfigurationTarget.Global);
                config.update('breadcrumbs.enabled', false, vscode.ConfigurationTarget.Global);
                config.update('editor.minimap.enabled', false, vscode.ConfigurationTarget.Global);
                break;
        }
    }

    private configureAISuggestions(): void {
        const config = vscode.workspace.getConfiguration('neonAgent');
        
        // Configure suggestion style based on user preference
        switch (this.settings.aiSuggestionStyle) {
            case 'inline':
                config.update('completion.style', 'inline', vscode.ConfigurationTarget.Global);
                break;
            case 'popup':
                config.update('completion.style', 'popup', vscode.ConfigurationTarget.Global);
                break;
            case 'sidebar':
                config.update('completion.style', 'sidebar', vscode.ConfigurationTarget.Global);
                break;
        }
    }

    private configureUIVisibility(): void {
        // Configure which UI elements are visible based on vibe mode
        const commands = [
            'workbench.action.toggleSidebarVisibility',
            'workbench.action.togglePanel',
            'workbench.action.toggleActivityBar'
        ];

        // This would be implemented based on specific UI requirements
    }

    public startSession(): void {
        if (this.currentSession) {
            this.endSession();
        }

        this.currentSession = {
            sessionStart: Date.now(),
            sessionDuration: 0,
            linesWritten: 0,
            completionsAccepted: 0,
            interruptionCount: 0,
            focusScore: 0,
            productivityLevel: 'low'
        };

        this.updateStatusBar();
        
        if (this.settings.ambientSounds) {
            this.startAmbientSounds();
        }
    }

    public endSession(): void {
        if (!this.currentSession) {
            return;
        }

        this.currentSession.sessionDuration = Date.now() - this.currentSession.sessionStart;
        
        if (this.settings.productivityMetrics) {
            this.showSessionSummary();
        }

        this.currentSession = null;
        this.updateStatusBar();
        this.stopAmbientSounds();
    }

    private showSessionSummary(): void {
        if (!this.currentSession) {
            return;
        }

        const duration = Math.round(this.currentSession.sessionDuration / 60000); // minutes
        const productivity = this.currentSession.productivityLevel;
        const focusScore = this.currentSession.focusScore;

        vscode.window.showInformationMessage(
            `📊 Session Complete: ${duration}m • ${productivity.toUpperCase()} productivity • Focus: ${focusScore}%`,
            'View Details'
        ).then(selection => {
            if (selection === 'View Details') {
                this.showDetailedSessionSummary();
            }
        });
    }

    private showDetailedSessionSummary(): void {
        if (!this.currentSession) {
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'sessionSummary',
            'Coding Session Summary',
            vscode.ViewColumn.Beside,
            { enableScripts: false }
        );

        panel.webview.html = this.getSessionSummaryHtml(this.currentSession);
    }

    private getSessionSummaryHtml(session: FlowMetrics): string {
        const duration = Math.round(session.sessionDuration / 60000);
        const linesPerMinute = session.linesWritten / (session.sessionDuration / 60000);

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background: var(--vscode-sidebar-background);
            border-radius: 4px;
        }
        .flow-${session.productivityLevel} {
            border-left: 4px solid var(--vscode-gitDecoration-addedResourceForeground);
        }
        .chart {
            height: 100px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
            margin: 20px 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>
<body>
    <h1>🎯 Coding Session Summary</h1>
    
    <div class="metric flow-${session.productivityLevel}">
        <span>Session Duration</span>
        <strong>${duration} minutes</strong>
    </div>
    
    <div class="metric">
        <span>Lines Written</span>
        <strong>${session.linesWritten}</strong>
    </div>
    
    <div class="metric">
        <span>Productivity Level</span>
        <strong>${session.productivityLevel.toUpperCase()}</strong>
    </div>
    
    <div class="metric">
        <span>Focus Score</span>
        <strong>${session.focusScore}%</strong>
    </div>
    
    <div class="metric">
        <span>Lines per Minute</span>
        <strong>${linesPerMinute.toFixed(1)}</strong>
    </div>
    
    <div class="metric">
        <span>Interruptions</span>
        <strong>${session.interruptionCount}</strong>
    </div>
    
    <div class="chart">
        📈 Flow State Visualization
    </div>
    
    <p><em>Keep up the great work! Consistent coding sessions build strong development habits.</em></p>
</body>
</html>`;
    }

    private startAmbientSounds(): void {
        // Implementation would play ambient sounds to enhance focus
        // This could be rainfall, white noise, lo-fi beats, etc.
    }

    private stopAmbientSounds(): void {
        // Stop ambient sounds
    }

    public toggleVibeMode(): void {
        this.settings.enabled = !this.settings.enabled;
        
        const config = vscode.workspace.getConfiguration('neonAgent.vibe');
        config.update('enabled', this.settings.enabled, vscode.ConfigurationTarget.Global);
        
        if (this.settings.enabled) {
            this.applyVibeMode();
            this.startSession();
        } else {
            this.endSession();
            this.restoreDefaultUI();
        }
        
        this.updateStatusBar();
    }

    private restoreDefaultUI(): void {
        const config = vscode.workspace.getConfiguration();
        
        // Restore default UI settings
        config.update('workbench.activityBar.visible', true, vscode.ConfigurationTarget.Global);
        config.update('workbench.statusBar.visible', true, vscode.ConfigurationTarget.Global);
        config.update('breadcrumbs.enabled', true, vscode.ConfigurationTarget.Global);
        config.update('editor.minimap.enabled', true, vscode.ConfigurationTarget.Global);
    }

    private updateStatusBar(): void {
        if (!this.settings.enabled) {
            this.statusBarItem.text = '$(pulse) Vibe Mode: Off';
            this.statusBarItem.tooltip = 'Click to enable Vibe Coding mode';
            this.statusBarItem.show();
            return;
        }

        if (this.currentSession) {
            const emoji = this.getFlowEmoji(this.currentSession.productivityLevel);
            const duration = Math.round((Date.now() - this.currentSession.sessionStart) / 60000);
            
            this.statusBarItem.text = `${emoji} ${duration}m • ${this.currentSession.focusScore}%`;
            this.statusBarItem.tooltip = `Vibe Mode: ${this.currentSession.productivityLevel} flow • ${duration} minutes`;
        } else {
            this.statusBarItem.text = '$(pulse) Vibe Mode: Ready';
            this.statusBarItem.tooltip = 'Click to start coding session';
        }
        
        this.statusBarItem.show();
    }

    private getFlowEmoji(level: string): string {
        switch (level) {
            case 'flow': return '✦';
            case 'high': return '●';
            case 'medium': return '◐';
            case 'low': return '◯';
            default: return '○';
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.statusBarItem.dispose();
        this.decorationType.dispose();
        this.flowStateDecorations.forEach(d => d.dispose());
        
        if (this.currentSession) {
            this.endSession();
        }
    }
}
