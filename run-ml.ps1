$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root "venv\Scripts\python.exe"
$mlDir = Join-Path $root "ml-service"

if (-not (Test-Path $python)) {
    throw "Virtual environment Python not found at $python"
}

Set-Location $mlDir
& $python "app\main.py"
