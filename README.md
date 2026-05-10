# Sprint Biomechanics Pro - 100m Sprint Analyzer

## 📋 Descripción

Sprint Biomechanics Pro es una aplicación profesional para el análisis biomecánico de carreras de 100 metros. Utiliza inteligencia artificial (MediaPipe) para detectar poses corporales en video y proporciona métricas detalladas sobre técnica, velocidad y eficiencia del atleta.

**Versión 2.1** - Incluye análisis por fases específicas y estándares de élite.

## ✨ Características Principales

### 🎯 Análisis Biomecánico Completo
- **Detección de Pose**: MediaPipe AI para tracking corporal preciso
- **Métricas en Tiempo Real**: Velocidad, ángulos articulares, aceleración
- **Análisis de Salida**: Tiempo de reacción y técnica de tacos
- **Análisis por Fases**: Evaluación específica de cada segmento (0-10m, 10-30m, 30-60m, 60-100m)
- **Puntuaciones Globales**: Técnica, potencia y eficiencia

### 📊 Visualización Profesional
- **Gráficos Interactivos**: Perfiles de velocidad y ángulos
- **Video con Overlays**: Visualización de poses detectadas
- **Dashboard Completo**: Métricas organizadas por pestañas
- **Reportes PDF**: Documentos profesionales con resultados
- **Exportación de Datos**: CSV y JSON para análisis externo

### 🛠️ Tecnologías Avanzadas
- **MediaPipe 0.10.5**: Detección de poses de última generación
- **PyQt5**: Interfaz gráfica moderna y responsiva
- **PyQtGraph**: Gráficos científicos en tiempo real
- **OpenCV**: Procesamiento avanzado de video
- **ReportLab**: Generación de PDF profesionales
- **SciPy/NumPy**: Análisis matemático avanzado

## 🚀 Instalación y Uso

### Prerrequisitos
- Python 3.11.9
- Windows 10/11
- Webcam o video de sprint

### Instalación Automática
```bash
# Ejecutar el instalador
instalar_proyecto.bat
```

