"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('tempo', {
    request: (req) => electron_1.ipcRenderer.invoke('agent-request', req),
});
