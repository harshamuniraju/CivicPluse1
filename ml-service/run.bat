@echo off
setlocal

for %%I in ("%~dp0..") do set "ROOT=%%~fI"
set "PYTHON=%ROOT%\venv\Scripts\python.exe"

if not exist "%PYTHON%" (
    echo Virtual environment Python not found:
    echo %PYTHON%
    exit /b 1
)

pushd "%~dp0"
"%PYTHON%" "app\main.py"
popd
