@echo off
setlocal
cd /d "%~dp0"
node ..\server\scripts\serve-app.mjs --root fleetops-hub --title "FleetOps Hub" --preferred-port 3003 --open
if errorlevel 1 (
  echo.
  echo FleetOps Hub server exited with an error.
)
echo.
pause
