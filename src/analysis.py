"""Single-pass video analysis. Missing observations stay missing, never zero."""
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
import csv
import json
import math
import shutil
import tempfile
from uuid import uuid4

import cv2
import numpy as np

METRICS = {
    'knee_right': 'Rodilla derecha', 'knee_left': 'Rodilla izquierda',
    'hip_right': 'Cadera derecha', 'hip_left': 'Cadera izquierda',
    'trunk': 'Inclinación del tronco',
}
LIMITATIONS = (
    'Ángulos proyectados en 2D: requieren vista lateral, cámara estable y un solo atleta. '
    'La cobertura indica detecciones utilizables, no precisión biomecánica. '
    'Peso y estatura son datos del perfil; no permiten deducir fuerzas de este video. '
    'Reacción, contactos, cadencia, potencia y velocidad máxima: no disponibles. '
    'La velocidad media, si se proporciona distancia, usa la distancia declarada y el intervalo seleccionado.'
)

@dataclass(frozen=True)
class AnalysisConfig:
    athlete: str = ''
    mass_kg: float | None = None
    height_cm: float | None = None
    start_s: float = 0.0
    end_s: float | None = None
    capture_fps: float | None = None
    distance_m: float | None = None
    visibility: float = 0.65

    def __post_init__(self):
        for key, lo, hi in [('mass_kg', 20, 300), ('height_cm', 80, 250),
                            ('capture_fps', 1, 1000), ('distance_m', .1, 10000)]:
            value = getattr(self, key)
            if value is not None and (not math.isfinite(value) or not lo <= value <= hi):
                raise ValueError(f'{key}: valor fuera de rango ({lo}–{hi}).')
        if not math.isfinite(self.start_s) or self.start_s < 0:
            raise ValueError('El inicio debe ser positivo o cero.')
        if self.end_s is not None and (not math.isfinite(self.end_s) or self.end_s <= self.start_s):
            raise ValueError('El final debe ser posterior al inicio.')
        if not 0 <= self.visibility <= 1:
            raise ValueError('Umbral de visibilidad inválido.')

class AnalysisCancelled(Exception):
    pass


def inspect_video(path):
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            raise ValueError('No se pudo abrir el video. Comprueba el archivo y su formato.')
        fps = cap.get(cv2.CAP_PROP_FPS)
        count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        ok, frame = cap.read()
        if not ok or not math.isfinite(fps) or fps <= 0 or count <= 0:
            raise ValueError('El video no contiene fotogramas o una tasa FPS válida.')
        return {'fps': fps, 'frames': count, 'duration': count / fps,
                'width': frame.shape[1], 'height': frame.shape[0]}, frame
    finally:
        cap.release()


def angle(a, b, c):
    u, v = np.asarray(a) - b, np.asarray(c) - b
    norm = np.linalg.norm(u) * np.linalg.norm(v)
    if norm < 1e-9:
        return None
    return float(np.degrees(np.arccos(np.clip(np.dot(u, v) / norm, -1, 1))))


def measure(landmarks, width, height, threshold):
    values = dict.fromkeys(METRICS)
    if landmarks is None:
        return values
    def point(i):
        p = landmarks[i]
        if (p.visibility < threshold or not all(math.isfinite(v) for v in (p.x, p.y, p.visibility))
                or not 0 <= p.x <= 1 or not 0 <= p.y <= 1):
            return None
        return np.array([p.x * width, p.y * height])
    for name, indices in {'knee_right': (24, 26, 28), 'knee_left': (23, 25, 27),
                          'hip_right': (12, 24, 26), 'hip_left': (11, 23, 25)}.items():
        pts = [point(i) for i in indices]
        if all(p is not None for p in pts):
            values[name] = angle(*pts)
    pts = [point(i) for i in (11, 12, 23, 24)]
    if all(p is not None for p in pts):
        shoulders, hips = (pts[0] + pts[1]) / 2, (pts[2] + pts[3]) / 2
        values['trunk'] = angle(shoulders, hips, hips + np.array([0., -1.]))
    return values


def summarize(rows):
    summary = {}
    for key in METRICS:
        data = [r[key] for r in rows if r[key] is not None]
        summary[key] = {'mean_deg': float(np.mean(data)) if data else None,
                        'min_deg': min(data) if data else None, 'max_deg': max(data) if data else None,
                        'valid_frames': len(data), 'coverage_pct': 100 * len(data) / len(rows) if rows else 0}
    return summary


class MediaPipeDetector:
    def __init__(self):
        import mediapipe as mp
        self.mp = mp
        self.pose = mp.solutions.pose.Pose(model_complexity=1,
                                          min_detection_confidence=.6, min_tracking_confidence=.6)

    def process(self, frame):
        result = self.pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        landmarks = result.pose_landmarks
        if landmarks:
            self.mp.solutions.drawing_utils.draw_landmarks(
                frame, landmarks, self.mp.solutions.pose.POSE_CONNECTIONS)
        return landmarks.landmark if landmarks else None

    def close(self):
        self.pose.close()


