import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as net from 'net';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { IpcRequest, IpcResponse } from '@tempo/contracts';

const SOCKET_PATH = path.join(os.homedir(), '.tempo', 'tempo.sock');

let mainWindow: BrowserWindow | null = null;
let agentProcess: ChildProcess | null = null;

function getAgentPath(): string | null {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', 'tempo-agent');
  }
  // In development, we assume the developer runs the agent manually.
  // Or we could return reference to ts-node if we wanted to spawn it in dev too.
  return null;
}

function startAgent() {
  if (agentProcess) {
    console.log('Agent already running (internal process).');
    return { success: true, message: 'Agent already running' };
  }

  const agentPath = getAgentPath();
  if (!agentPath) {
    console.log('Agent binary not found or in dev mode.');
    return { success: false, message: 'Agent binary not found (dev mode?)' };
  }

  console.log(`Starting agent from ${agentPath}`);
  try {
    agentProcess = spawn(agentPath, [], {
      stdio: 'inherit', // Pie the output to electron's stdout/stderr
      detached: false // Ensure it dies with the parent for now, unless we want true daemon
    });

    agentProcess.on('error', (err) => {
      console.error('Failed to start agent:', err);
    });

    agentProcess.on('exit', (code, signal) => {
      console.log(`Agent exited with code ${code} signal ${signal}`);
      agentProcess = null;
    });

    return { success: true, message: 'Agent started' };
  } catch (e: any) {
    console.error('Error spawning agent:', e);
    return { success: false, message: e.message };
  }
}

function stopAgent() {
  if (agentProcess) {
    agentProcess.kill();
    agentProcess = null;
    return { success: true, message: 'Agent stopped' };
  }
  return { success: false, message: 'Agent not running' };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Tempo Dashboard',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
  });
}

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createWindow();

  // Auto-start agent in production
  if (app.isPackaged) {
    startAgent();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  stopAgent();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Bridge Electron IPC to Agent Socket
ipcMain.handle('agent-request', async (_event, request: IpcRequest): Promise<IpcResponse> => {
  return new Promise((resolve) => {
    const client = net.createConnection(SOCKET_PATH, () => {
      client.write(JSON.stringify(request) + '\n');
    });

    client.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        resolve(response);
      } catch (e) {
        resolve({ success: false, error: 'Failed to parse agent response' });
      }
      client.end();
    });

    client.on('error', (err) => {
      resolve({ success: false, error: `Socket error: ${err.message}` });
    });
  });
});

// Agent Lifecycle IPC
ipcMain.handle('agent-control', async (_event, action: 'start' | 'stop' | 'status') => {
  if (action === 'start') return startAgent();
  if (action === 'stop') return stopAgent();
  if (action === 'status') {
    // Check if process is running OR if socket is responsive?
    // For now, check internal process handle
    return { success: true, running: !!agentProcess };
  }
});
