# @tempo/agent

The backend service for Tempo, responsible for data ingestion, persistence, and analytics.

## Architecture

The Agent runs as a standalone Node.js process. It communicates with clients (VS Code Extension, UI, CLI) via a local Unix socket (or named pipe on Windows).

### Key Components

- **`TempoDatabase`**: Wraps `better-sqlite3` to manage the local SQLite database. Handles event insertion and complex analytical queries (trends, sessions, reading/writing patterns).
- **`SessionManager`**: aggregates raw events into coherent "Sessions" based on activity timeouts.
- **IPC Server**: Listens on `~/.tempo/tempo.sock`. Routes JSON-based requests to the appropriate handlers.

## Database Schema

The SQLite database (`~/.tempo/tempo.db`) contains:

- **`events`**: High-frequency stream of activity (file edits, cursor moves, scrolling, app focus).
- **`sessions`**: Aggregated blocks of time spent on specific projects/files.

## IPC Protocol

Requests are generic JSON objects with a `type` field.

- `emit_event`: Ingest a new activity event.
- `query_sessions`: Retrieve a list of recent sessions.
- `query_analytics`: Get aggregated stats (e.g., total time per language).
- `query_trend`: Get time-series data for charts.
- `query_work_pattern`: Get breakdown of reading vs. writing time.

## Development

```bash
# Start in dev mode (watches for changes)
pnpm dev
```
