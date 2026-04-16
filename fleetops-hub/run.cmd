@echo off
setlocal
cd /d "%~dp0"
node ..\server\scripts\serve-app.mjs --root fleetops-operations --title "FleetOps Operations" --preferred-port 3003 --open
if errorlevel 1 (
  echo.
  echo FleetOps Operations server exited with an error.
)
echo.
pause
