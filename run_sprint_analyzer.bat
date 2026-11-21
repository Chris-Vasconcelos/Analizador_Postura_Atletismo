@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Ejecuta primero install.bat.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" run_sprint_analyzer.py
if errorlevel 1 pause
