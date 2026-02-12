import * as path from "path";
import * as os from "os";
import * as fs from "fs";

const HOME = os.homedir();
const isWindows = process.platform === "win32";
export const DATA_DIR = path.join(HOME, ".tempo");
export const SOCKET_PATH = isWindows
  ? "\\\\.\\pipe\\tempo-agent.sock"
  : path.join(DATA_DIR, "tempo.sock");
export const DB_PATH = path.join(DATA_DIR, "tempo.db");

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
