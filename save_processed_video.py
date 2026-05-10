#!/usr/bin/env python3
"""
SCRIPT PARA GUARDAR VIDEO PROCESADO
Sprint Biomechanics Pro - Video con esqueleto coloreado

Uso: python save_processed_video.py [ruta_video_entrada] [ruta_video_salida]
"""

import cv2
import sys
from pathlib import Path
from datetime import datetime

# Añadir src al path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from pose_estimator import PoseEstimator

def save_processed_video(input_path: str, output_path: str = None):
    """Guardar video procesado con esqueleto coloreado"""

    if not Path(input_path).exists():
        print(f"❌ Video de entrada no encontrado: {input_path}")
        return

    if output_path is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_path = f"analysis_results/sprint_processed_{timestamp}.mp4"

    # Crear directorio si no existe
    Path(output_path).parent.mkdir(exist_ok=True)

    print(f"🎬 Procesando video: {input_path}")
    print(f"💾 Guardando en: {output_path}")

    # Inicializar componentes
    estimator = PoseEstimator()

    # Abrir video de entrada
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print("❌ Error abriendo video de entrada")
        return

    # Configurar video de salida
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_count = 0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"📊 Procesando {total_frames} frames a {fps} FPS...")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        # Procesar frame
        processed_frame, angles, evaluation = estimator.process_frame(frame)

        # Añadir información de progreso al frame
        progress = int((frame_count / total_frames) * 100)
        cv2.putText(processed_frame, f"Procesando: {progress}%", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # Guardar frame procesado
        out.write(processed_frame)

        # Mostrar progreso cada 100 frames
        if frame_count % 100 == 0:
            print(f"📈 Progreso: {frame_count}/{total_frames} frames ({progress}%)")

    # Liberar recursos
    cap.release()
    out.release()

    print("✅ ¡Video procesado completado!")
    print(f"📁 Ubicación: {output_path}")
    print(f"🎬 Duración: {total_frames/fps:.1f} segundos")
    print(f"📊 Frames procesados: {frame_count}")

    return output_path

def main():
    """Función principal"""
    if len(sys.argv) < 2:
        print("Uso: python save_processed_video.py <video_entrada> [video_salida]")
        print("Ejemplo: python save_processed_video.py mi_sprint.mp4")
        return

    input_video = sys.argv[1]
    output_video = sys.argv[2] if len(sys.argv) > 2 else None

    save_processed_video(input_video, output_video)

if __name__ == "__main__":
    main()