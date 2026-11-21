# Estado de los requisitos de Sprint Biomechanics Pro 2.1

## Qué se puede instalar y usar hoy

La beta analiza un archivo de video, muestra ángulos en 2D mientras lo procesa y guarda el MP4 anotado, CSV, JSON y PDF. Está preparada para probar en Windows 10/11 con Python 3.11 o 3.12 de 64 bits. Para instalarla desde el ZIP, extrae toda la carpeta, ejecuta `install.bat` y abre `run_sprint_analyzer.bat`. El ZIP requiere Python e Internet para instalar las dependencias. Los resultados se guardan en Documentos o en la carpeta elegida.

## Comparación con la descripción 2.1

| Requisito | Estado y alcance actual |
| --- | --- |
| Video MP4, AVI y MOV con vista previa y panel de resultados | **Disponible según el códec.** Se puede elegir un intervalo y cancelar el análisis. La entrada actual es un archivo local. Webcam y múltiples cámaras quedan pendientes. |
| Seguimiento con MediaPipe, ángulos y video anotado | **Disponible con límites.** Rodillas, caderas y codos de ambos lados, más inclinación del tronco. El modelo usa proyección 2D y filtro de visibilidad. La precisión queda por medir con anotaciones y el motor puede cambiar de persona cuando hay más de un atleta en cuadro. |
| Gráficos interactivos, pestañas y rendimiento en tiempo real | **Parcial.** Hay una gráfica de rodilla derecha durante el análisis y un resumen de medias y cobertura. Faltan perfiles de velocidad, vistas por fase y un modo en vivo. Los tiempos y FPS de rendimiento anunciados no están verificados. |
| PDF, CSV y JSON | **Disponible.** El PDF resume la sesión y sus límites. El CSV guarda tiempos y ángulos por fotograma. El JSON conserva configuración y estadísticas. Faltan series de velocidad, aceleración y métricas por fase. |
| Velocidad, aceleración y caída de velocidad por fatiga | **Parcial.** Se calcula la velocidad media únicamente cuando el usuario aporta la distancia del intervalo. Faltan perfil de velocidad, máxima, aceleración y caída en el tramo final. Una caída de velocidad tampoco demuestra por sí sola la causa. |
| Reacción y salida de tacos | **Pendiente.** Se requieren referencias sincronizadas para la señal de salida y el primer movimiento, además de una grabación adecuada. Los ángulos visibles ya se pueden revisar en el video. |
| Fases 0–10, 10–30, 30–60 y 60–100 m | **Pendiente.** Hace falta identificar cuándo cruza el atleta cada distancia. El tiempo o el índice del fotograma por sí solos no ubican esos puntos. |
| Cadencia, zancada, simetría y oscilación vertical | **Pendiente como métricas.** Hay ángulos por lado. Para estas métricas hacen falta eventos de contacto, identidad estable y, para distancias absolutas, una escala espacial. |
| Puntuaciones, potencia, eficiencia, comparativa élite y recomendaciones | **Pendiente.** Los resultados actuales no producen puntuaciones de técnica ni estimaciones de potencia. Una comparación necesita datos de referencia trazables obtenidos bajo condiciones comparables. |
| Instalador, configuración avanzada y portabilidad | **Parcial.** `install.bat` prepara un entorno virtual y verifica dependencias. La CI prueba Windows y Linux. Faltan validación en una PC Windows, un instalador autónomo si se desea, pruebas en macOS y los controles avanzados de MediaPipe descritos. |

## Etapas antes de venderla

1. **Beta para laptop.** Probar instalación, reproducción, exportación y cancelación en Windows físico. Medir el tiempo de análisis de videos reales antes de fijar requisitos mínimos o prometer velocidad. El [registro de auditoría](AUDITORIA.md) contiene los casos reproducidos y las prioridades técnicas.
2. **Parciales medibles.** Aceptar marcas de paso verificables en 0, 10, 30, 60 y 100 m y calcular velocidades medias por tramo. Para estimar velocidad a lo largo de la carrera, incorporar una trayectoria calibrada o una fuente externa sincronizada, conservar los tiempos reales del archivo y contrastar contra un cronometraje de referencia. Mantener la inferencia de ángulos y el cronometraje como mediciones independientes.
3. **Validación para clientes.** Comparar ángulos y eventos contra anotaciones manuales con varios atletas, cámaras y condiciones. Registrar error, cobertura y fallos por articulación o evento. Basar comparativas y recomendaciones en evidencia antes de anunciarlas.
4. **Distribución comercial.** Confirmar la titularidad, elegir las condiciones de distribución, revisar las dependencias del paquete final y verificar los permisos sobre los videos. [Auditoría de licencias y procedencia](LICENCIAS.md)
