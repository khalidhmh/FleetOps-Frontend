@echo off
setlocal
cd /d "%~dp0"
node ..\server\scripts\serve-app.mjs --root driver-app --title "Driver App" --preferred-port 3001 --open
if errorlevel 1 (
  echo.
  echo Driver App server exited with an error.
)
echo.
pause
