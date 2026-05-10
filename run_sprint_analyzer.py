import cv2
import sys
import os
import numpy as np
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QPushButton, QLabel, QFileDialog, QFrame)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QImage, QPixmap

# Para gráfica en vivo
import pyqtgraph as pg

# --- IMPORTAMOS EL MOTOR PROFESIONAL AVANZADO ---
from src.analyzer_profesional import BiomechSprintAnalyzer, AnalysisConfig
from src.visualization import SprintVisualizer


def mejorar_claridad_biomecanica(frame, apply_gamma=True):
    """
    Versión optimizada para laboratorios de alto rendimiento.
    
    Args:
        frame: Frame en formato BGR
        apply_gamma: Si True, aplica corrección gamma para mejor manejo de sombras
    """
    import cv2
    import numpy as np
    
    # 1. Filtro Bilateral: Quita el 'ruido' de la cámara pero deja tus bordes nítidos
    # Esto evita que MediaPipe 'tiemble'
    frame = cv2.bilateralFilter(frame, 5, 75, 75)
    
    # 2. Convertir a HSV
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    
    # 3. CLAHE en el canal V (Brillo Inteligente)
    # En lugar de sumar +20, esto redistribuye la luz de forma inteligente
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    v = clahe.apply(v)
    
    # 3b. Corrección Gamma (opcional) - evita que sombras se pierdan
    if apply_gamma:
        v = np.power(v / 255.0, 0.9) * 255.0
        v = v.astype(np.uint8)
    
    # 4. Aumentar saturación de forma segura
    s = cv2.add(s, 30)
    
    hsv = cv2.merge([h, s, v])
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

# --- HILO DE STREAMING EN VIVO ---
class AnalysisThread(QThread):
    change_pixmap_signal = pyqtSignal(np.ndarray)
    metrics_signal = pyqtSignal(dict)
    graph_signal = pyqtSignal(float, int)  # (knee_angle, frame_idx)
    error_signal = pyqtSignal(str)

    def __init__(self, video_path):
        super().__init__()
        self.video_path = video_path

    @staticmethod
    def calculate_angle(a, b, c):
        """Calcula ángulo entre 3 puntos (landmarks)."""
        import numpy as np
        import math
        ang = math.degrees(math.atan2(c.y - b.y, c.x - b.x) - math.atan2(a.y - b.y, a.x - b.x))
        ang = ang + 360 if ang < 0 else ang
        return ang if ang < 180 else 360 - ang

    def run(self):
        import cv2
        import mediapipe as mp
        try:
            print(f"[DEBUG] Iniciando análisis en vivo: {self.video_path}")
            cap = cv2.VideoCapture(self.video_path)
            
            if not cap.isOpened():
                self.error_signal.emit("No se pudo abrir el video")
                return
                
            pose = mp.solutions.pose.Pose(model_complexity=2)
            frame_idx = 0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            print(f"[DEBUG] Total de frames: {total_frames}")
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Optimización: redimensionar antes del procesamiento (más rápido)
                # MediaPipe internamente usa ~256x256, así que no perdemos precisión
                frame_small = cv2.resize(frame, (640, 360))
                
                # 1. Mejora Visual HSV en vivo (sobre imagen pequeña)
                frame_preview = mejorar_claridad_biomecanica(frame_small)
                
                # Redimensionar de vuelta para mostrar al usuario
                frame_preview = cv2.resize(frame_preview, (frame.shape[1], frame.shape[0]))
                
                rgb_frame = cv2.cvtColor(frame_preview, cv2.COLOR_BGR2RGB)
                res = pose.process(rgb_frame)
                
                if res.pose_landmarks:
                    # Dibujar esqueleto para feedback en vivo
                    mp.solutions.drawing_utils.draw_landmarks(
                        frame_preview, res.pose_landmarks, mp.solutions.pose.POSE_CONNECTIONS)
                    
                    l = res.pose_landmarks.landmark
                    lm = mp.solutions.pose.PoseLandmark
                    # Calcular ambos ángulos
                    ang_r = self.calculate_angle(l[lm.RIGHT_HIP], l[lm.RIGHT_KNEE], l[lm.RIGHT_ANKLE])
                    ang_l = self.calculate_angle(l[lm.LEFT_HIP], l[lm.LEFT_KNEE], l[lm.LEFT_ANKLE])
                    
                    # Emitir métricas y gráfica
                    self.metrics_signal.emit({
                        'knee_r': ang_r, 
                        'knee_l': ang_l,
                        'status': f"Trackeando... Frame {frame_idx}/{total_frames}"
                    })
                    self.graph_signal.emit(float(ang_r), int(frame_idx))
                else:
                    self.metrics_signal.emit({'status': f"Sin detección - Frame {frame_idx}"})
                
                # Enviar frame mejorado con skeleton
                self.change_pixmap_signal.emit(frame_preview)
                frame_idx += 1
                
            cap.release()
            print(f"[DEBUG] Análisis en vivo completado. Frames procesados: {frame_idx}")
            self.metrics_signal.emit({'status': "Finalizado ✅"})
            
        except Exception as e:
            print(f"[ERROR] Error en hilo de análisis: {e}")
            import traceback
            traceback.print_exc()
            self.error_signal.emit(str(e))


