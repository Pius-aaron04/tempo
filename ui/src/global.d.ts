import { IpcRequest, IpcResponse } from "@tempo/contracts";

declare global {
  interface Window {
    tempo: {
      request: (req: IpcRequest) => Promise<IpcResponse>;
      agentControl: (
        action: "start" | "stop" | "status",
      ) => Promise<{ success: boolean; message?: string; running?: boolean }>;
      getAppInfo: () => Promise<{ isPackaged: boolean }>;
    };
  }
}

export {};
