
# Tempo — Local-First Developer Activity Tracker

## Overview

**Tempo** is a local-first, privacy-respecting developer activity tracker inspired by WakaTime.  
It runs primarily on the user’s machine, collects activity data from editors, browsers, and the operating system, and converts low-level signals into meaningful, time-based insights about how a developer spends their time.

Tempo is designed as a **system tool**, not just an app:

- A long-running **agent (daemon)** does the tracking and decision-making.
    
- A **UI** provides visualization and configuration.
    
- **Integrations** (e.g., VS Code) emit structured signals.
    
- All data is stored locally by default, with optional export or sync later.
    

Privacy, determinism, and architectural clarity are first-class concerns.

---

## Core Design Principles

1. **Local-first**
    
    - All tracking, aggregation, and storage happen on the user’s machine.
        
    - No cloud dependency is required for core functionality.
        
2. **Event → Session → Insight**
    
    - Raw signals are collected as _events_.
        
    - Events are aggregated into _sessions_.
        
    - Sessions are analyzed into _insights_ (time spent per project, tool, language, etc.).
        
3. **Single source of truth**
    
    - The agent owns the database and all writes.
        
    - UIs and integrations communicate with the agent, never directly with storage.
        
4. **Clear boundaries**
    
    - Collection ≠ aggregation ≠ presentation.
        
    - Each part of the system has a well-defined responsibility.
        

---

## High-Level Architecture

`┌────────────────────┐ │  Editors / Tools   │ │  (VS Code, etc.)   │ └─────────┬──────────┘           │ events           ▼ ┌────────────────────┐ │   Tempo Agent      │  ← authoritative core │  (daemon + CLI)    │ │                    │ │  - event intake    │ │  - session logic   │ │  - idleness logic  │ │  - persistence     │ └─────────┬──────────┘           │ IPC           ▼ ┌────────────────────┐ │   UI (Electron)    │ │  - dashboards      │ │  - settings        │ │  - exports         │ └────────────────────┘`

The **agent** is the heart of the system. Everything else is replaceable.

---

## Repository Structure (Monorepo)

`tempo/ ├── agent/                 # Core runtime (daemon + CLI) │   ├── src/ │   │   └── main.ts │   ├── dist/ │   └── package.json │ ├── ui/                    # Electron desktop UI │   └── src/ │ ├── vscode-extension/      # VS Code integration │   └── src/ │ ├── packages/ │   └── contracts/         # Shared types & event schemas │       └── src/index.ts │ ├── docs/                  # Architecture & design notes ├── pnpm-workspace.yaml ├── pnpm-lock.yaml ├── tsconfig.base.json └── README.md`

---

## Agent (Core Engine)

### Responsibilities

- Runs as a long-lived background process.
    
- Exposes a CLI (`tempo-agent`) for control and diagnostics.
    
- Receives events from:
    
    - Editor extensions
        
    - Browser trackers (future)
        
    - OS-level signals (future)
        
- Converts events into sessions.
    
- Detects idleness and context switches.
    
- Persists normalized data to a local database.
    
- Serves read-only queries to the UI via IPC.
    

### CLI Semantics (Conceptual)

`tempo-agent start     # start daemon tempo-agent stop      # stop daemon tempo-agent status    # health + uptime tempo-agent doctor    # diagnostics`

The CLI is a **control surface**, not the business logic.

---

## Event Model (Conceptual)

Events are **facts**, not conclusions.

Examples:

- “File X became active at time T”
    
- “Editor lost focus at time T”
    
- “Browser tab Y became active”
    

Events are:

- Timestamped
    
- Append-only
    
- Immutable once written
    

They do **not** represent time spent by themselves.

---

## Session Model (Conceptual)

Sessions are **derived** from events.

A session:

- Has a `start_time` and `end_time`
    
- Represents continuous, focused activity
    
- Belongs to a context (editor, project, file, browser domain)
    

Sessions end when:

- Focus changes
    
- Idle timeout is exceeded
    
- Explicit stop signal is received
    

Multiple sessions may exist close in time, but **overlap rules are explicit and enforced by the agent**.

---

## Idleness & Activity Inference

Idleness is inferred, not reported.

The agent uses:

- Event gaps
    
- Heartbeats from integrations
    
- OS focus signals (future)
    

If no qualifying activity occurs within a configurable threshold, the current session is closed.

---

## UI (Electron)

### Responsibilities

- Visualize data already processed by the agent.
    
- Never infer time on its own.
    
- Acts as a client to the agent.
    

The UI is replaceable:

- Electron now
    
- Web or mobile later
    

The **agent API remains stable**.

---

## Contracts Package

`packages/contracts` defines:

- Event schemas
    
- Session types
    
- IPC request/response types
    

This package:

- Contains **no runtime logic**
    
- Exists to prevent drift between agent, UI, and extensions
    
- Is the shared language of the system
    

---

## Non-Goals (for now)

- Global cloud sync
    
- Team dashboards
    
- Billing
    
- AI analysis
    

These are intentionally deferred until the core system is solid.

---

## Intended Development Flow

1. Stabilize the **agent runtime**
    
2. Define and lock **event + session contracts**
    
3. Implement **editor tracking**
    
4. Add **basic UI visualization**
    
5. Iterate on inference quality
    

---

## Final Directive

> Tempo is not “an app that tracks coding time.”
> 
> It is a **local observability system for developer activity**, built around a single authoritative agent.

All design and implementation decisions should preserve:

- Local ownership of data
    
- Explicit boundaries
    
- Predictable behavior
    
- Minimal magic
    

If a choice introduces ambiguity, hidden state, or unclear ownership — it is probably the wrong choice.
