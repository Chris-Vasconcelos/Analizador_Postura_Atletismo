import datetime

class SessionComparator:
    def __init__(self):
        self.sessions = []
        self._next_id = 1

    def save_session(self, session_data):
        session = {
            'id': self._next_id,
            'timestamp': datetime.datetime.now().isoformat(),
            **session_data
        }
        self.sessions.append(session)
        self._next_id += 1
        return session['id']

    def get_recent_sessions(self, limit=2):
        return sorted(self.sessions, key=lambda x: x['id'], reverse=True)[:limit]

    def compare_sessions(self, session_id1, session_id2):
        s1 = next((s for s in self.sessions if s['id'] == session_id1), None)
        s2 = next((s for s in self.sessions if s['id'] == session_id2), None)

        if not s1 or not s2:
            return None

        # Make sure s1 is the older session
        if s1['id'] > s2['id']:
            s1, s2 = s2, s1

        return {
            'older_id': s1['id'],
            'newer_id': s2['id'],
            'older_score': s1.get('technique_score', 0),
            'newer_score': s2.get('technique_score', 0),
        }

    def get_comparison_message(self, comparison):
        if not comparison:
            return "No hay suficientes sesiones para comparar."

        old_score = comparison['older_score']
        new_score = comparison['newer_score']

        diff = new_score - old_score

        if diff > 5:
            return f"¡Gran mejora! Tu tecnica subio {diff:.1f} puntos."
        elif diff > 0:
            return f"Vas mejorando poco a poco. Subiste {diff:.1f} puntos."
        elif diff > -5:
            return "Mantuviste tu nivel. ¡Sigue practicando!"
        else:
            return "Hoy estuviste un poco mas flojo, pero la proxima ira mejor. ¡No te rindas!"
