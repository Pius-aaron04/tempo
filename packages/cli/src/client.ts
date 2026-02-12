import * as net from "net";
import * as os from "os";
import * as path from "path";
import { IpcRequest, IpcResponse } from "@tempo/contracts";

const HOME = os.homedir();
const isWindows = process.platform === "win32";
const SOCKET_PATH = isWindows
  ? "\\\\.\\pipe\\tempo-agent.sock"
  : path.join(HOME, ".tempo", "tempo.sock");

export class TempoClient {
  private socket: net.Socket;
  private connected = false;

  constructor() {
    this.socket = new net.Socket();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.connect(SOCKET_PATH, () => {
        this.connected = true;
        resolve();
      });

      this.socket.on("error", (err) => {
        reject(err);
      });
    });
  }

  async request(req: IpcRequest): Promise<IpcResponse> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const onData = (data: Buffer) => {
        const raw = data.toString();
        const lines = raw.split("\n").filter((l) => l.trim().length > 0);

        // Assuming simple one-to-one request/response for CLI usage
        for (const line of lines) {
          try {
            const response = JSON.parse(line) as IpcResponse;
            cleanup();
            resolve(response);
            return;
          } catch (e) {
            // ignore partial JSON or keep waiting?
            // For now, assume good packets.
          }
        }
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        this.socket.removeListener("data", onData);
        this.socket.removeListener("error", onError);
      };

      this.socket.on("data", onData);
      this.socket.on("error", onError);

      this.socket.write(JSON.stringify(req) + "\n");
    });
  }

  close() {
    this.socket.end();
  }
}
