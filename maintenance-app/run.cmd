@echo off
setlocal
cd /d "%~dp0"
node ..\server\scripts\serve-app.mjs --root maintenance-app --title "Maintenance App" --preferred-port 3004 --open
if errorlevel 1 (
  echo.
  echo Maintenance App server exited with an error.
)
echo.
pause
