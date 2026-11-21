"""Verify real CLI exports on CI and after a container execution."""
import csv
import json
from math import isclose, isfinite
from pathlib import Path
from statistics import fmean
import sys

import cv2


def check_session(root, expected_frames=None):
    sessions = list(Path(root).iterdir())
    assert len(sessions) == 1 and sessions[0].is_dir() and not sessions[0].name.startswith('.partial-')
    session = sessions[0]
    result = json.loads((session / 'sesion.json').read_text(encoding='utf-8'))
    count = result['processed_frames']
    assert count > 0
    if expected_frames is not None:
        assert count == expected_frames
    fps = result['analysis_fps']
    assert isfinite(fps) and fps > 0
    assert isclose(result['duration_s'], count / fps)
    distance = result['config']['distance_m']
    speed = result['mean_speed_m_s']
    if distance is None:
        assert speed is None
    else:
        assert isclose(speed, distance / result['duration_s']) and speed > 0

    summary = result['summary']
    assert any(metric['valid_frames'] > 0 for metric in summary.values())
    with (session / 'fotogramas.csv').open(encoding='utf-8-sig', newline='') as source:
        reader = csv.DictReader(source)
        assert reader.fieldnames == ['frame', 'time_s', 'file_time_s', *summary]
        rows = list(reader)
    assert len(rows) == count
    for index, row in enumerate(rows):
        assert isclose(float(row['time_s']), index / fps)
    for key, metric in summary.items():
        values = [float(row[key]) for row in rows if row[key] != '']
        assert all(0 <= value <= 180 for value in values), key
        assert metric['valid_frames'] == len(values), key
        assert isclose(metric['coverage_pct'], 100 * len(values) / count), key
        if values:
            assert isclose(metric['mean_deg'], fmean(values), abs_tol=1e-9), key
        else:
            assert metric['mean_deg'] is None, key
    assert (session / 'informe.pdf').read_bytes().startswith(b'%PDF-')
    cap = cv2.VideoCapture(str(session / 'video_anotado.mp4'))
    try:
        assert cap.isOpened()
        assert int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) == count
        assert cap.read()[0]
    finally:
        cap.release()
    print(f'Sesión válida: {count} fotogramas, pose detectada, MP4, CSV, JSON y PDF.')


if __name__ == '__main__':
    check_session(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else None)
