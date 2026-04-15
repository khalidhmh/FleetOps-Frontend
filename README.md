# Fleet Frontend Runtime

This workspace is a multi-app vanilla frontend setup managed by a single Node orchestrator

## Apps

- Driver App
- Customer Portal
- FleetOps Hub
- Maintenance App

Each app has its own folder and can run independently.

## Dynamic Ports

Ports are dynamic by design.

- Preferred ports are 3001, 3002, 3003, and 3004.
- If a preferred port is occupied, the server automatically moves to the next free port.
- Actual assigned ports are written to `.runtime/ports.json`.

## Local Development

### Run all apps from terminal

- `npm run dev:all`
- or `powershell -ExecutionPolicy Bypass -File .\Server\run-all.ps1`
- or double-click `Server/run-all.cmd`

### Run a single app

- Driver: `npm run dev:driver`
- Customer: `npm run dev:customer`
- Dashboard: `npm run dev:dashboard`
- Maintenance: `npm run dev:maintenance`

You can also use `run.ps1` or `run.cmd` inside each app folder.

### Request-level logs

- Run with request logging: `node Server/scripts/dev-orchestrator.mjs --open --log-requests`

## Important Paths

- Orchestrator: `Server/scripts/dev-orchestrator.mjs`
- Shared static server: `Server/scripts/serve-app.mjs`
- Runtime ports file: `Server/.runtime/ports.json`
