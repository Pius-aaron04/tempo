# @tempo/ui

The desktop dashboard for Tempo, built with React, Vite, and Electron.

## Features

- **Dashboard View**:
    - **Language & Project Trends**: Stacked bar charts showing activity over the last 7 days.
    - **Work Patterns**: Visualizes "Reading" (viewing/debugging) vs. "Writing" (editing) time.
    - **Daily Activities**: A chronological list of coding sessions for the current day.
    - **Summary Cards**: Quick stats for total time, top project, and top language.
- **Collapsible Sidebar**: For maximizing screen real estate.
- **Auto-Refresh**: Data updates in real-time as the agent ingests new events.

## Tech Stack

- **Electron**: Application shell.
- **React**: UI library.
- **Recharts**: Data visualization.
- **Vite**: Build tool.

## Communication

The UI does not access the database directly. It communicates with the running `@tempo/agent` process via an IPC bridge (`window.tempo.request`) which tunnels requests over the local socket.

## Development

To run the UI, you must also have the Agent running.

```bash
# In a separate terminal, start the agent
cd ../agent
pnpm dev

# Start the UI
pnpm electron:dev
```
