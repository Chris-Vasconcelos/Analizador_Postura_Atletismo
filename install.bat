@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════╗
echo ║   SPRINT BIOMECHANICS PRO - INSTALADOR   ║
echo ║   Versión 2.1 - Setup Automático         ║
echo ╚══════════════════════════════════════════╝
echo.

:: Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python no está instalado o no está en PATH
    echo 📥 Descarga Python desde: https://python.org
    pause
    exit /b 1
)

echo ✅ Python detectado
python --version
echo.

:: Crear entorno virtual si no existe
if not exist "venv" (
    echo 🐍 Creando entorno virtual...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Error creando entorno virtual
        pause
        exit /b 1
    )
    echo ✅ Entorno virtual creado
) else (
    echo ✅ Entorno virtual ya existe
)

:: Activar entorno virtual
echo 🔄 Activando entorno virtual...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ Error activando entorno virtual
    pause
    exit /b 1
)

:: Actualizar pip
echo 📦 Actualizando pip...
python -m pip install --upgrade pip

:: Instalar dependencias
echo 📦 Instalando dependencias...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Error instalando dependencias
    pause
    exit /b 1
)

:: Verificar instalación crítica
echo 🔍 Verificando instalación...
python -c "import mediapipe, cv2, numpy, PyQt5; print('✅ Todas las dependencias instaladas')"
if errorlevel 1 (
    echo ❌ Verificación fallida
    pause
    exit /b 1
)

:: Crear directorios necesarios
if not exist "analysis_results" mkdir analysis_results
if not exist "examples" mkdir examples

:: Crear video de ejemplo si no existe
if not exist "examples\sprint_ejemplo.mp4" (
    echo 🎬 Creando video de ejemplo...
    python -c "
import cv2
import numpy as np
# Crear un video simple de ejemplo
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter('examples/sprint_ejemplo.mp4', fourcc, 30.0, (640, 480))
for i in range(300):  # 10 segundos
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(frame, f'Frame {i}', (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    out.write(frame)
out.release()
print('✅ Video de ejemplo creado')
"
)

echo.
echo ╔══════════════════════════════════════════╗
echo ║           ✅ INSTALACIÓN COMPLETADA      ║
echo ╚══════════════════════════════════════════╝
echo.
echo 🎯 Para ejecutar la aplicación:
echo    python run_sprint_analyzer.py
echo.
echo 📚 Documentación: README.md
echo 📞 Soporte: Incluye logs de error al reportar problemas
echo.
pause