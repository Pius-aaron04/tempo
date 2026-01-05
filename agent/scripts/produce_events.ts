import * as net from 'net';
import * as path from 'path';
import * as os from 'os';
import { IpcRequest } from '@tempo/contracts';

const HOME = os.homedir();
const SOCKET_PATH = path.join(HOME, '.tempo', 'tempo.sock');

const client = net.createConnection(SOCKET_PATH, () => {
  console.log('Connected to Tempo Agent');
  produceEvents();
});

client.on('data', (data) => {
  console.log('Response:', data.toString());
});

client.on('end', () => {
  console.log('Disconnected from server');
});

client.on('error', (err) => {
  console.error('Connection error:', err);
});

async function produceEvents() {
  const events: IpcRequest[] = [
    {
      type: 'emit_event',
      event: {
        type: 'app_active',
        source: 'macos_observer',
        timestamp: new Date().toISOString(),
        payload: { app_name: 'VS Code', window_title: 'main.ts - tempo' }
      }
    },
    {
      type: 'emit_event',
      event: {
        type: 'file_edit',
        source: 'vscode',
        timestamp: new Date().toISOString(),
        payload: { file_path: '/home/user/work/tempo/agent/src/main.ts', language: 'typescript' }
      }
    },
    {
       type: 'query_events',
       limit: 10
    }
  ];

  for (const event of events) {
    console.log('Sending:', event.type);
    client.write(JSON.stringify(event) + '\n');
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
  }

  client.end();
}
