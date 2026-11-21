# Plan de trabajo y criterios de aceptación

| Etapa | Estado | Criterio para darla por cerrada |
| --- | --- | --- |
| 1. Beta de escritorio | Publicada en `audit/azure-readiness`. El ZIP, la CLI, el contenedor y la prueba de integración de GitHub Actions comparten el motor MediaPipe. | Pasar las pruebas de contrato y probar el ZIP en una PC Windows física, desde una ruta con espacios. Analizar un video propio, cancelar otro y abrir los cuatro archivos. Registrar CPU, duración del clip y tiempo de análisis. |
| 2. Piloto Azure | Imagen Linux amd64 probada sin red en GitHub Actions. La plantilla Bicep crea solo el Job manual sobre servicios existentes. | Validar en una suscripción y medir subida, arranque, análisis, descarga y costo. Una ejecución debe guardar exactamente una sesión completa en Azure Files. Comparar con el mismo video en la laptop. [Procedimiento de Azure](AZURE.md) |
| 3. Parciales de 100 m | Diseño pendiente. El cálculo actual acepta distancia total declarada. | Marcar 0, 10, 30, 60 y 100 m en una línea de tiempo sincronizada. Rechazar el cálculo de parciales si falta una marca o el orden es inválido. Calcular cada velocidad media con su propia distancia y duración y contrastarla con cronometraje de referencia. |
| 4. Validación técnica | La muestra histórica acredita ejecución. Tiene varias personas y FPS variables. | Aceptar cada métrica por separado con su referencia, protocolo de captura y criterios fijados antes de medir. Informar error, cobertura y descartes por articulación, fase y FPS. [Criterios por métrica](METROLOGIA.md#cierre-de-la-validación) |
| 5. Distribución comercial | Auditoría inicial de licencias y procedencia hecha. | Confirmar titularidad, decidir la modalidad de licencia de escritorio o servicio, inventariar el paquete final, verificar los permisos del material y definir términos de tratamiento de videos. Después probar el instalador del canal elegido. [Revisión de licencias](LICENCIAS.md) |

El siguiente paso es cerrar la prueba de escritorio en Windows físico. El piloto de Azure puede avanzar en paralelo con un video autorizado. Diseñar las etapas 3 y 4 juntas con una línea de tiempo común y una definición y procedencia para cada evento. Los cruces delimitan los parciales. Los contactos se anotan por separado sobre esa misma línea de tiempo. [Protocolo y verificación de la revisión técnica](METROLOGIA.md)

## Pendientes comprobados

- **Distancia y tiempo.** La beta admite una distancia total aportada por el usuario. La velocidad media usa esa distancia y la duración calculada a partir de los FPS. Faltan calibración espacial, cruces de distancia y marcas temporales fiables para FPS variables.
- **Ángulos.** La interfaz tiene una gráfica de rodilla derecha y exporta el resto de ángulos. Faltan validación contra referencias y rangos citados por fase para cualquier semáforo.
- **Eventos.** Contacto, vuelo y reacción están pendientes. Acordar claves, unidades y representación de ausencias antes de incorporarlos. La reacción requiere una señal sincronizada.
- **Cambio de motor.** Si se aprueba RTMPose, probar y validar el paquete exacto que se distribuya, incluidos su modelo y su licencia, antes de sustituir MediaPipe en la beta y en CI.

Las puntuaciones, los semáforos, las comparativas con élite y las estimaciones de potencia quedan para después de validar las mediciones que los alimentarían. La [matriz de requisitos](REQUISITOS-2.1.md) conserva el alcance completo de la versión 2.1.
