"""
Gestor y comparador de sesiones de entrenamiento para Bolt Reboot (escritorio).
Persiste sesiones en analysis_results/sessions.json y calcula mejoras entre sesiones.
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


class SessionComparator:
    """Guarda y compara sesiones biomecánicas entre entrenamientos."""

    def __init__(self, storage_path: str = "analysis_results/sessions.json"):
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.sessions: List[Dict[str, Any]] = self._load()

    def _load(self) -> List[Dict[str, Any]]:
        if not self.storage_path.exists():
            return []
        try:
            data = json.loads(self.storage_path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def _persist(self) -> None:
        self.storage_path.write_text(
            json.dumps(self.sessions, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def save_session(self, session_data: Dict[str, Any]) -> int:
        next_id = max((int(s.get("id", 0)) for s in self.sessions), default=0) + 1
        record = {
            "id": next_id,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            **session_data,
        }
        self.sessions.append(record)
        self._persist()
        return next_id

    def get_recent_sessions(self, count: int = 5) -> List[Dict[str, Any]]:
        return list(reversed(self.sessions[-count:]))

    def _find_by_id(self, session_id: int) -> Optional[Dict[str, Any]]:
        for s in self.sessions:
            if int(s.get("id", -1)) == int(session_id):
                return s
        return None

    def compare_sessions(self, session_id_a: int, session_id_b: int) -> Dict[str, Any]:
        s_a = self._find_by_id(session_id_a)
        s_b = self._find_by_id(session_id_b)
        if not s_a or not s_b:
            return {"error": "Sesión no encontrada"}

        score_a = float(s_a.get("technique_score", 0.0))
        score_b = float(s_b.get("technique_score", 0.0))
        delta = round(score_b - score_a, 1)

        return {
            "session_a_id": session_id_a,
            "session_b_id": session_id_b,
            "score_a": score_a,
            "score_b": score_b,
            "technique_delta": delta,
        }

    @staticmethod
    def get_comparison_message(comparison: Dict[str, Any]) -> str:
        if "error" in comparison:
            return comparison["error"]
        delta = float(comparison.get("technique_delta", 0.0))
        sa = comparison.get("session_a_id")
        sb = comparison.get("session_b_id")
        if delta > 0:
            return f"Mejora de +{delta:.1f} pts en técnica (Sesión #{sb} vs #{sa})"
        if delta < 0:
            return f"Descenso de {delta:.1f} pts en técnica (Sesión #{sb} vs #{sa})"
        return f"Rendimiento técnico estable (0.0 pts entre Sesión #{sa} y #{sb})"
