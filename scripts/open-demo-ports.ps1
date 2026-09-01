# Open Windows firewall for Buddi demo (ports 3001 + 8081/8082)

# Run in elevated PowerShell (Right-click → Run as administrator):
#   powershell -ExecutionPolicy Bypass -File scripts/open-demo-ports.ps1

$ErrorActionPreference = 'Stop'

function Ensure-Rule($name, $port) {
  $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Already exists: $name"
    return
  }
  New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null
  Write-Host "Created: $name (TCP $port)"
}

Ensure-Rule 'Buddi Backend 3001' 3001
Ensure-Rule 'Buddi Expo Metro 8081' 8081
Ensure-Rule 'Buddi Expo Metro 8082' 8082

Write-Host ''
Write-Host 'Done. Verify phone can open: http://YOUR_PC_IP:3001/api/health'
