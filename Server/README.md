# Server Control

This folder contains all infrastructure and orchestration code for running the fleet apps.

## Quick Start

- **Run all apps**: `cd Server && node scripts/dev-orchestrator.mjs --open`
- **Double-click**: `Server/run-all.cmd` or `Server/run-all.ps1`

## Structure

- `scripts/` - Orchestrator and server logic
    - `dev-orchestrator.mjs` - Main orchestrator (starts all 4 apps)
    - `serve-app.mjs` - Shared static server for any app
- `.runtime/` - Generated at runtime (ports.json, etc.)
