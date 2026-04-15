@echo off
setlocal
cd /d "%~dp0"
node scripts\dev-orchestrator.mjs --open
if errorlevel 1 (
  echo.
  echo Orchestrator exited with an error.
)
echo.
pause
