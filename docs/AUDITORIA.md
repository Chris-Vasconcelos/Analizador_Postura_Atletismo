# Auditoría técnica de SprintBiomechPro

## 1. Base revisada

`main` en `a0c1178` contiene un lanzador que importa `src.analyzer_profesional` y `src.visualization` sin incluir el directorio `src/`. Una instalación limpia falla al iniciar. El PR #3 recupera el arranque y reúne el análisis en un solo motor. Tomamos su commit `58129f3` como base de `audit/azure-readiness`. Conviene integrar y validar esta línea antes de descargar o distribuir la rama principal. [Rama principal revisada](https://github.com/Chris-Vasconcelos/Analizador_Postura_Atletismo/tree/a0c1178) · [PR #3](https://github.com/Chris-Vasconcelos/Analizador_Postura_Atletismo/pull/3)

El escritorio y la consola comparten `analyze_video`. El cálculo usa coordenadas en píxeles y descarta puntos poco visibles o fuera del encuadre. Conserva `N/D`, nulos o celdas vacías cuando faltan mediciones. La interfaz mantiene el análisis en un hilo de trabajo y las cuatro exportaciones se publican juntas por sesión. El detector inyectable permite reproducir errores sin depender de MediaPipe en cada prueba.

## 2. Hallazgos y correcciones

| Hallazgo reproducido | Cambio en esta rama |
| --- | --- |
| El deslizador cambiaba el tiempo con el teclado y dejaba el fotograma anterior. | El cambio de posición actualiza la vista. Si falla la búsqueda directa, la vista intenta decodificar hasta el índice seleccionado. |
| Guardar texto inválido como peso impedía abrir el escritorio. | Los datos de perfil ilegibles o no finitos se muestran como «Sin indicar». |
| La CLI terminaba con `OverflowError` con tiempos extremos. | Se valida el inicio y se acota el final antes de convertirlos a fotogramas. |
| Fallar en la detección y en su cierre ocultaba la causa y dejaba una carpeta temporal. | Se intenta liberar cada recurso y se conserva el error original. La sesión se publica tras cerrar el detector. |
| El salto de OpenCV al recortar desde 13 s fallaba con el video incluido, que tiene FPS variables. | Se llega al índice inicial decodificando los fotogramas previos sin inferencia. Un inicio tardío puede costar más, pero evita el salto incorrecto. |
| La vista previa enviaba imágenes a Qt repetidamente y redibujaba toda la gráfica con un número creciente de puntos. | El trabajador limita la vista previa a unas 10 actualizaciones por segundo. La gráfica usa hasta aproximadamente 1,000 puntos durante el análisis y la CLI y las exportaciones conservan todos los fotogramas seleccionados. |

El panel y los arcos del prototipo usan los mismos valores que el CSV. Se incorporaron los ángulos de codo izquierdo y derecho al resumen y a las exportaciones. El esquema conserva sus campos anteriores y suma estas dos métricas. La interfaz y el MP4 muestran `N/D` cuando no se puede calcular un ángulo.

## 3. Verificación y prioridades

La matriz de GitHub Actions cubre Windows con Python 3.11 y 3.12, y Linux con Python 3.12. A la suite se añade una ejecución corta con MediaPipe real en la CLI para comprobar detección, cuatro archivos, recuentos y lectura del MP4. En Linux la imagen de Docker procesa los 209 fotogramas del video de muestra sin red y con un límite de 1 CPU y 2 GiB.

| Prioridad | Evidencia y siguiente verificación |
| --- | --- |
| Alta · Tiempos con FPS variables | En el video incluido, el cálculo por FPS medios se desvía hasta 0.463 s frente a las marcas temporales del archivo. Los recortes ya llegan al índice nominal sin el salto problemático, pero requieren una línea de tiempo por marcas de presentación para ser precisos en videos con FPS variables. Comparar selección, CSV y MP4 contra un conjunto de clips CFR y VFR. |
| Alta · Identidad y precisión | El video de muestra contiene varias personas y sirve para comprobar ejecución. Para validar la técnica, usar grabaciones laterales de un solo atleta con articulaciones anotadas y publicar error y cobertura por articulación y fase. Antes de analizar grabaciones con varios atletas, evaluar selección y seguimiento de una identidad. |
| Alta · Windows físico | Probar ambos `.bat` en una ruta con espacios y acentos, guardado en Documentos, apertura del PDF, cancelación y videos de teléfonos. Las pruebas Qt offscreen y la CLI automatizada cubren otros flujos. |
| Media · Rendimiento y estabilidad | Comparar la misma muestra y un video largo en la laptop y en Azure. Medir subida, arranque, procesamiento, descarga y memoria por separado. La inferencia fue el componente de mayor coste en una medición local de la muestra. El motor retiene aún una fila por fotograma hasta exportar. |
| Media · Distribución y mantenimiento | Si se quiere un `.exe`, agregar un empaquetado Windows y probarlo en una máquina limpia con MediaPipe y los códecs. Mantener al día las dependencias de Python y la imagen base con pruebas de regresión. |

El alcance de esta revisión es funcional, de rendimiento inicial y de portabilidad. El [plan de Azure](AZURE.md) explica cómo probar la infraestructura real en una suscripción.
