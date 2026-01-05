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
  const responses = data.toString().split('\n').filter(s => s.trim().length > 0);
  for (const res of responses) {
    const parsed = JSON.parse(res);
    if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0 && 'start_time' in parsed.data[0]) {
        console.log('--- Recent Sessions ---');
        console.table(parsed.data.map((s: any) => ({
            id: s.id,
            duration: s.duration_seconds + 's',
            project: s.context.project_path || 'N/A',
            app: s.context.app_name || 'N/A',
            status: s.status
        })));
    } else {
        console.log('Response:', res);
    }
  }
});

async function produceEvents() {
  const now = Date.now();
  
  const events: IpcRequest[] = [
    // 1. Start working on Project A
    {
      type: 'emit_event',
      event: {
        type: 'file_open',
        source: 'vscode',
        timestamp: new Date(now - 10000).toISOString(),
        payload: { file_path: 'src/index.ts', project_path: '/work/project-a' }
      }
    },
    // 2. Edit Project A (Extend session)
    {
      type: 'emit_event',
      event: {
        type: 'file_edit',
        source: 'vscode',
        timestamp: new Date(now - 5000).toISOString(),
        payload: { file_path: 'src/index.ts', project_path: '/work/project-a', language: 'typescript' }
      }
    },
    // 3. Switch to Project B (New session)
    {
      type: 'emit_event',
      event: {
        type: 'file_open',
        source: 'vscode',
        timestamp: new Date(now - 4000).toISOString(),
        payload: { file_path: 'README.md', project_path: '/work/project-b' }
      }
    },
    // 4. Idle gap (simulated by a jump in time) - This should start a new session because of the gap
    {
      type: 'emit_event',
      event: {
        type: 'app_active',
        source: 'macos',
        timestamp: new Date(now + 300000).toISOString(), // 5 mins later
        payload: { app_name: 'Chrome', window_title: 'Stack Overflow' }
      }
    },
    {
       type: 'query_sessions',
       limit: 10
    }
  ];

  for (const event of events) {
    client.write(JSON.stringify(event) + '\n');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  client.end();
}