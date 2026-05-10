@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   SPRINT BIOMECHANICS PRO - 100m Analyzer║
echo ║   Versión 2.0 - Análisis Profesional     ║
echo ╚══════════════════════════════════════════╝
echo.

:: Verificar entorno virtual
if not exist "venv\Scripts\python.exe" (
    echo ❌ No se encontró el entorno virtual.
    echo Ejecuta: python -m venv venv
    pause
    exit /b 1
)

:: Instalar dependencias si es necesario
if not exist "venv\Lib\site-packages\mediapipe" (
    echo 📦 Instalando dependencias...
    call venv\Scripts\pip install -r requirements.txt
)

:: Ejecutar aplicación
echo 🚀 Iniciando analizador de sprint...
call venv\Scripts\python.exe run_sprint_analyzer.py

pause