class ModernSprintDashboard(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Bolt Reboot - Laboratorio Biomecánico")
        self.resize(1200, 750)
        # --- DISEÑO (QSS) ---
        self.setStyleSheet("""
            QMainWindow { background-color: #0F172A; }
            QLabel { color: #F8FAFC; font-family: 'Segoe UI', Arial; }
            QFrame#sidebar { background-color: #1E293B; border-right: 2px solid #334155; }
            QFrame#metricCard { background-color: #1E293B; border-radius: 12px; border: 1px solid #334155; }
            QPushButton {
                background-color: #3B82F6; color: white; border: none;
                padding: 12px 20px; border-radius: 8px; font-weight: bold; font-size: 14px;
            }
            QPushButton:hover { background-color: #2563EB; }
            QPushButton#analyzeBtn { background-color: #10B981; font-size: 16px; }
            QPushButton#analyzeBtn:hover { background-color: #059669; }
            QPushButton#exportBtn { background-color: #475569; }
            QPushButton#exportBtn:hover { background-color: #64748B; }
        """)

        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QHBoxLayout(main_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # --- BARRA LATERAL ---
        sidebar = QFrame()
        sidebar.setObjectName("sidebar")
        sidebar.setFixedWidth(300)
        sidebar_layout = QVBoxLayout(sidebar)
        sidebar_layout.setContentsMargins(25, 40, 25, 40)
        sidebar_layout.setSpacing(20)

        title_lbl = QLabel("⚡ BOLT REBOOT")
        title_lbl.setStyleSheet("font-size: 26px; font-weight: 900; color: #38BDF8; margin-bottom: 10px;")
        subtitle_lbl = QLabel("Sprint Biomechanics Pro v2.0")
        subtitle_lbl.setStyleSheet("font-size: 12px; color: #64748B; margin-bottom: 30px;")

        self.btn_load = QPushButton("📂 CARGAR VIDEO")
        self.btn_analyze = QPushButton("⚡ ANALIZAR")
        self.btn_analyze.setObjectName("analyzeBtn")
        self.btn_export = QPushButton("📊 REPORTE FINAL")
        self.btn_export.setObjectName("exportBtn")
        self.status_lbl = QLabel("Sistema listo.")
        self.status_lbl.setStyleSheet("color: #10B981; font-weight: bold; font-size: 13px;")

        sidebar_layout.addWidget(title_lbl)
        sidebar_layout.addWidget(subtitle_lbl)
        sidebar_layout.addWidget(self.btn_load)
        sidebar_layout.addWidget(self.btn_analyze)
        sidebar_layout.addWidget(self.btn_export)
        sidebar_layout.addStretch()
        sidebar_layout.addWidget(self.status_lbl)

        # --- ÁREA CENTRAL ---
        content_area = QWidget()
        content_layout = QVBoxLayout(content_area)
        content_layout.setContentsMargins(40, 40, 40, 40)
        content_layout.setSpacing(25)

        header_lbl = QLabel("Monitor Cinemático")
        header_lbl.setStyleSheet("font-size: 22px; font-weight: bold;")

        self.video_frame = QLabel("SISTEMA LISTO: CARGA UN VIDEO")
        self.video_frame.setMinimumSize(800, 450)
        self.video_frame.setAlignment(Qt.AlignCenter)
        self.video_frame.setStyleSheet("""
            background-color: #000; border-radius: 15px; 
            color: #475569; font-size: 20px; 
            border: 2px dashed #334155;
        """)

        # --- TARJETAS DINÁMICAS ---
        metrics_layout = QHBoxLayout()
        metrics_layout.setSpacing(20)

        def create_metric_card(title):
            card = QFrame()
            card.setObjectName("metricCard")
            l = QVBoxLayout(card)
            t = QLabel(title)
            t.setStyleSheet("color: #94A3B8; font-size: 13px; font-weight: bold; text-transform: uppercase;")
            v = QLabel("--") # Inicia vacío
            v.setStyleSheet("color: #F8FAFC; font-size: 32px; font-weight: 900;")
            l.addWidget(t)
            l.addWidget(v)
            return card, v

        card_k, self.lbl_knee = create_metric_card("ÁNGULO RODILLA D")
        card_o, self.lbl_overstride = create_metric_card("ÁNGULO RODILLA I")
        card_r, self.lbl_reaction = create_metric_card("TIEMPO REACCIÓN")
        card_c, self.lbl_confidence = create_metric_card("CONFIANZA")
        card_t, self.lbl_trunk = create_metric_card("TRONCO")
        card_ct, self.lbl_contacts = create_metric_card("CONTACTOS")

        metrics_layout.addWidget(card_k)
        metrics_layout.addWidget(card_o)
        metrics_layout.addWidget(card_r)
        metrics_layout.addWidget(card_c)
        metrics_layout.addWidget(card_t)
        metrics_layout.addWidget(card_ct)

        # --- GRÁFICA EN VIVO ---
        self.graph_widget = pg.PlotWidget()
        self.graph_widget.setBackground('#1E293B')
        self.graph_widget.setTitle("Ángulo Rodilla D vs Frame", color='#F8FAFC', size="14pt")
        self.graph_widget.showGrid(x=True, y=True)
        self.graph_widget.setLabel('left', 'Ángulo Rodilla D (°)', color='#F8FAFC')
        self.graph_widget.setLabel('bottom', 'Frame', color='#F8FAFC')
        self.graph_curve = self.graph_widget.plot([], [], pen=pg.mkPen('#38BDF8', width=2))
        self.graph_x = []
        self.graph_y = []

        content_layout.addWidget(header_lbl)
        content_layout.addWidget(self.video_frame, stretch=1)
        content_layout.addLayout(metrics_layout)
        content_layout.addWidget(self.graph_widget, stretch=0)

        main_layout.addWidget(sidebar)
        main_layout.addWidget(content_area)

        # --- CONEXIONES ---
        self.btn_load.clicked.connect(self.load_video)
        self.btn_analyze.clicked.connect(self.run_analysis)
        self.btn_export.clicked.connect(self.open_output_folder)

    def update_image(self, cv_img):
        rgb_image = cv_img if cv_img.shape[2] == 3 else cv_img[..., :3]
        rgb_image = cv2.cvtColor(rgb_image, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb_image.shape
        bytes_per_line = ch * w
        convert_to_Qt_format = QImage(rgb_image.data, w, h, bytes_per_line, QImage.Format_RGB888)
        p = convert_to_Qt_format.scaled(800, 600, Qt.KeepAspectRatio)
        self.video_frame.setPixmap(QPixmap.fromImage(p))

    def update_metrics_ui(self, data):
        if 'knee_r' in data:
            self.lbl_knee.setText(f"{data['knee_r']:.1f}°")
        if 'knee_l' in data:
            self.lbl_overstride.setText(f"{data['knee_l']:.1f}°")
        if 'status' in data:
            self.status_lbl.setText(data['status'])

    def update_graph(self, knee_angle, frame_idx):
        self.graph_x.append(frame_idx)
        self.graph_y.append(knee_angle)
        self.graph_curve.setData(self.graph_x, self.graph_y)

    def run_analysis(self):
        if not hasattr(self, 'current_video'):
            self.status_lbl.setText("⚠️ Error: Carga un video primero")
            self.status_lbl.setStyleSheet("color: #EF4444;")
            return
        
        print(f"[DEBUG] Iniciando análisis para: {self.current_video}")
        
        # Limpiar gráfica
        self.graph_x = []
        self.graph_y = []
        self.graph_curve.setData([], [])
        
        # Iniciar hilo de análisis en vivo
        self.thread = AnalysisThread(self.current_video)
        self.thread.change_pixmap_signal.connect(self.update_image)
        self.thread.metrics_signal.connect(self.update_metrics_ui)
        self.thread.graph_signal.connect(self.update_graph)
        self.thread.error_signal.connect(self.on_analysis_error)
        self.thread.finished.connect(self.on_analysis_finished)
        self.thread.start()
        
        self.status_lbl.setText("🔄 Análisis en vivo...")
        self.status_lbl.setStyleSheet("color: #F59E0B; font-weight: bold;")

    def on_analysis_error(self, error_msg):
        self.status_lbl.setText(f"⚠️ Error: {error_msg}")
        self.status_lbl.setStyleSheet("color: #EF4444;")
        print(f"[ERROR] Error en análisis: {error_msg}")

    def on_analysis_finished(self):
        """
        Al terminar el análisis en vivo, ejecuta el motor profesional completo para guardar gráficas, métricas, video anotado, etc.
        """
        self.status_lbl.setText("Estado: Procesando resultados finales...")
        self.status_lbl.setStyleSheet("color: #F59E0B;")
        QApplication.processEvents()
        try:
            # 1. Arrancar el motor avanzado (Fases, Filtros, Contactos)
            config = AnalysisConfig()
            analyzer = BiomechSprintAnalyzer(self.current_video, config)
            result = analyzer.analyze()

            # 2. Generar y guardar las gráficas profesionales
            if not os.path.exists("output"):
                os.makedirs("output")
            visualizer = SprintVisualizer(result)
            visualizer.plot_angles_over_time("output/grafica_angulos.png")
            visualizer.plot_contact_analysis("output/grafica_contactos.png")

            # 3. Extraer y mostrar métricas finales
            summary = result.summary_metrics
            contacts = result.contacts_summary
            reliability = result.reliability_report

            ang_rodilla_d = summary.get('mean_knee_angle_right', 0)
            ang_rodilla_i = summary.get('mean_knee_angle_left', 0)
            reaccion = result.reaction_time_ms or 0
            confianza = reliability.get('validity_percentage', 0)
            trunk = summary.get('mean_trunk_lean', 0)
            total_contacts = contacts.get('total_contacts', 0)

            self.lbl_knee.setText(f"{ang_rodilla_d:.1f} <span style='font-size:14px; color:#64748B;'>°</span>")
            self.lbl_overstride.setText(f"{ang_rodilla_i:.1f} <span style='font-size:14px; color:#64748B;'>°</span>")
            self.lbl_reaction.setText(f"{reaccion:.0f} <span style='font-size:14px; color:#64748B;'>ms</span>")
            self.lbl_confidence.setText(f"{confianza:.0f} <span style='font-size:14px; color:#64748B;'>%</span>")
            self.lbl_trunk.setText(f"{trunk:.1f} <span style='font-size:14px; color:#64748B;'>°</span>")
            self.lbl_contacts.setText(f"{total_contacts} <span style='font-size:14px; color:#64748B;'>pasos</span>")

            # 4. Generar video anotado
            self.generate_annotated_video(result)

            # 5. Guardar métricas de sesión
            self.save_session_metrics(result)

            # 6. Éxito
            self.status_lbl.setText("✅ ¡Análisis Completado!")
            self.status_lbl.setStyleSheet("color: #10B981; font-weight: bold;")
            self.btn_export.setStyleSheet("background-color: #3B82F6;")
            print(visualizer.generate_report_text())

        except Exception as e:
            self.status_lbl.setText("⚠️ Error fatal en análisis.")
            self.status_lbl.setStyleSheet("color: #EF4444;")
            print(f"Detalle del error: {e}")
            import traceback
            traceback.print_exc()

    def load_video(self):
        filename, _ = QFileDialog.getOpenFileName(self, "Seleccionar Video", "", "Videos (*.mp4 *.avi *.mov *.mkv)")
        if filename:
            self.current_video = filename
            nombre_archivo = os.path.basename(filename)
            self.status_lbl.setText(f"Video: {nombre_archivo}")
            self.status_lbl.setStyleSheet("color: #38BDF8; font-weight: bold;")
            self.video_frame.setText(f"🎬 {nombre_archivo}\n\nPresiona 'ANALIZAR' para comenzar")

    def generate_annotated_video(self, result):
        """Genera video con skeleton y métricas."""
        import cv2
        import mediapipe as mp
        from datetime import datetime
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = f"analysis_results/{timestamp}"
        os.makedirs(output_dir, exist_ok=True)
        out_path = f"{output_dir}/sprint_analyzed.mp4"
        
        cap = cv2.VideoCapture(self.current_video)
        fps = result.fps
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(out_path, fourcc, fps, (w, h))
        
        mp_pose = mp.solutions.pose
        mp_drawing = mp.solutions.drawing_utils
        
        frame_idx = 0
        time_series = result.time_series
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Obtener landmarks del historial
            if hasattr(result, 'landmarks_history') and frame_idx < len(result.landmarks_history):
                lms = result.landmarks_history[frame_idx]
                if lms:
                    # Dibujar skeleton
                    mp_drawing.draw_landmarks(
                        frame, lms, mp_pose.POSE_CONNECTIONS,
                        mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=3),
                        mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2)
                    )
                    
                    # Mostrar métricas en el frame
                    self.draw_metrics_on_frame(frame, time_series, frame_idx)
            
            out.write(frame)
            frame_idx += 1
        
        cap.release()
        out.release()
        print(f"✅ Video guardado: {out_path}")

    def open_output_folder(self):
        """Abre la carpeta de resultados."""
        if os.path.exists("output"):
            os.startfile("output")
        elif os.path.exists("analysis_results"):
            folders = [f for f in os.listdir("analysis_results") if os.path.isdir(f"analysis_results/{f}")]
            if folders:
                latest = sorted(folders)[-1]
                os.startfile(f"analysis_results/{latest}")
        else:
            self.status_lbl.setText("No hay resultados aún")
            self.status_lbl.setStyleSheet("color: #F59E0B;")
    
    def draw_metrics_on_frame(self, frame, time_series, frame_idx):
        """Dibuja métricas en el frame."""
        h, w = frame.shape[:2]
        
        # Fondo semi-transparente
        overlay = frame.copy()
        cv2.rectangle(overlay, (10, 10), (350, 180), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
        
        # Obtener valores
        knee_r = time_series['knee_angle_right'][frame_idx] if frame_idx < len(time_series['knee_angle_right']) else 0
        knee_l = time_series['knee_angle_left'][frame_idx] if frame_idx < len(time_series['knee_angle_left']) else 0
        hip = time_series['hip_angle_right'][frame_idx] if frame_idx < len(time_series['hip_angle_right']) else 0
        trunk = time_series['trunk_lean'][frame_idx] if frame_idx < len(time_series['trunk_lean']) else 0
        
        # Mostrar métricas
        import cv2
        cv2.putText(frame, f"Frame: {frame_idx}", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, f"Rodilla D: {knee_r:.1f}°", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.putText(frame, f"Rodilla I: {knee_l:.1f}°", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.putText(frame, f"Cadera: {hip:.1f}°", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        cv2.putText(frame, f"Tronco: {trunk:.1f}°", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        # Score
        score = self.calculate_score(knee_r, knee_l, hip, trunk)
        color = (0, 255, 0) if score >= 70 else (0, 165, 255) if score >= 50 else (0, 0, 255)
        cv2.putText(frame, f"Score: {score}/100", (20, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    
    def calculate_score(self, knee_r, knee_l, hip, trunk):
        """Calcula score biomecánico."""
        score = 100
        if knee_r > 170 or knee_r < 140: score -= 15
        if knee_l > 170 or knee_l < 140: score -= 15
        if hip > 160: score -= 10
        if abs(trunk) > 30: score -= 10
        asymmetry = abs(knee_r - knee_l)
        if asymmetry > 15: score -= int(asymmetry)
        return max(0, min(100, int(score)))
    
    def save_session_metrics(self, result):
        """Guarda métricas de la sesión."""
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = f"analysis_results/{timestamp}"
        
        # Crear directorio si no existe
        os.makedirs(output_dir, exist_ok=True)
        
        # Guardar resumen
        summary_file = f"{output_dir}/resumen.txt"
        with open(summary_file, 'w') as f:
            f.write("=" * 50 + "\n")
            f.write("REPORTE BIOMECÁNICO - BOLT REBOOT\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Video: {result.video_path}\n")
            f.write(f"FPS: {result.fps:.1f}\n")
            f.write(f"Duración: {result.duration_seconds:.2f}s\n\n")
            
            f.write("MÉTRICAS PRINCIPALES:\n")
            f.write("-" * 30 + "\n")
            summary = result.summary_metrics
            f.write(f"Ángulo Rodilla D: {summary.get('mean_knee_angle_right', 0):.1f}°\n")
            f.write(f"Ángulo Rodilla I: {summary.get('mean_knee_angle_left', 0):.1f}°\n")
            f.write(f"Ángulo Cadera D: {summary.get('mean_hip_angle_right', 0):.1f}°\n")
            f.write(f"Ángulo Cadera I: {summary.get('mean_hip_angle_left', 0):.1f}°\n")
            f.write(f"Inclinación Tronco: {summary.get('mean_trunk_lean', 0):.1f}°\n")
            f.write(f"Asimetría Rodillas: {summary.get('knee_asymmetry', 0):.1f}°\n")
            f.write(f"Asimetría Cadera: {summary.get('hip_asymmetry', 0):.1f}°\n\n")
            
            f.write("TIEMPOS:\n")
            f.write("-" * 30 + "\n")
            f.write(f"Tiempo Reacción: {result.reaction_time_ms or 'N/A'} ms\n")
            f.write(f"Block Clearance: {result.block_clearance_time_ms or 'N/A'} ms\n\n")
            
            f.write("CONTACTOS:\n")
            f.write("-" * 30 + "\n")
            contacts = result.contacts_summary
            f.write(f"Total Contactos: {contacts.get('total_contacts', 0)}\n")
            f.write(f"Tiempo Vuelo Prom: {contacts.get('average_flight_time_ms', 0):.0f} ms\n")
            f.write(f"Tiempo Contacto Prom: {contacts.get('average_ground_time_ms', 0):.0f} ms\n\n")
            
            f.write("CONFIANZA:\n")
            f.write("-" * 30 + "\n")
            reliability = result.reliability_report
            f.write(f"Calidad: {reliability.get('validity_percentage', 0):.1f}%\n")
            f.write(f"Frames Válidos: {reliability.get('valid_frames', 0)}\n")
            f.write(f"Frames Totales: {reliability.get('total_frames', 0)}\n")
        
        print(f"✅ Resumen guardado en: {summary_file}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = ModernSprintDashboard()
    window.show()
    sys.exit(app.exec_())