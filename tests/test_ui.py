import os
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
from pathlib import Path
import time

import cv2
import numpy as np
import pytest
from PyQt5.QtCore import QSettings, Qt
from PyQt5.QtTest import QTest
from PyQt5.QtWidgets import QApplication

import run_sprint_analyzer as ui
from src.analysis import AnalysisCancelled


@pytest.fixture
def window(tmp_path):
    app = QApplication.instance() or QApplication([])
    QSettings.setDefaultFormat(QSettings.IniFormat)
    QSettings.setPath(QSettings.NativeFormat, QSettings.UserScope, str(tmp_path))
    w = ui.ModernSprintDashboard()
    w.settings = QSettings(str(tmp_path/'settings.ini'), QSettings.IniFormat)
    w.output_root = str(tmp_path/'sessions')
    yield app, w
    if w.thread and w.thread.isRunning():
        w.thread.requestInterruption()
        w.thread.wait(5000)
    w.close()


def make_video(tmp_path):
    path = tmp_path/'input.avi'
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*'MJPG'), 30., (160, 120))
    for frame in range(6):
        writer.write(np.full((120, 160, 3), frame * 40, dtype=np.uint8))
    writer.release()
    return str(path)


def wait_finished(app, w):
    deadline = time.monotonic()+10
    while w.thread.isRunning() and time.monotonic() < deadline:
        app.processEvents()
        time.sleep(.01)
    app.processEvents()
    assert not w.thread.isRunning()


def test_error_does_not_turn_into_success(window, tmp_path, monkeypatch):
    app, w = window
    assert not w.btn_analyze.isEnabled() and not w.btn_export.isEnabled()
    assert w.load_path(make_video(tmp_path))
    def fail(*args, **kwargs):
        raise RuntimeError('Prueba de fallo')
    monkeypatch.setattr(ui, 'analyze_video', fail)
    w.mass.setValue(75)
    w.height.setValue(178)
    w.run_analysis()
    assert not w.btn_load.isEnabled()
    wait_finished(app, w)
    assert 'Prueba de fallo' in w.status_lbl.text()
    assert w.btn_analyze.isEnabled() and not w.btn_export.isEnabled()
    assert w.settings.value('mass', type=float) == 75
    assert w.settings.value('height', type=float) == 178


def test_seek_keyboard_updates_video_preview(window, tmp_path):
    _, w = window
    assert w.load_path(make_video(tmp_path))
    original = w.video_frame.pixmap().toImage()
    QTest.keyClick(w.seek, Qt.Key_End)
    selected = w.video_frame.pixmap().toImage()
    assert w.seek.value() == 5
    assert selected.pixelColor(selected.width() // 2, selected.height() // 2).red() > 150
    assert original != selected
    assert w.seek_label.text() == 'Vista previa: 0.17 s'


def test_invalid_saved_profile_does_not_prevent_startup(window, monkeypatch):
    _, w = window
    settings = w.settings
    settings.setValue('mass', 'valor inválido')
    settings.setValue('height', '177')
    monkeypatch.setattr(ui, 'QSettings', lambda *args: settings)
    dashboard = ui.ModernSprintDashboard()
    try:
        assert dashboard.mass.value() == 0
        assert dashboard.height.value() == 177
    finally:
        dashboard.close()


def test_cancel_leaves_no_export(window, tmp_path, monkeypatch):
    app, w = window
    w.load_path(make_video(tmp_path))
    def cancellable(*args, cancelled, **kwargs):
        while not cancelled():
            time.sleep(.005)
        raise AnalysisCancelled()
    monkeypatch.setattr(ui, 'analyze_video', cancellable)
    w.run_analysis()
    first = w.thread
    w.run_analysis()
    assert w.thread is first
    w.cancel_analysis()
    wait_finished(app, w)
    assert 'cancelado' in w.status_lbl.text()
    assert not w.btn_export.isEnabled()


def test_success_and_reload_clears_stale_results(window, tmp_path, monkeypatch):
    from src.analysis import analyze_video
    from tests.test_analysis import NoPose
    app, w = window
    monkeypatch.setattr(ui, 'analyze_video', lambda *a, **k: analyze_video(*a, **k, detector_factory=NoPose))
    path = make_video(tmp_path)
    w.load_path(path)
    w.run_analysis()
    wait_finished(app, w)
    assert w.btn_export.isEnabled() and w.btn_pdf.isEnabled()
    assert Path(w.output_folder, 'informe.pdf').exists()
    assert w.table.item(0, 1).text() == 'N/D'
    w.load_path(path)
    assert w.result is None and not w.btn_export.isEnabled()
