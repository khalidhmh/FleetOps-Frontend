@echo off
setlocal
cd /d "%~dp0"
node ..\server\scripts\serve-app.mjs --root customer-portal --title "Customer Portal" --preferred-port 3002 --open
if errorlevel 1 (
  echo.
  echo Customer Portal server exited with an error.
)
echo.
pause