def write_exports(folder, result, rows):
    (folder / 'sesion.json').write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
    with (folder / 'fotogramas.csv').open('w', newline='', encoding='utf-8-sig') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from xml.sax.saxutils import escape
    styles = getSampleStyleSheet()
    content = [Paragraph('SprintBiomechPro — Informe de sesión', styles['Title']), Spacer(1, 14)]
    profile = result['config']
    for label, value in [('Atleta', profile['athlete'] or 'Sin nombre'),
                         ('Peso (kg)', profile['mass_kg']), ('Estatura (cm)', profile['height_cm']),
                         ('Video', Path(result['video']).name), ('Fotogramas analizados', len(rows)),
                         ('Duración analizada (s)', round(result['duration_s'], 3)),
                         ('FPS del archivo', result['source_fps']), ('FPS de captura usados', result['analysis_fps']),
                         ('Velocidad media declarada (m/s)', result['mean_speed_m_s'])]:
        content.append(Paragraph(f'{label}: {escape(str(value if value is not None else "No disponible"))}', styles['Normal']))
    content.append(Spacer(1, 16))
    table = [['Métrica 2D', 'Media (°)', 'Cobertura']]
    for key, label in METRICS.items():
        item = result['summary'][key]
        table.append([label, f"{item['mean_deg']:.1f}" if item['mean_deg'] is not None else 'N/D',
                      f"{item['coverage_pct']:.1f}%"])
    t = Table(table, colWidths=[240, 90, 90])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
                          ('GRID', (0, 0), (-1, -1), .5, colors.lightgrey), ('PADDING', (0, 0), (-1, -1), 8)]))
    content.extend([t, Spacer(1, 18), Paragraph(LIMITATIONS, styles['Normal'])])
    for warning in result['warnings']:
        content.append(Paragraph(escape(warning), styles['Normal']))
    SimpleDocTemplate(str(folder / 'informe.pdf')).build(content)


def analyze_video(video_path, config, output_root, progress=None, cancelled=None, detector_factory=MediaPipeDetector):
    info, _ = inspect_video(video_path)
    source_fps = info['fps']
    fps = config.capture_fps or source_fps
    # UI interval uses the FILE playback timeline, even for slow-motion files.
    start = int(round(config.start_s * source_fps))
    end = min(info['frames'], int(round(config.end_s * source_fps))) if config.end_s is not None else info['frames']
    if start >= end:
        raise ValueError('El intervalo seleccionado está fuera del video.')
    root = Path(output_root)
    root.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.partial-', dir=root))
    cap, writer, detector = None, None, None
    try:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened() or (start and not cap.set(cv2.CAP_PROP_POS_FRAMES, start)):
            raise ValueError('No se pudo leer el inicio seleccionado.')
        writer = cv2.VideoWriter(str(stage / 'video_anotado.mp4'), cv2.VideoWriter_fourcc(*'mp4v'),
                                 source_fps, (info['width'], info['height']))
        if not writer.isOpened():
            raise RuntimeError('No se pudo crear el video de salida. Comprueba el códec y los permisos.')
        detector = detector_factory()
        rows = []
        for frame_index in range(start, end):
            if cancelled and cancelled():
                raise AnalysisCancelled()
            ok, frame = cap.read()
            if not ok:
                raise ValueError(f'El video dejó de decodificarse en el fotograma {frame_index}; no se publicaron resultados parciales.')
            # Bound inference size, preserving aspect ratio (no 640x360 distortion).
            scale = min(1., 960 / max(frame.shape[:2]))
            small = cv2.resize(frame, (max(1, round(frame.shape[1]*scale)), max(1, round(frame.shape[0]*scale))))
            landmarks = detector.process(small)
            values = measure(landmarks, small.shape[1], small.shape[0], config.visibility)
            row = {'frame': frame_index, 'time_s': (frame_index-start)/fps,
                   'file_time_s': frame_index/source_fps, **values}
            rows.append(row)
            annotated = cv2.resize(small, (info['width'], info['height']))
            cv2.putText(annotated, f"{row['time_s']:.3f} s", (15, 35), cv2.FONT_HERSHEY_SIMPLEX, .8, (0, 255, 255), 2)
            writer.write(annotated)
            if progress and (len(rows) % 3 == 0 or frame_index == end-1):
                progress(small.copy(), row, len(rows), end-start)
        if cancelled and cancelled():
            raise AnalysisCancelled()
        writer.release()
        writer = None
        duration = len(rows) / fps
        summary = summarize(rows)
        warnings = []
        if fps < 50:
            warnings.append('Resolución temporal limitada: menos de 50 FPS. No interpretes contactos ni reacción a partir de estos datos.')
        if not any(v['valid_frames'] for v in summary.values()):
            warnings.append('No se obtuvieron ángulos válidos. Revisa encuadre, iluminación y visibilidad del atleta.')
        elif min(v['coverage_pct'] for v in summary.values()) < 50:
            warnings.append('Cobertura baja en una o más métricas: revisa el video antes de interpretar sus medias.')
        result = {'schema_version': 1, 'video': str(Path(video_path).resolve()), 'config': asdict(config),
                  'source_fps': source_fps, 'analysis_fps': fps, 'duration_s': duration,
                  'processed_frames': len(rows), 'start_frame': start, 'end_frame_exclusive': end,
                  'mean_speed_m_s': config.distance_m / duration if config.distance_m else None,
                  'summary': summary, 'warnings': warnings, 'limitations': LIMITATIONS}
        write_exports(stage, result, rows)
        if cancelled and cancelled():
            raise AnalysisCancelled()
        destination = root / (datetime.now().strftime('%Y%m%d_%H%M%S_') + uuid4().hex[:8])
        stage.rename(destination)
        return result, str(destination)
    finally:
        if cap is not None:
            cap.release()
        if writer is not None:
            writer.release()
        if detector is not None:
            detector.close()
        if stage.exists():
            shutil.rmtree(stage)
