$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root "venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    throw "Virtual environment Python not found at $python"
}

$frontendDir = Join-Path $root "frontend"
$backendDir = Join-Path $root "backend"
$mlDir = Join-Path $root "ml-service"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$mlDir'; & '$python' 'app\main.py'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; npm run dev"

Write-Host "Started ML service, backend, and frontend in new PowerShell windows."
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:5000"
Write-Host "ML API:   http://localhost:8001"
