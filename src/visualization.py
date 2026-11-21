"""
Visualización y exportación de reportes biomecánicos (PNG, PDF, CSV, JSON, TXT)
para la aplicación de escritorio Bolt Reboot - Sprint Biomechanics Pro.
"""

import csv
import json
import os
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from .analyzer_profesional import AnalysisResult


class SprintVisualizer:
    """Genera gráficas científicas y reportes exportables a partir de AnalysisResult."""

    def __init__(self, result: AnalysisResult):
        self.result = result

    def _draw_line_chart_cv2(
        self,
        output_path: str,
        title: str,
        series_list,
        y_min: float,
        y_max: float,
        y_label: str,
    ) -> str:
        """Renderiza gráficas limpias con OpenCV (sin requerir backend GUI de matplotlib)."""
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        w, h = 1000, 460
        img = np.full((h, w, 3), (42, 23, 15), dtype=np.uint8)  # #0F172A en BGR

        pad_l, pad_r, pad_t, pad_b = 80, 40, 60, 60
        plot_w = w - pad_l - pad_r
        plot_h = h - pad_t - pad_b

        cv2.rectangle(img, (pad_l, pad_t), (w - pad_r, h - pad_b), (59, 41, 30), -1)
        cv2.rectangle(img, (pad_l, pad_t), (w - pad_r, h - pad_b), (85, 65, 51), 1)

        # Gridlines
        for i in range(5):
            gy = int(pad_t + (plot_h * i) / 4)
            cv2.line(img, (pad_l, gy), (w - pad_r, gy), (65, 50, 40), 1)
            val = y_max - (y_max - y_min) * (i / 4)
            cv2.putText(
                img,
                f"{val:.0f}",
                (22, gy + 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (184, 163, 148),
                1,
            )

        cv2.putText(img, title, (pad_l, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (252, 250, 248), 2)
        cv2.putText(img, y_label, (12, pad_t - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (184, 163, 148), 1)

        legend_x = pad_l + 10
        for label, values, bgr in series_list:
            if len(values) < 2:
                continue
            pts = []
            n = len(values)
            for idx, v in enumerate(values):
                px = int(pad_l + (idx / max(1, n - 1)) * plot_w)
                clamped = max(y_min, min(y_max, float(v)))
                py = int(pad_t + plot_h - ((clamped - y_min) / max(1e-5, y_max - y_min)) * plot_h)
                pts.append((px, py))
            for i in range(1, len(pts)):
                cv2.line(img, pts[i - 1], pts[i], bgr, 2, cv2.LINE_AA)

            cv2.rectangle(img, (legend_x, h - 34), (legend_x + 14, h - 20), bgr, -1)
            cv2.putText(
                img,
                label,
                (legend_x + 20, h - 22),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (248, 250, 252),
                1,
            )
            legend_x += 170

        cv2.imwrite(output_path, img)
        return output_path

    def plot_angles_over_time(self, output_path: str = "output/grafica_angulos.png") -> str:
        ts = self.result.time_series
        return self._draw_line_chart_cv2(
            output_path=output_path,
            title="Bolt Reboot - Angulos Articulares vs Frame",
            series_list=[
                ("Rodilla D", ts.get("knee_angle_right", []), (248, 189, 56)),
                ("Rodilla I", ts.get("knee_angle_left", []), (129, 185, 16)),
                ("Tronco", ts.get("trunk_lean", []), (11, 158, 245)),
            ],
            y_min=0.0,
            y_max=185.0,
            y_label="Grados",
        )

    def plot_contact_analysis(self, output_path: str = "output/grafica_contactos.png") -> str:
        ts = self.result.time_series
        vel = ts.get("velocity_ms", [])
        contacts = [c * 10.0 for c in ts.get("contacts", [])]
        return self._draw_line_chart_cv2(
            output_path=output_path,
            title="Bolt Reboot - Velocidad (m/s) y Contactos de Apoyo",
            series_list=[
                ("Velocidad m/s", vel, (248, 189, 56)),
                ("Contacto suelo", contacts, (129, 185, 16)),
            ],
            y_min=0.0,
            y_max=13.0,
            y_label="m/s",
        )

    def generate_report_text(self) -> str:
        s = self.result.summary_metrics
        c = self.result.contacts_summary
        r = self.result.reliability_report
        lines = [
            "=" * 54,
            "REPORTE BIOMECÁNICO - BOLT REBOOT (v2.1)",
            "=" * 54,
            f"Video: {self.result.video_path}",
            f"FPS: {self.result.fps:.1f} | Duración: {self.result.duration_seconds:.2f}s",
            f"Calidad detección: {r.get('validity_percentage', 0):.1f}% ({r.get('valid_frames', 0)}/{r.get('total_frames', 0)} frames)",
            "",
            f"Score Total: {self.result.scores.get('overall', 0)}/100 "
            f"(Técnica: {self.result.scores.get('technique', 0)} | "
            f"Potencia: {self.result.scores.get('power', 0)} | "
            f"Eficiencia: {self.result.scores.get('efficiency', 0)})",
            "",
            f"Rodilla D: {s.get('mean_knee_angle_right', 0):.1f}° | Rodilla I: {s.get('mean_knee_angle_left', 0):.1f}° "
            f"(Asimetría: {s.get('knee_asymmetry', 0):.1f}°)",
            f"Cadera D: {s.get('mean_hip_angle_right', 0):.1f}° | Cadera I: {s.get('mean_hip_angle_left', 0):.1f}°",
            f"Tronco: {s.get('mean_trunk_lean', 0):.1f}° | Vel. Máx: {s.get('max_velocity_ms', 0):.2f} m/s",
            f"Reacción: {self.result.reaction_time_ms or 0:.0f} ms | Contactos: {c.get('total_contacts', 0)} pasos",
            f"Contacto Prom: {c.get('average_ground_time_ms', 0):.0f} ms | Vuelo Prom: {c.get('average_flight_time_ms', 0):.0f} ms",
            "=" * 54,
        ]
        return "\n".join(lines)

    def export_csv(self, output_path: str = "output/sprint_metrics.csv") -> str:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        ts = self.result.time_series
        n = len(ts.get("timestamps", []))
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "frame",
                    "time_s",
                    "distance_m",
                    "velocity_ms",
                    "knee_right_deg",
                    "knee_left_deg",
                    "hip_right_deg",
                    "hip_left_deg",
                    "trunk_lean_deg",
                    "ground_contact",
                ]
            )
            for i in range(n):
                writer.writerow(
                    [
                        i,
                        round(ts["timestamps"][i], 3),
                        round(ts["distance_m"][i], 2),
                        round(ts["velocity_ms"][i], 2),
                        round(ts["knee_angle_right"][i], 1),
                        round(ts["knee_angle_left"][i], 1),
                        round(ts["hip_angle_right"][i], 1),
                        round(ts["hip_angle_left"][i], 1),
                        round(ts["trunk_lean"][i], 1),
                        ts["contacts"][i],
                    ]
                )
        return output_path

    def export_json(self, output_path: str = "output/sprint_metrics.json") -> str:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "video_path": self.result.video_path,
            "fps": self.result.fps,
            "duration_seconds": self.result.duration_seconds,
            "reaction_time_ms": self.result.reaction_time_ms,
            "block_clearance_time_ms": self.result.block_clearance_time_ms,
            "summary_metrics": self.result.summary_metrics,
            "contacts_summary": self.result.contacts_summary,
            "reliability_report": self.result.reliability_report,
            "scores": self.result.scores,
            "phases": self.result.phases,
            "recommendations": self.result.recommendations,
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        return output_path

    def export_pdf(self, output_path: Optional[str] = None) -> str:
        """Genera PDF usando ReportLab si está disponible."""
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        target = output_path or os.path.join("output", "reporte_sprint.pdf")
        Path(target).parent.mkdir(parents=True, exist_ok=True)
        c = canvas.Canvas(target, pagesize=A4)
        _, height = A4
        y = height - 50
        c.setFont("Helvetica-Bold", 16)
        c.drawString(40, y, "BOLT REBOOT - REPORTE BIOMECANICO DE SPRINT 100M")
        y -= 28
        c.setFont("Courier", 9)
        for line in self.generate_report_text().splitlines():
            c.drawString(40, y, line)
            y -= 14
            if y < 50:
                c.showPage()
                y = height - 50
                c.setFont("Courier", 9)
        c.save()
        return target
