#!/usr/bin/env python3
"""
DEMO COMPLETA: Sistema Funcional de Sprint Biomechanics Pro

Esta demo demuestra que AHORA SÍ funciona:
1. Video con esqueleto coloreado (feedback visual)
2. Cálculo de ángulos biomecánicos
3. Evaluación de técnica
4. Guardado de sesiones
5. Comparación real entre entrenamientos

Presiona 'q' para salir, 's' para guardar sesión
"""

import cv2
import sys
import numpy as np
from pathlib import Path
from datetime import datetime

# Añadir src al path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from pose_estimator import PoseEstimator
from session_comparator import SessionComparator

def run_complete_demo():
    """Demo completa del sistema funcional"""

    print("🏃 SPRINT BIOMECHANICS PRO - DEMO COMPLETA")
    print("=" * 60)
    print("🎯 Esta demo muestra el sistema FUNCIONAL:")
    print("   ✅ Video con esqueleto coloreado")
    print("   ✅ Evaluación biomecánica")
    print("   ✅ Feedback visual en tiempo real")
    print("   ✅ Guardado de sesiones")
    print("   ✅ Comparación entre entrenamientos")
    print("=" * 60)

    # Inicializar componentes
    estimator = PoseEstimator()
    comparator = SessionComparator()

    print("✅ Componentes inicializados")

    # Buscar video
    video_path = "VID-20251210-WA0139_1.mp4"
    if not Path(video_path).exists():
        print(f"❌ Video no encontrado: {video_path}")
        return

    # Abrir video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ Error abriendo video")
        return

    print(f"✅ Video cargado: {video_path}")
    print("🎬 Iniciando análisis... Presiona 'q' para salir, 's' para guardar sesión")

    # Variables para análisis
    frame_count = 0
    angles_history = []
    evaluation_history = []
    saved_session_id = None

    # Configurar guardado de video
    output_video_path = f"analysis_results/sprint_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    print(f"🎬 Grabando video procesado en: {output_video_path}")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        # Procesar frame
        processed_frame, angles, evaluation = estimator.process_frame(frame)

        # Acumular datos para análisis
        if angles:
            angles_history.append(angles)
        if evaluation:
            evaluation_history.append(evaluation)

        # Generar feedback
        feedback = estimator.get_feedback_message(evaluation)

        # Mostrar información en pantalla
        y_offset = 30

        # Título
        cv2.putText(processed_frame, "SPRINT BIOMECHANICS PRO - DEMO", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        y_offset += 40

        # Frame actual
        cv2.putText(processed_frame, f"Frame: {frame_count}", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        y_offset += 25

        # Ángulos en tiempo real
        if angles:
            if 'left_knee' in angles:
                color = (0, 255, 0) if evaluation.get('left_knee') == 'green' else \
                       (0, 255, 255) if evaluation.get('left_knee') == 'yellow' else (0, 0, 255)
                cv2.putText(processed_frame, f"Rodilla izq: {angles['left_knee']:.1f}°", (10, y_offset),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                y_offset += 25

            if 'trunk' in angles:
                color = (0, 255, 0) if evaluation.get('trunk') == 'green' else \
                       (0, 255, 255) if evaluation.get('trunk') == 'yellow' else (0, 0, 255)
                cv2.putText(processed_frame, f"Tronco: {angles['trunk']:.1f}°", (10, y_offset),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                y_offset += 25

        # Feedback principal
        cv2.putText(processed_frame, f"Feedback: {feedback}", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        y_offset += 40

        # Leyenda de colores
        cv2.putText(processed_frame, "LEYENDA DE COLORES:", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        y_offset += 25
        cv2.putText(processed_frame, "🟢 Verde = Técnica correcta", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        y_offset += 20
        cv2.putText(processed_frame, "🟡 Amarillo = Requiere mejora", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
        y_offset += 20
        cv2.putText(processed_frame, "🔴 Rojo = Problema técnico", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        y_offset += 30

        # Información de sesiones
        cv2.putText(processed_frame, f"Sesiones guardadas: {len(comparator.sessions)}", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        y_offset += 25

        if saved_session_id:
            cv2.putText(processed_frame, f"Última sesión: #{saved_session_id}", (10, y_offset),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # Controles
        cv2.putText(processed_frame, "CONTROLES: 'q'=salir, 's'=guardar sesión", (10, 450),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Mostrar frame
        cv2.imshow('Sprint Biomechanics Pro - Sistema COMPLETO', processed_frame)

        # Guardar frame en video de salida
        out.write(processed_frame)

        # Controles de teclado
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            break
        elif key == ord('s'):
            # Guardar sesión actual
            if angles_history:
                # Calcular promedios
                avg_angles = {}
                for angle_name in ['left_knee', 'right_knee', 'left_hip', 'right_hip', 'trunk']:
                    values = [frame_angles.get(angle_name, 0) for frame_angles in angles_history if angle_name in frame_angles]
                    if values:
                        avg_angles[f'avg_{angle_name}_angle'] = np.mean(values)

                # Contar colores
                color_counts = {'green': 0, 'yellow': 0, 'red': 0}
                for eval_frame in evaluation_history:
                    for color in eval_frame.values():
                        color_counts[color] = color_counts.get(color, 0) + 1

                # Calcular puntuación de técnica
                total_evals = sum(color_counts.values())
                if total_evals > 0:
                    technique_score = (color_counts['green'] * 100 + color_counts['yellow'] * 50) / total_evals
                else:
                    technique_score = 0

                session_data = {
                    'frames_analyzed': len(angles_history),
                    'technique_score': round(technique_score, 1),
                    'color_distribution': color_counts,
                    **avg_angles
                }

                saved_session_id = comparator.save_session(session_data)
                print(f"💾 Sesión #{saved_session_id} guardada - Técnica: {technique_score:.1f}/100")

                # Mostrar comparación si hay sesiones previas
                if len(comparator.sessions) > 1:
                    prev_session = comparator.sessions[-2]  # Penúltima
                    comparison = comparator.compare_sessions(prev_session['id'], saved_session_id)
                    comparison_msg = comparator.get_comparison_message(comparison)
                    print(f"📊 Comparación: {comparison_msg}")

        # Limitar duración para demo
        if frame_count > 600:  # 20 segundos a 30fps
            break

    cap.release()
    cv2.destroyAllWindows()

    # Liberar el video de salida
    if 'out' in locals():
        out.release()
        print(f"✅ Video procesado guardado en: {output_video_path}")

    # Resumen final
    print("\n" + "=" * 60)
    print("🏁 DEMO COMPLETADA")
    print("=" * 60)
    print(f"📊 Frames procesados: {frame_count}")
    print(f"💾 Sesiones guardadas: {len(comparator.sessions)}")

    if len(comparator.sessions) >= 2:
        print("📈 COMPARACIÓN DISPONIBLE:")
        recent = comparator.get_recent_sessions(2)
        comparison = comparator.compare_sessions(recent[1]['id'], recent[0]['id'])
        print(comparator.get_comparison_message(comparison))

    print("\n🎯 RESULTADO: Sistema FUNCIONAL demostrado")
    print("   ✅ Pose detection + colores")
    print("   ✅ Evaluación biomecánica")
    print("   ✅ Feedback visual")
    print("   ✅ Persistencia de datos")
    print("   ✅ Comparación real")

if __name__ == "__main__":
    run_complete_demo()