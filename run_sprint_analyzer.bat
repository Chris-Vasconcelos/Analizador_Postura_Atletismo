@echo off
title Bolt Reboot - Laboratorio Biomecanico
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)
python run_sprint_analyzer.py
if errorlevel 1 (
    echo.
    echo [ERROR] La aplicacion termino con errores.
    pause
)
