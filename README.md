# Sprint Biomechanics Pro - 100m Sprint Analyzer

## 📋 Descripción

Sprint Biomechanics Pro es una aplicación profesional **de escritorio (Python + PyQt5 + MediaPipe + OpenCV)** para el análisis biomecánico de carreras de 100 metros. Utiliza inteligencia artificial (MediaPipe) para detectar poses corporales en video y proporciona métricas detalladas sobre técnica, velocidad y eficiencia del atleta.

**Versión 2.1** - Incluye el proyecto original de escritorio completo (con los módulos `src/*.py` y `config/elite_standards.json` implementados) **más** una interfaz web paralela en React/TypeScript/Vite para vista previa en navegador.

## 🖥️ Ejecución en Escritorio (Python / PyQt5 — Principal)

### Prerrequisitos
- Python 3.11+
- Windows 10/11 (o Linux/macOS con PyQt5)
- Webcam o video de sprint lateral

### Instalación Rápida (Windows)
```bash
install.bat
run_sprint_analyzer.bat
```

### Instalación Manual
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python run_sprint_analyzer.py
```

### Scripts de Escritorio Incluidos
- `run_sprint_analyzer.py`: Aplicación principal PyQt5 + PyQtGraph (`ModernSprintDashboard`).
- `demo_completo.py`: Demo OpenCV con esqueleto coloreado y guardado/comparación de sesiones.
- `save_processed_video.py`: Exportación de video procesado con esqueleto coloreado.
- `test_pose_system.py`: Prueba rápida del detector de pose.
- `src/analyzer_profesional.py`: Motor biomecánico (`BiomechSprintAnalyzer`, `AnalysisConfig`), suavizado Savitzky-Golay, contactos, reacción, 4 fases y comparativa élite.
- `src/visualization.py`: Generación de gráficas PNG y exportación PDF/CSV/JSON/TXT (`SprintVisualizer`).
- `src/pose_estimator.py`: Estimador MediaPipe con esqueleto coloreado verde/amarillo/rojo (`PoseEstimator`).
- `src/session_comparator.py`: Persistencia y comparación de sesiones en `analysis_results/sessions.json` (`SessionComparator`).
- `config/elite_standards.json`: Estándares de atletas de élite (Usain Bolt, Christian Coleman, Florence Griffith-Joyner, Shelly-Ann Fraser-Pryce).

## 🌐 Vista Previa Web (React + Vite + MediaPipe Tasks Vision)

Adicionalmente, el repositorio incluye los archivos web (`package.json`, `index.html`, `vite.config.ts`, `src/*.tsx`, `src/engine/*.ts`, `src/components/*.tsx`, `src/utils/*.ts`) para vista previa en navegador:

```bash
npm install
npm run dev
```

## ✨ Características Principales

### 🎯 Análisis Biomecánico Completo
- **Detección de Pose**: MediaPipe AI para tracking corporal preciso
- **Métricas en Tiempo Real**: Velocidad, ángulos articulares, aceleración
- **Análisis de Salida**: Tiempo de reacción y técnica de tacos
- **Análisis por Fases**: Evaluación específica de cada segmento (0-10m, 10-30m, 30-60m, 60-100m)
- **Puntuaciones Globales**: Técnica, potencia y eficiencia

### 📊 Visualización y Exportación
- **Gráficos Interactivos**: Perfiles de velocidad y ángulos
- **Video con Overlays**: Visualización de poses detectadas y esqueleto coloreado
- **Reportes PDF**: Documentos profesionales con resultados
- **Exportación de Datos**: CSV, JSON y resumen TXT

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.