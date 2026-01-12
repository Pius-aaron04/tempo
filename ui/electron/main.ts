import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as net from 'net';
import * as os from 'os';
import { IpcRequest, IpcResponse } from '@tempo/contracts';

const SOCKET_PATH = path.join(os.homedir(), '.tempo', 'tempo.sock');

let mainWindow: BrowserWindow | null = null;

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
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
