import cv2
import math
import mediapipe as mp

class PoseEstimator:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(model_complexity=1, min_detection_confidence=0.5, min_tracking_confidence=0.5)
        self.mp_drawing = mp.solutions.drawing_utils

    def calculate_angle(self, a, b, c):
        ang = math.degrees(math.atan2(c.y - b.y, c.x - b.x) - math.atan2(a.y - b.y, a.x - b.x))
        ang = ang + 360 if ang < 0 else ang
        return ang if ang < 180 else 360 - ang

    def process_frame(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_frame)

        angles = {}
        evaluation = {}

        # Copiar para no alterar el original de forma destructiva
        processed_frame = frame.copy()

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            lm = self.mp_pose.PoseLandmark

            # Calcula ángulos clave
            left_knee_ang = self.calculate_angle(landmarks[lm.LEFT_HIP], landmarks[lm.LEFT_KNEE], landmarks[lm.LEFT_ANKLE])
            right_knee_ang = self.calculate_angle(landmarks[lm.RIGHT_HIP], landmarks[lm.RIGHT_KNEE], landmarks[lm.RIGHT_ANKLE])
            left_hip_ang = self.calculate_angle(landmarks[lm.LEFT_SHOULDER], landmarks[lm.LEFT_HIP], landmarks[lm.LEFT_KNEE])
            right_hip_ang = self.calculate_angle(landmarks[lm.RIGHT_SHOULDER], landmarks[lm.RIGHT_HIP], landmarks[lm.RIGHT_KNEE])

            # Aproximar inclinación del tronco midiendo el ángulo entre el hombro, cadera y una vertical
            # O simplemente el ángulo relativo al suelo.
            # Para simplificar: tronco respecto a la vertical
            mid_shoulder_x = (landmarks[lm.LEFT_SHOULDER].x + landmarks[lm.RIGHT_SHOULDER].x) / 2
            mid_shoulder_y = (landmarks[lm.LEFT_SHOULDER].y + landmarks[lm.RIGHT_SHOULDER].y) / 2
            mid_hip_x = (landmarks[lm.LEFT_HIP].x + landmarks[lm.RIGHT_HIP].x) / 2
            mid_hip_y = (landmarks[lm.LEFT_HIP].y + landmarks[lm.RIGHT_HIP].y) / 2

            trunk_ang = math.degrees(math.atan2(mid_hip_y - mid_shoulder_y, mid_hip_x - mid_shoulder_x)) - 90

            angles = {
                'left_knee': left_knee_ang,
                'right_knee': right_knee_ang,
                'left_hip': left_hip_ang,
                'right_hip': right_hip_ang,
                'trunk': trunk_ang
            }

            # Lógica de evaluación para amateurs
            for joint, ang in angles.items():
                if 'knee' in joint:
                    if 140 <= ang <= 170:
                        evaluation[joint] = 'green'
                    elif 120 <= ang < 140 or 170 < ang <= 175:
                        evaluation[joint] = 'yellow'
                    else:
                        evaluation[joint] = 'red'
                elif 'trunk' in joint:
                    if -15 <= ang <= 15:
                        evaluation[joint] = 'green'
                    elif -30 <= ang < -15 or 15 < ang <= 30:
                        evaluation[joint] = 'yellow'
                    else:
                        evaluation[joint] = 'red'
                elif 'hip' in joint:
                    if 140 <= ang <= 180:
                        evaluation[joint] = 'green'
                    elif 120 <= ang < 140:
                        evaluation[joint] = 'yellow'
                    else:
                        evaluation[joint] = 'red'

            # Dibujar el esqueleto con colores
            self.mp_drawing.draw_landmarks(
                processed_frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2, circle_radius=2),
                self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2)
            )

        return processed_frame, angles, evaluation

    def get_feedback_message(self, evaluation):
        if not evaluation:
            return "No se detecta corredor."

        reds = sum(1 for v in evaluation.values() if v == 'red')
        yellows = sum(1 for v in evaluation.values() if v == 'yellow')

        if reds > 1:
            return "Atencion: Cuida la postura (evaluacion roja)."
        elif yellows > 1:
            return "Vas bien, intenta levantar mas las rodillas y mantener el tronco recto."
        else:
            return "¡Excelente forma! Sigue asi."
