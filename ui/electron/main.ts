import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from "electron";
import * as path from "path";
import * as net from "net";
import * as os from "os";
import { spawn, ChildProcess } from "child_process";
import { IpcRequest, IpcResponse } from "@tempo/contracts";
import fs from "fs";

// Fix PATH for GUI launches (AppImage/Packaged apps) on macOS/Linux

const isWindows = process.platform === "win32";
const SOCKET_PATH = isWindows
  ? "\\\\.\\pipe\\tempo-agent.sock"
  : path.join(os.homedir(), ".tempo", "tempo.sock");

let mainWindow: BrowserWindow | null = null;
let agentProcess: ChildProcess | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function getAgentPath(): string | null {
  if (app.isPackaged) {
    // In production, agent is bundled in resources/agent/dist/main.js
    return path.join(process.resourcesPath, "agent", "dist", "main.js");
  }
  // In development, return the source path (we'll run it with ts-node or node)
  return path.join(__dirname, "../../agent/dist/main.js");
}

function fixPath() {
  if (process.platform === "win32") {
    return;
  }

  // Fallback paths that are common on macOS/Linux
  const fallbacks = [
    "./node_modules/.bin",
    "/.nodebrew/current/bin",
    "/usr/local/bin",
    process.env.PATH,
  ].join(":");

  try {
    // Try to get the actual shell path synchronously
    const shell = process.env.SHELL || "/bin/sh";

    // For macOS, we need to handle Interactive and login shell
    // For Linux, Interactive shell is usually enough
    const args = process.platform === "darwin" ? ["-ilc"] : ["-ic"];
    const command = `"${shell}" ${args[0]} 'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit'`;

    const output = require("child_process").execSync(command, {
      encoding: "utf8",
      timeout: 3000, // Don't hang forever
    });

    // Extract everything between our delimiters
    const matches = output.split("_SHELL_ENV_DELIMITER_");
    if (matches && matches.length >= 2) {
      const envOutput = matches[1];

      // Parse the output line by line to find PATH
      for (const line of envOutput.split("\\n")) {
        if (line.startsWith("PATH=")) {
          const pathValue = line.substring("PATH=".length).trim();
          if (pathValue) {
            process.env.PATH = pathValue;
            return;
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to read shell PATH:", error);
  }

  // If extraction failed, use fallbacks
  process.env.PATH = fallbacks;
}

// Fix PATH for GUI launches (AppImage/Packaged apps) on macOS/Linux
fixPath();

function checkAgentRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const client = net.createConnection(SOCKET_PATH, () => {
      client.end();
      resolve(true);
    });
    client.on("error", () => {
      resolve(false);
    });
  });
}

async function startAgent() {
  const isRunning = await checkAgentRunning();
  if (isRunning) {
    console.log("Agent already running.");
    return { success: true, message: "Agent already running" };
  }

  const agentScript = getAgentPath();
  if (!agentScript || !fs.existsSync(agentScript)) {
    console.error("Agent script not found:", agentScript);
    return { success: false, message: "Agent script not found" };
  }

  console.log("Spawning agent from:", agentScript);

  try {
    const logPath = path.join(os.homedir(), ".tempo", "agent.log");
    // Ensure .tempo dir exists (it might not if this is first run, though agent should create it, but we are writing logs before agent starts)
    if (!fs.existsSync(path.dirname(logPath))) {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
    }

    const logFile = fs.openSync(logPath, "a");
    const errFile = fs.openSync(logPath, "a");

    // Spawn logical:
    // 1. Use system 'node' from PATH (simplest dev workflow, matches user's environment)
    // 2. No need for ELECTRON_RUN_AS_NODE since we aren't using Electron's binary
    // 3. Detached = true
    // 4. Stdio = Redirect to log file

    agentProcess = spawn("node", [agentScript], {
      env: { ...process.env },
      stdio: ["ignore", logFile, errFile],
      detached: true,
      windowsHide: true,
    });

    agentProcess.unref();

    return { success: true, message: "Agent started" };
  } catch (e: any) {
    console.error("Error spawning agent:", e);
    return { success: false, message: e.message };
  }
}

function stopAgent() {
  /* We generally don't want to stop the detached agent from the UI
  unless explicitly requested. But if we do, we can't easily kill
  a detached process unless we stored its PID somewhere persistent.
  For this implementation, 'stopAgent' inside UI might only be effective
  if we captured the reference, but since it's detached and we might
  be restarting the UI, we might not have the reference.

  However, if we just spawned it, we have 'agentProcess'.*/
  if (agentProcess) {
    agentProcess.kill();
    agentProcess = null;
    return { success: true, message: "Agent stopped" };
  }
  return {
    success: false,
    message: "Agent not running (or not owned by this instance)",
  };
}

function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(__dirname, "../build/icon.png");

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Dashboard", click: () => mainWindow?.show() },
    { type: "separator" },
    {
      label: "Quit Tempo",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Tempo Agent");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "Tempo Dashboard",
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "icon.png")
      : path.join(__dirname, "../build/icon.png"),
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false; // Type requirement
    }
    return true;
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.disableHardwareAcceleration();

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createTray();
    createWindow();

    // Auto-start agent in production
    if (app.isPackaged) {
      startAgent();
    }
  });
}

app.on("window-all-closed", () => {
  // Do NOT quit when all windows are closed
  // Persistence is desired
});

app.on("before-quit", () => {
  isQuitting = true;
  stopAgent();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

// Bridge Electron IPC to Agent Socket
ipcMain.handle(
  "agent-request",
  async (_event, request: IpcRequest): Promise<IpcResponse> => {
    return new Promise((resolve) => {
      const client = net.createConnection(SOCKET_PATH, () => {
        client.write(JSON.stringify(request) + "\n");
      });

      client.on("data", (data) => {
        try {
          const response = JSON.parse(data.toString());
          resolve(response);
        } catch (e) {
          resolve({ success: false, error: "Failed to parse agent response" });
        }
        client.end();
      });

      client.on("error", (err) => {
        resolve({ success: false, error: `Socket error: ${err.message}` });
      });
    });
  },
);

// Agent Lifecycle IPC
ipcMain.handle(
  "agent-control",
  async (_event, action: "start" | "stop" | "status") => {
    if (action === "start") return await startAgent();
    if (action === "stop") return stopAgent();
    if (action === "status") {
      // Check if process is running OR if socket is responsive?
      // For now, check internal process handle
      return { success: true, running: !!agentProcess };
    }
  },
);

ipcMain.handle("get-app-info", async () => {
  return { isPackaged: app.isPackaged };
});
