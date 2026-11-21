# Plan de trabajo y criterios de aceptación

| Etapa | Estado | Criterio para darla por cerrada |
| --- | --- | --- |
| 1. Beta de escritorio | Publicada en `audit/azure-readiness`. La matriz de Windows y Linux ejecuta pruebas y análisis real con MediaPipe. | En una PC Windows física, instalar desde el ZIP en una ruta con espacios, analizar un video propio, cancelar otro y abrir los cuatro archivos. Registrar el modelo de CPU, duración del clip y tiempo de análisis. |
| 2. Piloto Azure | Imagen Linux amd64 probada sin red en GitHub Actions. La plantilla Bicep crea solo el Job manual sobre servicios existentes. | Validar en una suscripción y medir subida, arranque, análisis, descarga y costo. Una ejecución debe guardar exactamente una sesión completa en Azure Files. Comparar con el mismo video en la laptop. [Procedimiento de Azure](AZURE.md) |
| 3. Parciales de 100 m | Diseño pendiente. El cálculo actual acepta distancia total declarada. | Marcar 0, 10, 30, 60 y 100 m en una línea de tiempo sincronizada. Rechazar el cálculo de parciales si falta una marca o el orden es inválido. Calcular cada velocidad media con su propia distancia y duración y contrastarla con cronometraje de referencia. |
| 4. Validación técnica | La muestra histórica solo acredita ejecución. Tiene varias personas y FPS variables. | Aplicar el protocolo sagital y temporal. Validar ángulos y eventos contra referencias, con criterios definidos antes de medir. Informar error, cobertura y descartes por articulación, fase y FPS. |
| 5. Distribución comercial | Auditoría inicial de licencias y procedencia hecha. | Confirmar titularidad, decidir la modalidad de licencia de escritorio o servicio, inventariar el paquete final, verificar los permisos del material y definir términos de tratamiento de videos. Después probar el instalador del canal elegido. [Revisión de licencias](LICENCIAS.md) |

El siguiente paso es cerrar la prueba de escritorio en Windows físico. El piloto de Azure puede avanzar en paralelo con un video autorizado. Diseñar las etapas 3 y 4 juntas para que compartan la línea de tiempo, las referencias y la definición de los eventos. Antes de incorporar métricas de ramas antiguas, acordar sus claves, unidades y tratamiento de datos ausentes. [Protocolo y verificación de la revisión técnica](METROLOGIA.md)

Las puntuaciones, los semáforos, las comparativas con élite y las estimaciones de potencia quedan para después de validar las mediciones que los alimentarían. La [matriz de requisitos](REQUISITOS-2.1.md) conserva el alcance completo de la versión 2.1.
