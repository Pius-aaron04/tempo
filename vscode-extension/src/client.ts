import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { IpcRequest, TempoEvent } from '@tempo/contracts';

const HOME = os.homedir();
const SOCKET_PATH = path.join(HOME, '.tempo', 'tempo.sock');

export class TempoClient {
    private socket: net.Socket | null = null;
    private outputChannel: vscode.OutputChannel;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isConnecting = false;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.connect();
    }

    private connect() {
        if (this.socket || this.isConnecting) return;

        this.isConnecting = true;
        this.outputChannel.appendLine(`Connecting to Tempo Agent at ${SOCKET_PATH}...`);

        this.socket = net.createConnection(SOCKET_PATH, () => {
            this.outputChannel.appendLine('Connected to Tempo Agent');
            this.isConnecting = false;
        });

        this.socket.on('error', (err) => {
            this.outputChannel.appendLine(`Connection error: ${err.message}`);
            this.cleanup();
            this.scheduleReconnect();
        });

        this.socket.on('close', () => {
            this.outputChannel.appendLine('Disconnected from Tempo Agent');
            this.cleanup();
            this.scheduleReconnect();
        });
    }

    private cleanup() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.isConnecting = false;
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) return;
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
        }, 5000);
    }

    public emit(event: TempoEvent) {
        if (!this.socket || this.socket.connecting) {
             // Drop event or buffer? Dropping for now to avoid memory leaks if agent is down for long
             return; 
        }

        const request: IpcRequest = {
            type: 'emit_event',
            event: event
        };

        try {
            this.socket.write(JSON.stringify(request) + '\n');
        } catch (e: any) {
            this.outputChannel.appendLine(`Failed to send event: ${e.message}`);
        }
    }

    public dispose() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.cleanup();
    }
}
