# Tempo

Tempo is a local-first developer activity tracker designed to help you understand how you spend your time coding. It captures high-fidelity application usage and privacy-focused file activity.

## Overview

Tempo operates on a local server-client architecture:

- **Agent**: A local Node.js process that stores data in a SQLite database.
- **UI**: A desktop dashboard (Electron + React) for viewing usage stats.
- **Collector**: VS Code extension that captures editor events.
- **CLI**: Terminal-based analytics tool.

All data remains on your machine in `~/.tempo`.

## Structure

This project is a monorepo managed with `pnpm`:

- `agent`: The core backend service.
- `ui`: React + Electron dashboard.
- `vscode-extension`: Data collector for VS Code.
- `packages/contracts`: Shared TypeScript types and schemas.
- `packages/cli`: Terminal-based analytics tool.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Pius-aaron04/tempo.git
   cd tempo
   ```

2. Install dependencies for all packages:

   ```bash
   pnpm install
   ```

3. Build shared packages:
   ```bash
   pnpm --filter @tempo/contracts build
   ```

## Development Guide

### 1. Agent (Backend)

The agent must be running for the UI and Extension to function correctly.

```bash
cd agent
pnpm dev
# The agent runs on port 3000 (default) or connects via IPC/Socket as configured.
```

### 2. UI (Dashboard)

The UI is an Electron application.

```bash
cd ui
pnpm electron:dev
# This will launch the Electron window and a local Vite server.
```

### 3. VS Code Extension (Collector)

To test the extension, you need to run it within the VS Code Extension Host.

1. Open the `vscode-extension` directory in VS Code.
2. Press `F5` (or go to **Run and Debug** > **Run Extension**).
3. A new "Extension Development Host" window will open.
4. Saving a file in the Host window should send events to the running Agent.

### 4. CLI Tool

Analyze your data directly from the terminal.

```bash
cd packages/cli

# Build the CLI
pnpm build

# Run commands
node dist/index.js stats
node dist/index.js analytics --group-by language
```

## Troubleshooting

- **Agent Connection**: Ensure the `agent` is running before starting the UI or Extension.
- **Database**: Data is stored in `~/.tempo/tempo.db`. You can inspect this file with any SQLite viewer.
- **Dependencies**: If you encounter issues, try running `pnpm install` in the root directory again to ensure workspaces are linked correctly.
