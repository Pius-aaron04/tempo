# Tempo for VS Code

**Tempo** is a local-first developer activity tracker designed to help you understand how you spend your time coding. This extension captures high-fidelity editor events and sends them to the local Tempo Agent.

> **Note**: This extension requires the **Tempo Desktop Application** (Agent) to be running to store and visualize data.

## Features

-   **Privacy-First**: All data is stored locally in `~/.tempo`. No data leaves your machine.
-   **Automatic Tracking**: Tracks file open, edit, save, and close events automatically.
-   **Granular Metrics**: Understand time spent per project, language, and file.

## Requirements

You must have the Tempo Agent running.
-   If you have the **Tempo Desktop App** installed, simply launch it.
-   Developers can run the agent manually via `@tempo/agent`.

## Extension Settings

This extension contributes the following settings:

*   `tempo.enabled`: Enable/disable tracking (default: `true`).
*   `tempo.agentPort`: Port where the local Agent is listening (default: `3000`).

## Installation

1.  Install this extension from the Marketplace.
2.  Install the Tempo Desktop Application (Release link pending).
3.  Start coding!

## Troubleshooting

**"Failed to connect to Tempo Agent"**
Ensure the Tempo Desktop App or Agent process is running. The extension attempts to reconnect automatically.

## Release Notes

### 1.0.0

Initial release of Tempo for VS Code.
