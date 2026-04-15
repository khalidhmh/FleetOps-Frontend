$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $root '..\Server\scripts\serve-app.mjs'

try {
  node $serverScript --root 'customer-portal' --title 'Customer Portal' --preferred-port 3002 --open
} catch {
  Write-Host "Customer launcher failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
  if ($Host.Name -notlike '*Visual Studio Code*') {
    Read-Host 'Press Enter to close this window'
  }
}
