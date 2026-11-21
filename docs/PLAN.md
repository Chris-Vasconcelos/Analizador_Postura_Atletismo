# Plan de trabajo y criterios de aceptación

| Etapa | Estado | Criterio para darla por cerrada |
| --- | --- | --- |
| 1. Beta de escritorio | Publicada en `audit/azure-readiness`. La matriz de Windows y Linux ejecuta pruebas y análisis real con MediaPipe. | En una PC Windows física, instalar desde el ZIP en una ruta con espacios, analizar un video propio, cancelar otro y abrir los cuatro archivos. Registrar el modelo de CPU, duración del clip y tiempo de análisis. |
| 2. Piloto Azure | Imagen Linux amd64 probada sin red en GitHub Actions. La plantilla Bicep crea solo el Job manual sobre servicios existentes. | Validar en una suscripción y medir subida, arranque, análisis, descarga y costo. Una ejecución debe guardar exactamente una sesión completa en Azure Files. Comparar con el mismo video en la laptop. [Procedimiento de Azure](AZURE.md) |
| 3. Parciales de 100 m | Diseño pendiente. El cálculo actual acepta distancia total declarada. | Marcar los cruces de 0, 10, 30, 60 y 100 m en una grabación calibrada. Usar las marcas temporales del video, validar orden y medir velocidades medias por tramo. Comparar con cronometraje de referencia y registrar error. |
| 4. Validación técnica | La muestra actual prueba que el motor ejecuta, con varias personas y FPS variables. | Probar videos laterales autorizados y anotados, con atletas distintos, clips de FPS constantes y variables, eventos de contacto e identidad del atleta. Registrar error por articulación, fase y toma, además de cobertura. |
| 5. Distribución comercial | Auditoría inicial de licencias y procedencia hecha. | Confirmar titularidad, decidir la modalidad de licencia de escritorio o servicio, inventariar el paquete final, verificar los permisos del material y definir términos de tratamiento de videos. Después probar el instalador del canal elegido. [Revisión de licencias](LICENCIAS.md) |

Las puntuaciones, las comparativas con élite y las estimaciones de potencia quedan para después de validar las mediciones que las alimentarían. La [matriz de requisitos](REQUISITOS-2.1.md) conserva el alcance completo de la versión 2.1.
