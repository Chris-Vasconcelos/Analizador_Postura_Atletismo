"""Verify real CLI exports on CI and after a container execution."""
import csv
import json
from pathlib import Path
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
    assert any(metric['valid_frames'] > 0 for metric in result['summary'].values())
    with (session / 'fotogramas.csv').open(encoding='utf-8-sig', newline='') as source:
        assert sum(1 for _ in csv.DictReader(source)) == count
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
