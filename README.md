# Tempo

Tempo is a local-first developer activity tracker designed to help you understand how you spend your time coding. It captures high-fidelity application usage and privacy-focused file activity.

## Overview

Tempo operates on a local server-client architecture:
- **Agent**: A local Node.js process that stores data in a SQLite database.
- **Collector**: VS Code extension that captures editor events.
- **UI**: A desktop dashboard for viewing usage stats.

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
- Node.js > 18
- pnpm

### Installation

```bash
pnpm install
```

### Running the Agent

You can start the agent in development mode:

```bash
cd agent
pnpm dev
```

### Running the UI

```bash
cd ui
pnpm electron:dev
```

### Using the CLI

The CLI tool allows you to view analytics from your terminal:

```bash
cd packages/cli

# Install dependencies (first time only)
pnpm install

# View recent sessions
pnpm dev stats

# View analytics (grouped by project)
pnpm dev analytics

# View analytics options
pnpm dev analytics --help
# Examples: 
#   pnpm dev analytics --group-by language
#   pnpm dev analytics --group-by hour
```

### Developing VS Code Extension

1. Open `vscode-extension` folder in VS Code.
2. Press F5 to launch a new Extension Host window.
