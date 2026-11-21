"""SprintBiomechPro desktop entry point (Windows 10/11, Python 3.11/3.12)."""
from pathlib import Path
import math
import sys
from time import monotonic

import cv2
import numpy as np
import pyqtgraph as pg
from PyQt5.QtCore import Qt, QThread, QSettings, QSignalBlocker, QStandardPaths, QUrl, pyqtSignal
from PyQt5.QtGui import QImage, QPixmap, QDesktopServices
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QFormLayout, QPushButton, QLabel, QFileDialog, QDoubleSpinBox, QLineEdit, QProgressBar,
    QScrollArea, QGroupBox, QTableWidget, QTableWidgetItem, QHeaderView, QSlider, QTabWidget)

from src.analysis import AnalysisConfig, AnalysisCancelled, METRICS, analyze_video, inspect_video, skip_frames


class AnalysisThread(QThread):
    progress = pyqtSignal(object, object, int, int)
    succeeded = pyqtSignal(object, str)
    failed = pyqtSignal(str)
    cancelled = pyqtSignal()

    def __init__(self, video, config, output_root):
        super().__init__()
        self.video, self.config, self.output_root = video, config, output_root

    def run(self):
        last_update = 0.0

        def report_progress(frame, row, done, total):
            nonlocal last_update
            now = monotonic()
            if done == total or now - last_update >= .1:
                self.progress.emit(frame, row, done, total)
                last_update = now

        try:
            result, folder = analyze_video(self.video, self.config, self.output_root,
                progress=report_progress, cancelled=self.isInterruptionRequested)
            self.succeeded.emit(result, folder)
        except AnalysisCancelled:
            self.cancelled.emit()
        except Exception as exc:
            self.failed.emit(f'{type(exc).__name__}: {exc}')