### Instalación Manual
```bash
# Crear entorno virtual
python -m venv venv
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 🎥 Uso con Tus Propios Videos

#### 1. Ejecutar la Aplicación
```bash
python run_sprint_analyzer.py
```

#### 2. Cargar Tu Video
- **Formato soportado**: MP4, AVI, MOV
- **Resolución recomendada**: 1080p o superior
- **Contenido**: Sprint completo desde salida hasta meta
- **Iluminación**: Buena luz, atleta completamente visible
- **Ángulo**: Vista lateral (plano sagital)

**Pasos:**
1. Haz clic en "📁 Cargar Video"
2. Selecciona tu archivo de video
3. Espera a que aparezca el preview con detección de poses

#### 3. Análisis Automático
- Presiona "⚡ Analizar Sprint"
- Observa métricas actualizándose en tiempo real
- Revisa las pestañas: Velocidad, Ángulos, Salida, Mejoras

#### 4. Generar Reporte Profesional
- Haz clic en "📄 Generar PDF"
- Elige ubicación y nombre del archivo
- Obtén reporte completo con todas las métricas

#### 5. Exportar Datos para Análisis (NUEVO v2.1)
- **CSV**: Compatible con Excel, SPSS, R
- **JSON**: Para análisis programático avanzado
- Datos incluyen: timestamps, ángulos, velocidad, aceleración, métricas por fase

### 💡 Consejos para Mejores Resultados

- **Iluminación**: Usa videos con buena luz natural o artificial
- **Fondo**: Evita fondos complejos o con movimiento
- **Estabilidad**: Mantén la cámara fija durante la grabación
- **Distancia**: El atleta debe ocupar ~70% del frame
- **Duración**: Incluye al menos 6-8 segundos de carrera

### 📊 Qué Analiza Automáticamente

#### Métricas Biomecánicas
- **Velocidad máxima** y perfil de aceleración
- **Ángulos articulares**: Cadera, rodilla, tronco
- **Tiempo de reacción** desde señal de salida
- **Frecuencia de pasos** y longitud de zancada
- **Simetría bilateral** izquierda/derecha

#### Puntuaciones Inteligentes
- **Técnica (0-100)**: Calidad de forma y ejecución
- **Potencia (0-100)**: Fuerza generada en salida
- **Eficiencia (0-100)**: Economía de movimiento

#### Recomendaciones Personalizadas
- Sugerencias específicas basadas en tus métricas
- Comparación con estándares profesionales
- Planes de mejora técnica

## 🎯 Ejemplos de Uso

### Para Entrenadores
```
1. Graba sprint de atleta con smartphone
2. Carga video en la aplicación
3. Obtén análisis biomecánico detallado
4. Genera PDF para compartir con atleta
5. Rastrea progreso en sesiones siguientes
```

### Para Atletas
```
1. Graba tus propios entrenamientos
2. Analiza técnica de salida y carrera
3. Identifica áreas de mejora específicas
4. Sigue recomendaciones para optimizar rendimiento
5. Compara progreso semana a semana
```

### Para Investigación
```
1. Analiza múltiples atletas
2. Compara técnicas entre diferentes niveles
3. Genera reportes estandarizados
4. Exporta datos para análisis estadístico
5. Valida intervenciones de entrenamiento
```

## � Novedades Versión 2.1

### ✨ Nuevas Características
- **🧪 Análisis por Fases Específicas**: Evaluación detallada de cada segmento del sprint (salida, aceleración, velocidad máxima, mantenimiento)
- **🏆 Comparativa con Élite**: Estándares basados en récords mundiales y atletas de élite
- **📊 Exportación Avanzada**: Datos CSV/JSON para análisis externo (Excel, SPSS, R, Python)
- **🔧 Instalador Mejorado**: Setup automático con verificación de dependencias
- **📈 Recomendaciones Inteligentes**: Sugerencias específicas basadas en análisis por fases
- **🎯 Evaluación de Fatiga**: Análisis de caída de velocidad en la fase final

### 🔧 Mejoras Técnicas
- **Requisitos consolidados**: Versiones exactas para compatibilidad garantizada
- **Manejo de errores mejorado**: Mensajes más claros y opciones de respaldo
- **Estructura modular**: Código más organizado y mantenible
- **Documentación actualizada**: Guías completas para todas las nuevas funciones

```
SprintBiomechPro/
├── run_sprint_analyzer.py      # 🚀 Aplicación principal
├── install.bat                 # ⚙️ Instalador mejorado (v2.1)
├── requirements.txt            # 📦 Dependencias consolidadas
├── README.md                   # 📖 Documentación completa
├── src/
│   ├── __init__.py
│   ├── analyzer.py             # 🔍 Análisis biomecánico básico
│   ├── sprint_phase_analyzer.py # 🏃 Análisis por fases (NUEVO v2.1)
│   ├── compare.py              # 📊 Comparación de análisis
│   ├── config.py               # ⚙️ Configuración del sistema
│   ├── gui.py                  # 🖥️ Interfaz gráfica principal
│   ├── report.py               # 📄 Generación de reportes PDF
│   ├── utils.py                # 🛠️ Utilidades + exportación CSV/JSON
│   ├── video_annotator.py      # 🎬 Anotación de video
│   └── gui/                    # 🖼️ Módulos de interfaz
│       ├── sprint_dashboard.py # 📊 Dashboard principal
│       └── __init__.py
├── config/
│   └── elite_standards.json    # 🏆 Estándares de élite (NUEVO v2.1)
├── analysis_results/           # 💾 Resultados guardados
├── examples/                   # 🎥 Videos de ejemplo
├── venv/                       # 🐍 Entorno virtual Python
└── *.mp4                       # 📹 Videos de usuario
```

## 🔧 Configuración

### Variables de Entorno
```bash
# Configuración opcional
export SPRINT_ANALYZER_DEBUG=1
export SPRINT_ANALYZER_MAX_FPS=30
```

### Configuración de MediaPipe
- **Modo**: Imagen estática/dinámica
- **Complejidad**: 0-2 (0=rápido, 2=preciso)
- **Confianza Mínima**: 0.5 (detección), 0.5 (tracking)

## 📊 Métricas Analizadas

### Velocidad y Aceleración
- Perfil de velocidad completo
- Aceleración máxima
- Velocidad punta
- Análisis de fatiga (caída de velocidad)

### Ángulos Corporales
- Ángulo de cadera
- Ángulo de rodilla
- Ángulo de tronco
- Ángulos óptimos por fase

### Técnica de Salida
- Tiempo de reacción
- Salida de tacos
- Ángulos iniciales

### Análisis por Fases (NUEVO v2.1)
- **Fase de Salida (0-10m)**: Reacción y fuerza explosiva
- **Aceleración (10-30m)**: Desarrollo de velocidad
- **Velocidad Máxima (30-60m)**: Pico de rendimiento
- **Mantenimiento (60-100m)**: Resistencia y fatiga

### Puntuaciones Globales
- **Técnica** (0-100): Calidad de forma
- **Potencia** (0-100): Fuerza generada
- **Eficiencia** (0-100): Economía de movimiento

### Comparativa con Élite (NUEVO v2.1)
- Estándares de atletas como Usain Bolt, Christian Coleman
- Evaluación contra récords mundiales
- Recomendaciones específicas por nivel

## 🎯 Recomendaciones del Sistema

El sistema proporciona recomendaciones personalizadas basadas en:
- Tiempos de reacción (< 150ms = excelente)
- Perfiles de velocidad
- Ángulos articulares óptimos
- Técnica de zancada

## 🐛 Solución de Problemas

### MediaPipe no Detecta Poses
- Verifica iluminación del video
- Asegura que el atleta sea visible completamente
- Prueba con videos de mejor calidad

### Error de Memoria
- Reduce resolución del video
- Cierra otras aplicaciones
- Aumenta RAM del sistema

### GUI no Responde
- Verifica instalación de PyQt5
- Actualiza drivers gráficos
- Ejecuta como administrador

## 📈 Rendimiento

### Requisitos Mínimos
- **CPU**: Intel i5 o equivalente
- **RAM**: 8GB
- **GPU**: Opcional (acelera MediaPipe)
- **Almacenamiento**: 2GB libres

### Rendimiento Típico
- **Análisis**: 2-5 segundos por video
- **Detección**: 30 FPS en tiempo real
- **PDF**: < 1 segundo

## 🤝 Contribuciones

### Desarrollo
1. Fork el repositorio
2. Crea rama feature (`git checkout -b feature/nueva-funcion`)
3. Commit cambios (`git commit -am 'Agrega nueva función'`)
4. Push (`git push origin feature/nueva-funcion`)
5. Abre Pull Request

### Reportar Bugs
- Usa GitHub Issues
- Incluye video de ejemplo
- Describe pasos para reproducir
- Adjunta logs de error

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo LICENSE para detalles.

## 🙏 Agradecimientos

- **Google MediaPipe**: Por la tecnología de detección de poses
- **PyQt5 Community**: Por el framework de GUI
- **SciPy Ecosystem**: Por las bibliotecas científicas

## 📞 Contacto

Para soporte técnico o consultas:
- Email: support@sprintbiomech.com
- GitHub Issues: [Reportar problema](https://github.com/your-repo/issues)
- Documentación: [Wiki](https://github.com/your-repo/wiki)

---

**Versión**: 2.0
**Última actualización**: Diciembre 2024
**Compatibilidad**: Windows 10/11, Python 3.11+

## 📋 Requisitos del Sistema

- **Python**: 3.8+
- **RAM**: 8GB mínimo
- **GPU**: Recomendado para procesamiento en tiempo real
- **OS**: Windows 10+, macOS 10.15+, Linux

## 🛠️ Instalación

1. **Clonar o descargar el proyecto**
2. **Crear entorno virtual**:
   ```bash
   python -m venv venv
   ```
3. **Activar entorno**:
   ```bash
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```
4. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

## 🎮 Uso

### Ejecución Rápida (Windows)
```bash
run_sprint_analyzer.bat
```

### Ejecución Manual
```bash
python run_sprint_analyzer.py
```

### Flujo de Análisis
1. **Cargar video**: Seleccionar video de sprint 100m
2. **Análisis automático**: El sistema procesa todas las fases
3. **Visualización**: Métricas en tiempo real y gráficos
4. **Reporte**: Recomendaciones técnicas específicas

## 📊 Métricas Analizadas

### Salida de Tacos
- Tiempo de reacción (ideal: <150ms)
- Ángulos de set position (cadera: 90-110°, rodilla: 120-140°)
- Potencia explosiva
- Eficiencia de transición

### Carrera
- Velocidad máxima (élite: 11.5-12.0 m/s)
- Frecuencia de pasos (4.8-5.0 Hz)
- Longitud de paso (2.4-2.5 m)
- Ángulos de zancada
- Simetría izquierda-derecha

## 🎯 Sistema de Puntuación

- **0-20 puntos**: Tiempo de reacción
- **0-30 puntos**: Velocidad máxima
- **0-50 puntos**: Técnica general
- **Total: 0-100 puntos**

## 🔬 Tecnologías Utilizadas

- **MediaPipe**: Detección de pose y landmarks
- **OpenCV**: Procesamiento de video
- **PyQt5**: Interfaz gráfica profesional
- **PyQtGraph**: Gráficos en tiempo real
- **NumPy/SciPy**: Cálculos matemáticos
- **FilterPy**: Filtros Kalman para suavizado

## 📈 Comparativas con Élite

El sistema incluye estándares de atletas de élite:

- **Masculino**: Usain Bolt, Christian Coleman
- **Femenino**: Florence Griffith-Joyner, Shelly-Ann Fraser-Pryce

Comparativas automáticas para identificar gaps de rendimiento.

## 🎓 Recomendaciones Técnicas

Sistema inteligente que genera recomendaciones específicas:

- **Tiempo de reacción alto**: Entrenamiento con señales auditivas
- **Salida lenta**: Ejercicios pliométricos
- **Velocidad baja**: Trabajo con sobrecargas
- **Frecuencia baja**: Ejercicios de skiping

## 🔧 Configuración Avanzada

### Archivo `config/sprint_standards.yaml`
```yaml
sprint_100m_standards:
  elite_male:
    reaction_time: 0.120-0.150
    max_velocity: 11.5-12.0
    step_frequency: 4.8-5.0
  # ... más estándares
```

### Parámetros de MediaPipe
- `model_complexity: 2` (máxima precisión)
- `min_detection_confidence: 0.8`
- `min_tracking_confidence: 0.8`

## 📝 Notas de Desarrollo

- Arquitectura modular para fácil extensión
- Procesamiento en tiempo real posible
- Soporte para múltiples cámaras
- Exportación de datos a CSV/Excel

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Añade nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Crear issue en GitHub
- Email: support@sprintbiomech.com

---

**Desarrollado con ❤️ para atletas, entrenadores y científicos del deporte**