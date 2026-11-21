"""
Estimador de Pose con feedback visual por colores (verde/amarillo/rojo)
compatible con demo_completo.py, save_processed_video.py y test_pose_system.py.
"""

import math
from typing import Dict, Tuple

import cv2
import numpy as np

try:
    import mediapipe as mp
except ImportError:
    mp = None


class PoseEstimator:
    """Detecta poses con MediaPipe, calcula ángulos clave y dibuja esqueleto coloreado."""

    COLOR_BGR = {
        "green": (0, 220, 80),
        "yellow": (0, 220, 255),
        "red": (40, 40, 240),
    }

    def __init__(
        self,
        model_complexity: int = 1,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        if mp is None:
            raise RuntimeError("MediaPipe no está instalado. Ejecuta: pip install -r requirements.txt")
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=model_complexity,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )

    @staticmethod
    def _calculate_angle(a, b, c) -> float:
        ang = math.degrees(
            math.atan2(c.y - b.y, c.x - b.x) - math.atan2(a.y - b.y, a.x - b.x)
        )
        ang = ang + 360.0 if ang < 0 else ang
        return ang if ang < 180.0 else 360.0 - ang

    @staticmethod
    def _evaluate_angles(angles: Dict[str, float]) -> Dict[str, str]:
        evaluation: Dict[str, str] = {}
        for k in ("left_knee", "right_knee"):
            if k in angles:
                v = angles[k]
                evaluation[k] = "green" if 115 <= v <= 168 else ("yellow" if 85 <= v <= 176 else "red")
        for k in ("left_hip", "right_hip"):
            if k in angles:
                v = angles[k]
                evaluation[k] = "green" if 110 <= v <= 165 else ("yellow" if 85 <= v <= 175 else "red")
        if "trunk" in angles:
            t = angles["trunk"]
            evaluation["trunk"] = "green" if 5 <= t <= 35 else ("yellow" if t <= 50 else "red")
        return evaluation

    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict[str, float], Dict[str, str]]:
        output = frame.copy()
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = self.pose.process(rgb)

        if not res.pose_landmarks:
            return output, {}, {}

        lm = res.pose_landmarks.landmark
        e = self.mp_pose.PoseLandmark

        left_knee = self._calculate_angle(lm[e.LEFT_HIP], lm[e.LEFT_KNEE], lm[e.LEFT_ANKLE])
        right_knee = self._calculate_angle(lm[e.RIGHT_HIP], lm[e.RIGHT_KNEE], lm[e.RIGHT_ANKLE])
        left_hip = self._calculate_angle(lm[e.LEFT_SHOULDER], lm[e.LEFT_HIP], lm[e.LEFT_KNEE])
        right_hip = self._calculate_angle(lm[e.RIGHT_SHOULDER], lm[e.RIGHT_HIP], lm[e.RIGHT_KNEE])

        mid_sh_x = (lm[e.LEFT_SHOULDER].x + lm[e.RIGHT_SHOULDER].x) * 0.5
        mid_sh_y = (lm[e.LEFT_SHOULDER].y + lm[e.RIGHT_SHOULDER].y) * 0.5
        mid_hip_x = (lm[e.LEFT_HIP].x + lm[e.RIGHT_HIP].x) * 0.5
        mid_hip_y = (lm[e.LEFT_HIP].y + lm[e.RIGHT_HIP].y) * 0.5
        dy = max(1e-5, abs(mid_hip_y - mid_sh_y))
        trunk = math.degrees(math.atan2(abs(mid_sh_x - mid_hip_x), dy))

        angles = {
            "left_knee": left_knee,
            "right_knee": right_knee,
            "left_hip": left_hip,
            "right_hip": right_hip,
            "trunk": trunk,
        }
        evaluation = self._evaluate_angles(angles)

        # Dibujar esqueleto coloreado
        h, w = output.shape[:2]

        def pt(idx) -> Tuple[int, int]:
            return int(lm[idx].x * w), int(lm[idx].y * h)

        segments = [
            (e.LEFT_SHOULDER, e.RIGHT_SHOULDER, evaluation.get("trunk", "green")),
            (e.LEFT_SHOULDER, e.LEFT_HIP, evaluation.get("trunk", "green")),
            (e.RIGHT_SHOULDER, e.RIGHT_HIP, evaluation.get("trunk", "green")),
            (e.LEFT_HIP, e.RIGHT_HIP, evaluation.get("trunk", "green")),
            (e.LEFT_HIP, e.LEFT_KNEE, evaluation.get("left_knee", "green")),
            (e.LEFT_KNEE, e.LEFT_ANKLE, evaluation.get("left_knee", "green")),
            (e.RIGHT_HIP, e.RIGHT_KNEE, evaluation.get("right_knee", "green")),
            (e.RIGHT_KNEE, e.RIGHT_ANKLE, evaluation.get("right_knee", "green")),
            (e.LEFT_SHOULDER, e.LEFT_ELBOW, "green"),
            (e.LEFT_ELBOW, e.LEFT_WRIST, "green"),
            (e.RIGHT_SHOULDER, e.RIGHT_ELBOW, "green"),
            (e.RIGHT_ELBOW, e.RIGHT_WRIST, "green"),
        ]

        for a_idx, b_idx, status in segments:
            color = self.COLOR_BGR.get(status, (0, 220, 80))
            cv2.line(output, pt(a_idx), pt(b_idx), color, 3, cv2.LINE_AA)

        for idx in (
            e.LEFT_SHOULDER,
            e.RIGHT_SHOULDER,
            e.LEFT_HIP,
            e.RIGHT_HIP,
            e.LEFT_KNEE,
            e.RIGHT_KNEE,
            e.LEFT_ANKLE,
            e.RIGHT_ANKLE,
        ):
            cv2.circle(output, pt(idx), 5, (255, 255, 255), -1)

        return output, angles, evaluation

    @staticmethod
    def get_feedback_message(evaluation: Dict[str, str]) -> str:
        if not evaluation:
            return "Buscando atleta..."
        vals = list(evaluation.values())
        if vals.count("red") >= 2:
            return "Corregir alineacion y extension articular"
        if evaluation.get("trunk") == "red":
            return "Excesiva inclinacion de tronco"
        if evaluation.get("left_knee") == "red" or evaluation.get("right_knee") == "red":
            return "Revisar angulo de ataque de rodilla"
        if vals.count("yellow") >= 2:
            return "Ajustar simetria y recobro de zancada"
        return "Tecnica biomecanica optima"
