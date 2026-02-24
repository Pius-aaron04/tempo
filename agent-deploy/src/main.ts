#!/usr/bin/env node

import * as net from "net";
import * as fs from "fs";
import { ensureDataDir, SOCKET_PATH } from "./paths";
import { TempoDatabase } from "./database";
import { SessionManager } from "./sessions";
import { IpcRequestSchema, IpcResponse } from "@tempo/contracts";

async function main() {
  ensureDataDir();

  const db = new TempoDatabase();
  const sessionManager = new SessionManager(db);

  const server = net.createServer((socket) => {
    socket.on("data", async (data) => {
      try {
        const rawMessage = data.toString();
        const messages = rawMessage
          .split("\n")
          .filter((s) => s.trim().length > 0);

        for (const msgStr of messages) {
          await handleMessage(socket, db, sessionManager, msgStr);
        }
      } catch (err) {
        console.error("Error processing data:", err);
        sendResponse(socket, { success: false, error: "Invalid data format" });
      }
    });

    socket.on("error", (err) => {
      console.error("Socket connection error:", err);
    });
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      const client = net.connect(SOCKET_PATH, () => {
        console.error("Tempo Agent is already running.");
        process.exit(1);
      });

      client.on("error", (connectErr: any) => {
        if (connectErr.code === "ECONNREFUSED") {
          console.log("Removing stale socket...");
          if (process.platform !== "win32" && fs.existsSync(SOCKET_PATH)) {
            fs.unlinkSync(SOCKET_PATH);
          }
          server.listen(SOCKET_PATH);
        } else {
          console.error("Socket error:", connectErr);
          process.exit(1);
        }
      });
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });

  server.listen(SOCKET_PATH, () => {
    console.log(`Tempo Agent listening on ${SOCKET_PATH}`);
  });

  const cleanup = () => {
    console.log("Shutting down...");
    sessionManager.shutdown();
    server.close();
    db.close();
    if (process.platform !== "win32" && fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH);
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

async function handleMessage(
  socket: net.Socket,
  db: TempoDatabase,
  sessionManager: SessionManager,
  msgStr: string,
) {
  let parsed: any;
  try {
    parsed = JSON.parse(msgStr);
  } catch (e) {
    return sendResponse(socket, { success: false, error: "Invalid JSON" });
  }

  const validation = IpcRequestSchema.safeParse(parsed);

  if (!validation.success) {
    console.warn("Invalid IPC Request:", validation.error);
    return sendResponse(socket, {
      success: false,
      error: "Schema validation failed",
      data: validation.error,
    });
  }

  const req = validation.data;

  if (req.type === "ping") {
    return sendResponse(socket, { success: true, data: "pong" });
  }

  if (req.type === "emit_event") {
    try {
      console.log(`Received event: ${req.event.type} from ${req.event.source}`);
      db.insertEvent(req.event);
      await sessionManager.processEvent(req.event);
      return sendResponse(socket, { success: true });
    } catch (e: any) {
      console.error("Failed to insert event/session:", e);
      return sendResponse(socket, { success: false, error: e.message });
    }
  }

  if (req.type === "query_events") {
    try {
      const events = db.getRecentEvents(req.limit);
      return sendResponse(socket, { success: true, data: events });
    } catch (e: any) {
      console.error("Failed to query events:", e);
      return sendResponse(socket, { success: false, error: e.message });
    }
  }

  if (req.type === "query_sessions") {
    try {
      const sessions = db.getRecentSessions(
        req.limit,
        req.startTime,
        req.endTime,
      );
      return sendResponse(socket, { success: true, data: sessions });
    } catch (e: any) {
      console.error("Failed to query sessions:", e);
      return sendResponse(socket, { success: false, error: e.message });
    }
  }

  if (req.type === "query_analytics") {
    try {
      const results = db.getAnalytics(req.groupBy, req.startTime, req.endTime);
      return sendResponse(socket, { success: true, data: results });
    } catch (e: any) {
      console.error("Failed to query analytics:", e);
      return sendResponse(socket, { success: false, error: e.message });
    }
  }

  if (req.type === "query_trend") {
    try {
      const results = db.getTrend(
        req.groupBy,
        req.days !== undefined ? req.days : 7,
      );
      return sendResponse(socket, { success: true, data: results });
    } catch (e: any) {
      console.error("Failed to query trends:", e);
      return sendResponse(socket, { success: false, error: e.message });
    }
  }

  if (req.type === "query_work_pattern") {
    try {
      const results = db.getWorkPattern(req.days !== undefined ? req.days : 7);
      return sendResponse(socket, { success: true, data: results });
    } catch (e: any) {
      console.error("Failed to query work pattern:", e);
      return sendResponse(socket, { success: false, error: e.message });
    }
  }

  if (req.type === "query_project_files") {
    try {
      const results = db.getProjectFiles(
        req.projectPath,
        req.days !== undefined ? req.days : 7,
      );
      return sendResponse(socket, { success: true, data: results });
    } catch (e: any) {
      console.error("Failed to query project files:", e);
      return sendResponse(socket, { success: false, error: e.message });
    }
  }
}

function sendResponse(socket: net.Socket, response: IpcResponse) {
  if (socket.writable) {
    socket.write(JSON.stringify(response) + "\n");
  }
}

main().catch((err) => {
  console.error("Failed to start agent:", err);
  process.exit(1);
});
