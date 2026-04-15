$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $root '..\Server\scripts\serve-app.mjs'

try {
  node $serverScript --root 'maintenance-app' --title 'Maintenance App' --preferred-port 3004 --open
} catch {
  Write-Host "Maintenance launcher failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
  if ($Host.Name -notlike '*Visual Studio Code*') {
    Read-Host 'Press Enter to close this window'
  }
}
