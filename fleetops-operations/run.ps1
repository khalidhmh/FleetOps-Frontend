$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $root '..\Server\scripts\serve-app.mjs'

try {
  node $serverScript --root 'fleetops-operations' --title 'FleetOps Operations' --preferred-port 3003 --open
} catch {
  Write-Host "Dashboard launcher failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
  if ($Host.Name -notlike '*Visual Studio Code*') {
    Read-Host 'Press Enter to close this window'
  }
}
