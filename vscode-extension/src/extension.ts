import * as vscode from 'vscode';
import { TempoClient } from './client';
import { TempoEvent } from '@tempo/contracts';

let client: TempoClient;
let outputChannel: vscode.OutputChannel;
let lastActivityTime = 0;
const ACTIVITY_THROTTLE_MS = 30000; // 30 seconds

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Tempo');
    outputChannel.appendLine('Tempo extension activating...');

    client = new TempoClient(outputChannel);
    context.subscriptions.push(outputChannel);

    // Register event listeners
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(handleActiveEditorChange),
        vscode.workspace.onDidOpenTextDocument(handleFileOpen),
        vscode.workspace.onDidCloseTextDocument(handleFileClose),
        vscode.workspace.onDidChangeTextDocument(handleFileEdit),
        vscode.window.onDidChangeTextEditorVisibleRanges(handleScroll),
        vscode.window.onDidChangeTextEditorSelection(handleSelection)
    );

    // Initial check for active editor
    if (vscode.window.activeTextEditor) {
        handleActiveEditorChange(vscode.window.activeTextEditor);
    }

    outputChannel.appendLine('Tempo extension activated.');
}

export function deactivate() {
    if (client) {
        client.dispose();
    }
}

function handleActiveEditorChange(editor: vscode.TextEditor | undefined) {
    if (!editor) return; // Could emit app_active with no file if strictly focusing VS Code, but typically we care about files

    const doc = editor.document;
    if (doc.uri.scheme !== 'file') return;

    const event: TempoEvent = {
        type: 'app_active', // Or should this be file_open implies active? 
        // Actually, app_active is for window focus. 
        // Switching tabs is effectively "App Active" context switch or just "File Open" (which implies active).
        // Let's use app_active with window title as "Filename - Project"
        timestamp: new Date().toISOString(),
        source: 'vscode',
        payload: {
            app_name: 'VS Code',
            window_title: `${doc.fileName} - Tempo` // Approximate
        }
    };
    client.emit(event);

    // Also emit a virtual file_open to signal context switch in Tempo terms if we treat file_open as "focus"
    // But Tempo architecture separates "App Active" from "File events".
    // Let's emit a file_open event as well or instead?
    // Architecture says: "File X became active" -> This is `file_open` or specialized `file_focus`?
    // Contracts has `file_open`. Let's use that for now.

    const fileEvent: TempoEvent = {
        type: 'file_open',
        timestamp: new Date().toISOString(),
        source: 'vscode',
        payload: {
            file_path: doc.fileName,
            language: doc.languageId,
            project_path: vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath
        }
    };
    client.emit(fileEvent);
}

function handleFileOpen(doc: vscode.TextDocument) {
    if (doc.uri.scheme !== 'file') return;

    // We handle focus in onDidChangeActiveTextEditor. 
    // This event fires when a file is technically opened (loaded), which might not mean focused.
    // So we might ignore this or treat it as purely "loaded". 
    // But for now, let's log it.
}

function handleFileClose(doc: vscode.TextDocument) {
    if (doc.uri.scheme !== 'file') return;

    const event: TempoEvent = {
        type: 'file_close',
        timestamp: new Date().toISOString(),
        source: 'vscode',
        payload: {
            file_path: doc.fileName,
            language: doc.languageId,
            project_path: vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath
        }
    };
    client.emit(event);
}

function handleFileEdit(e: vscode.TextDocumentChangeEvent) {
    const doc = e.document;
    if (doc.uri.scheme !== 'file') return;
    if (e.contentChanges.length === 0) return; // No actual change

    const event: TempoEvent = {
        type: 'file_edit',
        timestamp: new Date().toISOString(),
        source: 'vscode',
        payload: {
            file_path: doc.fileName,
            language: doc.languageId,
            project_path: vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath
        }
    };
    client.emit(event);
}

function handleScroll(e: vscode.TextEditorVisibleRangesChangeEvent) {
    if (e.textEditor.document.uri.scheme !== 'file') return;
    throttleAndEmitActivity(e.textEditor.document, 'scroll');
}

function handleSelection(e: vscode.TextEditorSelectionChangeEvent) {
    if (e.textEditor.document.uri.scheme !== 'file') return;
    throttleAndEmitActivity(e.textEditor.document, 'cursor');
}

function throttleAndEmitActivity(doc: vscode.TextDocument, kind: 'scroll' | 'cursor') {
    const now = Date.now();
    if (now - lastActivityTime < ACTIVITY_THROTTLE_MS) return;

    lastActivityTime = now;

    const event: TempoEvent = {
        type: 'user_activity',
        timestamp: new Date().toISOString(),
        source: 'vscode',
        payload: {
            kind,
            file_path: doc.fileName,
            language: doc.languageId,
            project_path: vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath
        }
    };
    client.emit(event);
}
