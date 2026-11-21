@echo off
title Instalador - Bolt Reboot Sprint Biomechanics Pro v2.1
echo ============================================================
echo   BOLT REBOOT - SPRINT BIOMECHANICS PRO v2.1 (ESCRITORIO)
echo ============================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no esta instalado o no esta en el PATH.
    pause
    exit /b 1
)

if not exist venv (
    echo Creando entorno virtual...
    python -m venv venv
)

echo Activando entorno virtual...
call venv\Scripts\activate.bat

echo Actualizando pip...
python -m pip install --upgrade pip

echo Instalando dependencias desde requirements.txt...
pip install -r requirements.txt

echo.
echo [OK] Instalacion completada. Ejecuta run_sprint_analyzer.bat para iniciar.
pause
