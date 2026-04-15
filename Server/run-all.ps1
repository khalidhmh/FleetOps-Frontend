$ErrorActionPreference = 'Stop'

Write-Host 'Starting all frontend apps via Node orchestrator...'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

try {
  node (Join-Path $root 'scripts\dev-orchestrator.mjs') --open
} catch {
  Write-Host "Launcher failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
  if ($Host.Name -notlike '*Visual Studio Code*') {
    Read-Host 'Press Enter to close this window'
  }
}
