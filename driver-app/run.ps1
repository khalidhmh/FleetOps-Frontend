$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $root '..\Server\scripts\serve-app.mjs'

try {
  node $serverScript --root 'driver-app' --title 'Driver App' --preferred-port 3001 --open
} catch {
  Write-Host "Driver launcher failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
  if ($Host.Name -notlike '*Visual Studio Code*') {
    Read-Host 'Press Enter to close this window'
  }
}
