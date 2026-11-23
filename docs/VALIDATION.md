# Registro de validación — recuperación de SprintBiomechPro

## Problemas encontrados en la base

- `main` (a0c1178) importaba `src.analyzer_profesional` y `src.visualization`, pero no incluía `src/`.
- La rama del PR #1 contenía `BiomechSprintAnalyzer.analyze()` que devolvía un objeto simulado. La interfaz seguía procesando con MediaPipe aunque el PR anunciaba otra integración.
- No se localizaron campos de peso o estatura en los commits disponibles; se reconstruyeron.
- La finalización del hilo iniciaba trabajo adicional en el hilo de interfaz, y errores/cancelación no tenían estados separados.
- Los scripts auxiliares importaban componentes ausentes. Ahora usan el mismo motor real de la aplicación.

## Comprobado en esta revisión

- Python 3.12.14 en Linux; dependencias instaladas en entorno aislado.
- 15 pruebas automatizadas aprobadas: geometría en píxeles, datos ausentes, validación de entradas, tiempos de cámara lenta, exportaciones, cancelación, limpieza tras error, estados de interfaz y limpieza al cargar otro video.
- Video real del repositorio: `VID-20251210-WA0139_1.mp4`, 832×464, 209 fotogramas, 14.499 FPS, 14.415 s.
- MediaPipe ejecutado sobre todo el video; se generaron MP4, CSV, JSON y PDF. Esta prueba verifica ejecución, **no exactitud biomecánica**.
- Prueba de interfaz con Qt offscreen: carga, entrada de peso y estatura, análisis completo con trabajador real, activación de botones de resultados y apertura de la pestaña de resultados.
- Revisión visual de la ventana inicial, pestaña de resultados y PDF renderizado.

## Límites y siguiente aceptación

- Falta una prueba interactiva en una PC Windows física: instalar con `install.bat`, abrir con el lanzador, confirmar lectura/escritura en Documentos y apertura del PDF con el programa predeterminado.
- CI confirmado en el commit `58129f3`: las 15 pruebas aprobaron en Windows con Python 3.11 y 3.12, y en Linux con Python 3.12. Ejecución: https://github.com/Chris-Vasconcelos/Analizador_Postura_Atletismo/actions/runs/44854553438 .
- El fallo inicial de Windows era una lectura del JSON sin codificación explícita dentro de una prueba. Se corrigió a UTF-8 y se verificó que el nombre con acento se conserva; el exportador ya escribía UTF-8.
- El video de muestra contiene varias personas. Sin selección de identidad no se puede asegurar que todos los ángulos sean del mismo atleta. Para uso exploratorio emplear un solo atleta en cuadro.
- Falta validar ángulos contra anotaciones manuales y registrar error por articulación, fase y vista de cámara antes de afirmar precisión.
- No se implementan aún contactos, reacción, cadencia, potencia, velocidad máxima ni distancia automática.
- Los FPS de captura y la distancia son datos declarados por el usuario: un valor incorrecto altera tiempos y velocidad media.

## Lista de aceptación manual en Windows

1. Abrir desde una ruta con espacios y cargar un video propio.
2. Guardar peso y estatura mediante un análisis, cerrar y volver a abrir: deben conservarse.
3. Cancelar a mitad del video: recuperar controles sin publicar una sesión parcial.
4. Finalizar un análisis: comprobar MP4, CSV, JSON y PDF de la misma sesión.
5. Cargar otro video: eliminar resultados anteriores de la pantalla.
6. Intentar abrir un archivo inválido y guardar en carpeta sin permisos: debe mostrarse error, nunca éxito.
