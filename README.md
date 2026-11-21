# SprintBiomechPro

Aplicación de escritorio para revisar videos de sprint, medir ángulos **proyectados en 2D** y guardar una sesión reproducible. Diseñada para Windows 10/11 y Python 3.11 o 3.12 de 64 bits. No requiere GPU.

## Qué funciona en esta versión

- Perfil con nombre, peso (kg) y estatura (cm), conservado entre ejecuciones.
- Carga y vista previa de MP4, MOV, AVI, MKV y M4V, según los códecs disponibles.
- Desplazamiento por el video y selección del intervalo de análisis.
- FPS de captura opcionales para archivos en cámara lenta.
- Análisis MediaPipe en segundo plano con progreso y cancelación.
- Ángulos de ambas rodillas, caderas y codos e inclinación del tronco, con cobertura por métrica.
- Panel y arcos que cambian con cada fotograma en `video_anotado.mp4` y aparecen en la vista previa durante el análisis.
- Distancia recorrida opcional para calcular **velocidad media declarada** del intervalo; no se estima distancia desde píxeles.
- Exportación conjunta: `video_anotado.mp4`, `fotogramas.csv`, `sesion.json` e `informe.pdf`.
- Una carpeta única por sesión; las sesiones canceladas o fallidas no se publican como resultados completos.

## Probar en Windows

1. Descarga el ZIP de **esta rama** desde GitHub (`Code → Download ZIP`) y extráelo. No ejecutes los archivos dentro del ZIP.
2. Instala Python **3.12 de 64 bits** (o 3.11), incluido el lanzador `py`, si aún no lo tienes.
3. Abre `install.bat`. Instala las dependencias en `.venv` dentro de esta carpeta; requiere Internet.
4. Cuando indique que terminó, abre `run_sprint_analyzer.bat`.
5. Introduce peso y estatura o déjalos en «Sin indicar». Carga el video y pulsa **Analizar video**.
6. Al terminar, abre el informe o la carpeta de resultados desde la aplicación.

Los resultados se guardan por defecto en `Documentos/SprintBiomechPro/sesiones`. Puedes cambiar la carpeta desde la aplicación. Conserva esa carpeta al actualizar el programa. El perfil se guarda en la configuración local del usuario de Windows.

Si falta alguna dependencia o se produce un error, el lanzador mantiene abierta la consola para leerlo. Ejecuta nuevamente `install.bat` para reparar la instalación. Esta versión no es un ejecutable portátil: requiere Python y las dependencias.

## Cómo grabar y seleccionar el video

- Usa cámara fija, vista lateral, buena iluminación y **un solo atleta visible**. El detector actual no permite seleccionar identidad entre varias personas; puede seguir a otra persona.
- Procura mantener todo el cuerpo dentro del encuadre. Una detección visible no garantiza una medición precisa.
- Usa la barra de vista previa para localizar el tramo útil. Inicio y final se expresan en segundos. Final en cero significa todo el resto del video. El motor convierte los tiempos usando los FPS medios del archivo. Para recortes y tiempos precisos, usa un video con FPS constantes.
- Si el archivo reproduce a 30 FPS constantes pero fue grabado a 120 FPS y conserva todos esos fotogramas, indica 120 en FPS de captura. El MP4 anotado se escribe a los FPS medios del archivo. La columna `time_s` del CSV usa los FPS de captura indicados, si los hay.
- Introduce distancia únicamente si conoces los metros recorridos **durante el intervalo exacto**. No introduzcas 100 m si solo seleccionas unos segundos de la carrera.
- El video incluido contiene varias personas y ~14.5 FPS: es una prueba técnica de procesamiento, no una validación biomecánica ni una medición fiable de contactos.

## Qué significan los resultados

Los ángulos usan coordenadas en píxeles respetando la relación de aspecto del video. Los puntos con visibilidad inferior a 0.65, no finitos o fuera del encuadre se omiten. Cada métrica tiene su propio número de fotogramas válidos. Los datos ausentes son campos vacíos en CSV, `null` en JSON y `N/D` en la interfaz y el PDF; nunca se sustituyen por cero.

La inclinación del tronco es el ángulo entre la línea caderas-hombros y la vertical de la imagen: depende de la orientación de la cámara. Las medias del intervalo completo mezclan fases de movimiento y **no son puntuaciones de técnica**. La cobertura no es una estimación de precisión.

Peso y estatura se guardan como contexto del atleta. No modifican los ángulos, y no se usan para inventar fuerzas o potencia. Reacción, contactos, cadencia, longitud de zancada y velocidad máxima siguen **pendientes de implementación y validación**. El seguimiento de identidad entre múltiples atletas también está pendiente.

## Línea de comandos

Con el entorno activado:

```console
python -m src.cli video.mp4 --athlete "Atleta" --mass 75 --height 178 --output analysis_results
python -m src.cli video.mp4 --start 2 --end 6 --capture-fps 120
```

Los antiguos scripts `demo_completo.py`, `save_processed_video.py` y `test_pose_system.py` ahora llaman al mismo motor. Usan la sintaxis de argumentos anterior (`--output` para carpeta), sin resultados simulados ni evaluaciones arbitrarias de técnica.

## Desarrollo y pruebas

```console
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux: source .venv/bin/activate
python -m pip install -r requirements.txt pytest
python -m pytest -q
```

Las pruebas de interfaz usan Qt `offscreen`. Consulta [el registro de validación](docs/VALIDATION.md) para distinguir comprobaciones realizadas de pruebas pendientes en Windows.

## Arquitectura

- `run_sprint_analyzer.py`: perfil, vista previa, control de estados y trabajador Qt.
- `src/analysis.py`: validación, detección, métricas, cancelación y exportación atómica.
- `src/cli.py`: interfaz de consola con el mismo motor.
- `tests/`: regresiones de datos ausentes, geometría, exportación, errores, cancelación y estados de interfaz.

## Auditoría y ejecución fuera de la laptop

- [Auditoría técnica por etapas](docs/AUDITORIA.md) con hallazgos reproducidos y prioridades de validación.
- [Ejecutar la CLI en Docker y preparar Azure](docs/AZURE.md) para procesar video en otra máquina y recuperar las cuatro exportaciones.

Los archivos `reporte_sprint.pdf` y `# Code Citations.md` en la raíz son históricos y no validan esta versión. Los informes actuales se generan por sesión.
