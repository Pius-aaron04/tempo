import { contextBridge, ipcRenderer } from 'electron';
import { IpcRequest, IpcResponse } from '@tempo/contracts';

contextBridge.exposeInMainWorld('tempo', {
  request: (req: IpcRequest): Promise<IpcResponse> => ipcRenderer.invoke('agent-request', req),
  agentControl: (action: 'start' | 'stop' | 'status') => ipcRenderer.invoke('agent-control', action),
});
