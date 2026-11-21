import csv
import json
from pathlib import Path
from types import SimpleNamespace

import cv2
import numpy as np
import pytest

from src.analysis import AnalysisCancelled, AnalysisConfig, analyze_video, angle, measure, summarize


def landmarks():
    return [SimpleNamespace(x=.5, y=.5, visibility=1.) for _ in range(33)]


def test_pixel_aspect_ratio_and_visibility():
    points = landmarks()
    # A 90° angle in pixels on a non-square frame; normalized coordinates differ.
    for i, x, y in [(24, .4, .3), (26, .5, .5), (28, .6, .3)]:
        points[i].x, points[i].y = x, y
    measured = measure(points, 1000, 500, .65)
    assert measured['knee_right'] == pytest.approx(90)
    points[26].visibility = .1
    assert measure(points, 1000, 500, .65)['knee_right'] is None
    points[26].visibility = float('nan')
    assert measure(points, 1000, 500, .65)['knee_right'] is None
    assert angle([0, 0], np.array([0, 0]), [1, 1]) is None


@pytest.mark.parametrize('kwargs', [dict(mass_kg=-1), dict(height_cm=60), dict(capture_fps=0),
    dict(distance_m=float('nan')), dict(start_s=3, end_s=2), dict(start_s=float('inf'))])
def test_invalid_settings(kwargs):
    with pytest.raises(ValueError):
        AnalysisConfig(**kwargs)


def test_missing_data_excluded_from_mean():
    rows = [dict.fromkeys(['knee_right', 'knee_left', 'hip_right', 'hip_left', 'trunk']) for _ in range(3)]
    rows[0]['knee_right'], rows[2]['knee_right'] = 90., 150.
    result = summarize(rows)
    assert result['knee_right']['mean_deg'] == 120
    assert result['knee_right']['coverage_pct'] == pytest.approx(200/3)
    assert result['knee_left']['mean_deg'] is None


@pytest.fixture
def video(tmp_path):
    path = tmp_path / 'sample.avi'
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*'MJPG'), 30., (160, 120))
    assert writer.isOpened()
    for _ in range(12):
        writer.write(np.zeros((120, 160, 3), dtype=np.uint8))
    writer.release()
    return path


class NoPose:
    closed = False
    def process(self, frame):
        return None
    def close(self):
        self.closed = True


def test_complete_session_exports_and_no_fake_metrics(video, tmp_path):
    detector = NoPose()
    config = AnalysisConfig(athlete='José <Atleta>', mass_kg=75, height_cm=178, capture_fps=60,
                            start_s=.1, end_s=.3, distance_m=1.)
    result, folder = analyze_video(video, config, tmp_path/'sessions', detector_factory=lambda: detector)
    folder = Path(folder)
    assert detector.closed
    assert result['processed_frames'] == 6
    assert result['duration_s'] == pytest.approx(.1)
    assert result['mean_speed_m_s'] == pytest.approx(10.)
    assert result['warnings']
    assert result['summary']['knee_right']['mean_deg'] is None
    saved = json.loads((folder/'sesion.json').read_text(encoding='utf-8'))
    assert saved['config']['athlete'] == 'José <Atleta>'
    assert saved['config']['mass_kg'] == 75
    with (folder/'fotogramas.csv').open(encoding='utf-8-sig') as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 6 and rows[0]['knee_right'] == ''
    assert float(rows[-1]['time_s']) == pytest.approx(5/60)
    assert (folder/'informe.pdf').read_bytes().startswith(b'%PDF')
    cap = cv2.VideoCapture(str(folder/'video_anotado.mp4'))
    assert int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) == 6
    cap.release()


def test_cancel_removes_partial_session(video, tmp_path):
    detector = NoPose()
    with pytest.raises(AnalysisCancelled):
        analyze_video(video, AnalysisConfig(), tmp_path/'sessions', cancelled=lambda: True,
                      detector_factory=lambda: detector)
    assert detector.closed
    assert list((tmp_path/'sessions').iterdir()) == []


def test_detector_error_releases_resources(video, tmp_path):
    class Broken(NoPose):
        def process(self, frame):
            raise RuntimeError('detector error')
    detector = Broken()
    with pytest.raises(RuntimeError, match='detector error'):
        analyze_video(video, AnalysisConfig(), tmp_path/'sessions', detector_factory=lambda: detector)
    assert detector.closed
    assert not list((tmp_path/'sessions').iterdir())


def test_unreadable_and_out_of_range(video, tmp_path):
    with pytest.raises(ValueError):
        analyze_video(tmp_path/'missing.mp4', AnalysisConfig(), tmp_path/'sessions')
    with pytest.raises(ValueError):
        analyze_video(video, AnalysisConfig(start_s=100), tmp_path/'sessions')
    assert not (tmp_path/'sessions').exists()
