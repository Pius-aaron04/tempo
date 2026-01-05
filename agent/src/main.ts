#!/usr/bin/env node

import * as net from 'net';
import * as fs from 'fs';
import { ensureDataDir, SOCKET_PATH } from './paths';
import { TempoDatabase } from './database';

async function main() {
  ensureDataDir();

  const db = new TempoDatabase();

  const server = net.createServer((socket) => {
    console.log('Client connected');
    socket.on('data', (data) => {
      console.log('Received:', data.toString());
    });
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      // Check if the socket is actually active
      const client = net.connect(SOCKET_PATH, () => {
        console.error('Tempo Agent is already running.');
        process.exit(1);
      });

      client.on('error', (connectErr: any) => {
        if (connectErr.code === 'ECONNREFUSED') {
          // Socket is stale, remove it and restart
          console.log('Removing stale socket...');
          fs.unlinkSync(SOCKET_PATH);
          server.listen(SOCKET_PATH);
        } else {
          console.error('Socket error:', connectErr);
          process.exit(1);
        }
      });
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(SOCKET_PATH, () => {
    console.log(`Tempo Agent listening on ${SOCKET_PATH}`);
  });

  // Cleanup on exit
  const cleanup = () => {
    console.log('Shutting down...');
    server.close();
    db.close();
    if (fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH);
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('Failed to start agent:', err);
  process.exit(1);
});