class ModernSprintDashboard(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('SprintBiomechPro · Análisis de sprint')
        self.resize(1180, 780)
        self.settings = QSettings('SprintBiomechPro', 'Desktop')
        self.thread = None
        self.current_video = None
        self.output_folder = None
        self.result = None
        self.graph_x, self.graph_y = [], []
        self.setStyleSheet('''
            QMainWindow, QWidget { background: #0f172a; color: #e2e8f0; font-size: 13px; }
            QGroupBox { border: 1px solid #334155; border-radius: 8px; margin-top: 14px; padding: 14px 8px 8px; }
            QGroupBox::title { subcontrol-origin: margin; left: 10px; color: #7dd3fc; }
            QPushButton { background: #2563eb; border: none; border-radius: 6px; padding: 10px; font-weight: bold; }
            QPushButton:hover { background: #1d4ed8; }
            QPushButton:disabled { background: #334155; color: #94a3b8; }
            QLineEdit, QDoubleSpinBox { background: #1e293b; border: 1px solid #475569; padding: 6px; border-radius: 4px; }
            QProgressBar { border: 1px solid #475569; text-align: center; }
            QProgressBar::chunk { background: #0284c7; }
            QHeaderView::section { background: #1e293b; padding: 6px; }
            QTabBar::tab { background: #1e293b; padding: 10px; }
            QTabBar::tab:selected { background: #2563eb; }
        ''')
        central = QWidget()
        self.setCentralWidget(central)
        layout = QHBoxLayout(central)
        sidebar = QWidget()
        sidebar.setMinimumWidth(300)
        sidebar.setMaximumWidth(350)
        side = QVBoxLayout(sidebar)
        title = QLabel('SprintBiomechPro')
        title.setStyleSheet('font-size: 24px; font-weight: bold; color: #7dd3fc;')
        side.addWidget(title)
        side.addWidget(QLabel('1. Perfil   →   2. Video   →   3. Resultados'))
        profile = QGroupBox('Datos del atleta')
        form = QFormLayout(profile)
        self.athlete = QLineEdit(str(self.settings.value('athlete', '')))
        self.athlete.setMaxLength(100)
        self.mass = self.number(0, 300, 0, ' kg', 'Sin indicar')
        self.height = self.number(0, 250, 0, ' cm', 'Sin indicar')
        self.mass.setValue(self.saved_profile_number('mass'))
        self.height.setValue(self.saved_profile_number('height'))
        form.addRow('Nombre', self.athlete)
        form.addRow('Peso', self.mass)
        form.addRow('Estatura', self.height)
        side.addWidget(profile)
        self.btn_load = QPushButton('Cargar video')
        side.addWidget(self.btn_load)
        self.file_label = QLabel('Selecciona un video lateral de un solo atleta.')
        self.file_label.setWordWrap(True)
        self.file_label.setTextFormat(Qt.PlainText)
        side.addWidget(self.file_label)
        interval = QGroupBox('Intervalo y tiempo')
        fields = QFormLayout(interval)
        self.start = self.number(0, 100000, 0, ' s')
        self.end = self.number(0, 100000, 0, ' s', 'Todo el video')
        self.fps = self.number(0, 1000, 0, ' FPS', 'Usar FPS del archivo')
        self.distance = self.number(0, 10000, 0, ' m', 'No indicada')
        fields.addRow('Inicio del archivo', self.start)
        fields.addRow('Final del archivo', self.end)
        fields.addRow('FPS de captura', self.fps)
        fields.addRow('Distancia recorrida', self.distance)
        hint = QLabel('En cámara lenta, indica los FPS de grabación solo si los conoces. La distancia debe corresponder exactamente al intervalo seleccionado; permite calcular únicamente velocidad media.')
        hint.setWordWrap(True)
        fields.addRow(hint)
        side.addWidget(interval)
        self.btn_analyze = QPushButton('Analizar video')
        self.btn_cancel = QPushButton('Cancelar análisis')
        self.btn_export = QPushButton('Abrir resultados (PDF, CSV, video)')
        self.btn_pdf = QPushButton('Abrir informe PDF')
        self.btn_root = QPushButton('Elegir carpeta de resultados')
        for button in (self.btn_analyze, self.btn_cancel, self.btn_export, self.btn_pdf, self.btn_root):
            side.addWidget(button)
        side.addStretch()
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setWidget(sidebar)
        scroll.setMinimumWidth(330)
        scroll.setMaximumWidth(380)
        layout.addWidget(scroll)
        content = QVBoxLayout()
        layout.addLayout(content, 1)
        self.tabs = QTabWidget()
        content.addWidget(self.tabs, 1)
        monitor = QWidget()
        ml = QVBoxLayout(monitor)
        self.video_frame = QLabel('Carga un video para ver la vista previa')
        self.video_frame.setAlignment(Qt.AlignCenter)
        self.video_frame.setMinimumSize(400, 220)
        self.video_frame.setStyleSheet('background: #020617; border-radius: 8px;')
        ml.addWidget(self.video_frame, 1)
        self.seek = QSlider(Qt.Horizontal)
        self.seek.setEnabled(False)
        self.seek.setTracking(False)
        ml.addWidget(self.seek)
        self.seek_label = QLabel('Vista previa: 0.00 s')
        self.seek_label.setToolTip('El tiempo se calcula con los FPS medios, igual que el intervalo de análisis.')
        ml.addWidget(self.seek_label)
        self.plot = pg.PlotWidget(background='#0f172a')
        self.plot.setMinimumHeight(140)
        self.plot.setLabel('left', 'Rodilla derecha', units='°')
        self.plot.setLabel('bottom', 'Tiempo analizado', units='s')
        self.plot.setYRange(0, 180)
        self.curve = self.plot.plot(pen=pg.mkPen('#38bdf8', width=2), connect='finite')
        ml.addWidget(self.plot)
        self.tabs.addTab(monitor, 'Video y ángulos')
        results = QWidget()
        rl = QVBoxLayout(results)
        self.result_label = QLabel('Los resultados aparecerán al completar el análisis.')
        self.result_label.setWordWrap(True)
        rl.addWidget(self.result_label)
        self.table = QTableWidget(len(METRICS), 3)
        self.table.setHorizontalHeaderLabels(['Métrica 2D', 'Media', 'Cobertura'])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.verticalHeader().hide()
        rl.addWidget(self.table)
        limits = QLabel('Estos son ángulos proyectados en 2D, no una evaluación clínica ni una puntuación de técnica.\n\nLa cobertura es el porcentaje de fotogramas utilizables para cada métrica; no mide precisión.\n\nReacción, contactos, cadencia, potencia y velocidad máxima: no disponibles. Peso y estatura se guardan como datos del atleta.')
        limits.setWordWrap(True)
        rl.addWidget(limits)
        self.tabs.addTab(results, 'Resultados y límites')
        self.progress_bar = QProgressBar()
        content.addWidget(self.progress_bar)
        self.status_lbl = QLabel('Listo. Carga un video para comenzar.')
        self.status_lbl.setWordWrap(True)
        self.status_lbl.setTextFormat(Qt.PlainText)
        content.addWidget(self.status_lbl)
        default_root = str(Path(QStandardPaths.writableLocation(QStandardPaths.DocumentsLocation)) / 'SprintBiomechPro' / 'sesiones')
        self.output_root = str(self.settings.value('output_root', default_root))
        self.btn_load.clicked.connect(self.load_video)
        self.btn_analyze.clicked.connect(self.run_analysis)
        self.btn_cancel.clicked.connect(self.cancel_analysis)
        self.btn_export.clicked.connect(self.open_output_folder)
        self.btn_pdf.clicked.connect(lambda: self.open_output_folder('informe.pdf'))
        self.btn_root.clicked.connect(self.choose_root)
        self.seek.valueChanged.connect(self.preview_at_slider)
        self.set_busy(False)
        self.clear_results()

    @staticmethod
    def number(low, high, value, suffix, special=None):
        box = QDoubleSpinBox()
        box.setRange(low, high)
        box.setDecimals(2)
        box.setValue(value)
        box.setSuffix(suffix)
        if special:
            box.setSpecialValueText(special)
        return box

    def saved_profile_number(self, key):
        try:
            value = float(self.settings.value(key, 0))
        except (TypeError, ValueError, OverflowError):
            return 0.0
        return value if math.isfinite(value) else 0.0

    def set_busy(self, busy):
        for widget in (self.btn_load, self.btn_root, self.athlete, self.mass, self.height,
                       self.start, self.end, self.fps, self.distance):
            widget.setEnabled(not busy)
        self.btn_analyze.setEnabled(not busy and self.current_video is not None)
        self.btn_cancel.setEnabled(busy)
        self.seek.setEnabled(not busy and self.current_video is not None)
        self.btn_export.setEnabled(not busy and self.output_folder is not None)
        self.btn_pdf.setEnabled(not busy and self.output_folder is not None)

    def clear_results(self):
        self.result, self.output_folder = None, None
        self.graph_x, self.graph_y = [], []
        self.last_graph_frame = 0
        self.curve.setData([], [])
        self.progress_bar.setValue(0)
        self.result_label.setText('Sin resultados para el análisis actual.')
        for i, label in enumerate(METRICS.values()):
            for j, value in enumerate((label, 'N/D', 'N/D')):
                self.table.setItem(i, j, QTableWidgetItem(value))
        self.btn_export.setEnabled(False)
        self.btn_pdf.setEnabled(False)

    def load_video(self):
        path, _ = QFileDialog.getOpenFileName(self, 'Seleccionar video', '', 'Videos (*.mp4 *.avi *.mov *.mkv *.m4v)')
        if path:
            self.load_path(path)

    def load_path(self, path):
        try:
            info, frame = inspect_video(path)
        except Exception as exc:
            self.status_lbl.setText(str(exc))
            return False
        self.current_video = path
        self.clear_results()
        self.start.setValue(0)
        self.end.setValue(0)
        self.start.setMaximum(info['duration'])
        self.end.setMaximum(info['duration'])
        self.fps.setValue(0)
        self.distance.setValue(0)
        self.preview_fps = info['fps']
        with QSignalBlocker(self.seek):
            self.seek.setRange(0, info['frames'] - 1)
            self.seek.setValue(0)
        self.seek_label.setText('Vista previa: 0.00 s')
        self.file_label.setText(f"{Path(path).name}\n{info['width']} × {info['height']} · {info['fps']:.2f} FPS · {info['duration']:.2f} s")
        self.update_image(frame)
        self.status_lbl.setText('Video listo. Revisa perfil e intervalo y pulsa Analizar video.')
        self.set_busy(False)
        return True

    def preview_at_slider(self, frame_index):
        if not self.current_video:
            return
        cap = cv2.VideoCapture(self.current_video)
        try:
            ok = False
            if frame_index == 0 or cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index):
                ok, frame = cap.read()
            if not ok and frame_index:
                cap.release()
                cap = cv2.VideoCapture(self.current_video)
                try:
                    skip_frames(cap, frame_index)
                except ValueError:
                    return
                ok, frame = cap.read()
            if ok:
                self.update_image(frame)
                timestamp = frame_index / self.preview_fps
                self.seek_label.setText(f'Vista previa: {timestamp:.2f} s')
        finally:
            cap.release()

    def update_image(self, frame):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = QImage(rgb.data, rgb.shape[1], rgb.shape[0], rgb.strides[0], QImage.Format_RGB888).copy()
        self.video_frame.setPixmap(QPixmap.fromImage(image).scaled(self.video_frame.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation))

    def run_analysis(self):
        if not self.current_video or (self.thread is not None and self.thread.isRunning()):
            return
        try:
            config = AnalysisConfig(athlete=self.athlete.text().strip(), mass_kg=self.mass.value() or None,
                height_cm=self.height.value() or None, start_s=self.start.value(), end_s=self.end.value() or None,
                capture_fps=self.fps.value() or None, distance_m=self.distance.value() or None)
        except ValueError as exc:
            self.status_lbl.setText(str(exc))
            return
        for key, value in [('athlete', config.athlete), ('mass', self.mass.value()), ('height', self.height.value())]:
            self.settings.setValue(key, value)
        self.clear_results()
        self.set_busy(True)
        self.tabs.setCurrentIndex(0)
        self.status_lbl.setText('Analizando… Puedes cancelar. La primera ejecución puede preparar el modelo.')
        self.thread = AnalysisThread(self.current_video, config, self.output_root)
        self.thread.progress.connect(self.on_progress)
        self.thread.succeeded.connect(self.on_success)
        self.thread.failed.connect(lambda message: self.status_lbl.setText('Error: ' + message))
        self.thread.cancelled.connect(lambda: self.status_lbl.setText('Análisis cancelado. No se guardaron resultados parciales.'))
        self.thread.finished.connect(lambda: self.set_busy(False))
        self.thread.start()

    def on_progress(self, frame, row, done, total):
        self.update_image(frame)
        self.progress_bar.setValue(round(100 * done / total))
        graph_step = max(1, (total + 999) // 1000)
        if not self.graph_x or done == total or done - self.last_graph_frame >= graph_step:
            self.graph_x.append(row['time_s'])
            self.graph_y.append(row['knee_right'] if row['knee_right'] is not None else np.nan)
            self.last_graph_frame = done
            self.curve.setData(self.graph_x, self.graph_y)
        self.status_lbl.setText(f'Analizando fotograma {done} de {total}…')

    def on_success(self, result, folder):
        self.result, self.output_folder = result, folder
        for i, key in enumerate(METRICS):
            data = result['summary'][key]
            self.table.setItem(i, 1, QTableWidgetItem(f"{data['mean_deg']:.1f}°" if data['mean_deg'] is not None else 'N/D'))
            self.table.setItem(i, 2, QTableWidgetItem(f"{data['coverage_pct']:.1f}%"))
        speed = result['mean_speed_m_s']
        self.result_label.setText(f"{result['processed_frames']} fotogramas · {result['duration_s']:.3f} s analizados\n"
            + (f'Velocidad media según distancia declarada: {speed:.2f} m/s\n' if speed is not None else '')
            + '\n'.join(result['warnings']))
        self.progress_bar.setValue(100)
        self.tabs.setCurrentIndex(1)
        self.status_lbl.setText(('Finalizado con advertencias. ' if result['warnings'] else 'Análisis completado. ') + f'Resultados: {folder}')

    def cancel_analysis(self):
        if self.thread is not None and self.thread.isRunning():
            self.thread.requestInterruption()
            self.btn_cancel.setEnabled(False)
            self.status_lbl.setText('Cancelando y cerrando los archivos…')

    def choose_root(self):
        path = QFileDialog.getExistingDirectory(self, 'Carpeta para las sesiones', self.output_root)
        if path:
            self.output_root = path
            self.settings.setValue('output_root', path)
            self.status_lbl.setText('Las próximas sesiones se guardarán en: ' + path)

    def open_output_folder(self, filename=None):
        if self.output_folder:
            path = Path(self.output_folder)
            if isinstance(filename, str):
                path /= filename
            if not QDesktopServices.openUrl(QUrl.fromLocalFile(str(path))):
                self.status_lbl.setText('No se pudo abrir automáticamente. Resultados: ' + str(path))

    def closeEvent(self, event):
        if self.thread is not None and self.thread.isRunning():
            self.cancel_analysis()
            self.status_lbl.setText('Cancelando. Cierra la ventana nuevamente cuando termine.')
            event.ignore()
        else:
            event.accept()


if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = ModernSprintDashboard()
    window.show()
    sys.exit(app.exec_())
