import { contextBridge, ipcRenderer } from 'electron';
import { IpcRequest, IpcResponse } from '@tempo/contracts';

contextBridge.exposeInMainWorld('tempo', {
  request: (req: IpcRequest): Promise<IpcResponse> => ipcRenderer.invoke('agent-request', req),
});
