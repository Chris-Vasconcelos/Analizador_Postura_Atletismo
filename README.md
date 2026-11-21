# Bolt Reboot — Sprint Biomechanics Pro (Web v2.1)

Aplicación web profesional para el análisis biomecánico de carreras de 100 metros, migrada desde la versión de escritorio Python/PyQt5 a **React + TypeScript + Vite + MediaPipe Tasks Vision**.

## Características Principales

- **Monitor Cinemático en Tiempo Real**: Carga videos laterales de sprint (`MP4`, `WEBM`, `MOV`) y procesa poses corporales en el navegador con **MediaPipe Pose Landmarker** (`@mediapipe/tasks-vision`), con overlay de esqueleto coloreado (verde/amarillo/rojo) y mejora visual CLAHE/HSV.
- **Simulador Demo 100m Integrado**: Perfiles cinemáticos completos (*Demo Sprint Élite 9.88s* y *Demo Sprint Club 11.05s*) para probar métricas, fases y comparaciones al instante.
- **6 Métricas Dinámicas en Vivo**: Ángulo Rodilla D, Ángulo Rodilla I, Tiempo de Reacción, Confianza, Inclinación de Tronco y Contactos.
- **Gráficas Interactivas**: Curvas en vivo de ángulo de rodilla, simetría bilateral, velocidad y postura.
- **Análisis por Fases (v2.1)**: Desglose automático de Salida (0–10m), Aceleración (10–30m), Velocidad Máxima (30–60m) y Mantenimiento (60–100m), con comparativa frente a estándares de élite (Usain Bolt, Christian Coleman, Florence Griffith-Joyner, Shelly-Ann Fraser-Pryce).
- **Historial y Comparación de Sesiones**: Persistencia local (`localStorage`) para guardar entrenamientos y calcular deltas de mejora.
- **Reporte Final y Exportación**: Generación de **PDF** (`jsPDF`), **CSV**, **JSON** y **Resumen (.txt)**.

## Desarrollo

```bash
npm install
npm run dev
```

El servidor de desarrollo se inicia en `http://0.0.0.0:3000`.