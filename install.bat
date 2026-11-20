@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo SprintBiomechPro - Instalacion para Windows 10/11
py -3.12 --version >nul 2>&1
if not errorlevel 1 (
    py -3.12 -m venv .venv
) else (
    py -3.11 --version >nul 2>&1
    if errorlevel 1 (
        echo Instala Python 3.12 de 64 bits con su lanzador py y vuelve a ejecutar este archivo.
        pause
        exit /b 1
    )
    py -3.11 -m venv .venv
)
if errorlevel 1 goto failed
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto failed
".venv\Scripts\python.exe" -c "import cv2, mediapipe, PyQt5, pyqtgraph, reportlab; from src.analysis import AnalysisConfig"
if errorlevel 1 goto failed
echo Instalacion completada. Abre run_sprint_analyzer.bat.
pause
exit /b 0
:failed
echo No se completo la instalacion. Revisa el error mostrado arriba.
pause
exit /b 1
