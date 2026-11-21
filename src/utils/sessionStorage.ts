import { AnalysisResult, SavedSession, SessionComparison } from '../types/biomechanics';

const STORAGE_KEY = 'bolt_reboot_saved_sessions_v2';

export function loadSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAnalysisSession(result: AnalysisResult, customLabel?: string): SavedSession {
  const existing = loadSessions();
  const nextId = existing.length > 0 ? Math.max(...existing.map((s) => s.id)) + 1 : 1;

  const session: SavedSession = {
    id: nextId,
    label: customLabel?.trim() || `Sesión #${nextId} — ${result.videoName}`,
    createdAt: result.createdAt,
    videoName: result.videoName,
    framesAnalyzed: result.validFrames,
    techniqueScore: result.scores.technique,
    powerScore: result.scores.power,
    efficiencyScore: result.scores.efficiency,
    overallScore: result.scores.overall,
    reactionTimeMs: result.reactionTimeMs,
    maxVelocityMs: result.summaryMetrics.maxVelocityMs,
    totalContacts: result.contactsSummary.totalContacts,
    summaryMetrics: result.summaryMetrics,
    colorDistribution: result.colorDistribution,
  };

  const updated = [session, ...existing].slice(0, 30);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota issues in restricted environments
  }
  return session;
}

export function deleteSession(id: number): SavedSession[] {
  const updated = loadSessions().filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
  return updated;
}

/**
 * Port of SessionComparator.compare_sessions & get_comparison_message from demo_completo.py
 */
export function compareSessions(sessionA: SavedSession, sessionB: SavedSession): SessionComparison {
  const overallDelta = Number((sessionB.overallScore - sessionA.overallScore).toFixed(1));
  const techniqueDelta = Number((sessionB.techniqueScore - sessionA.techniqueScore).toFixed(1));
  const velocityDelta = Number((sessionB.maxVelocityMs - sessionA.maxVelocityMs).toFixed(2));
  const reactionDelta = Math.round(sessionB.reactionTimeMs - sessionA.reactionTimeMs);
  const asymmetryDelta = Number(
    (sessionB.summaryMetrics.kneeAsymmetry - sessionA.summaryMetrics.kneeAsymmetry).toFixed(1)
  );

  let summaryMessage = '';
  if (overallDelta > 2) {
    summaryMessage = `Mejora global de +${overallDelta} pts en "${sessionB.label}" respecto a "${sessionA.label}".`;
  } else if (overallDelta < -2) {
    summaryMessage = `Descenso global de ${overallDelta} pts respecto a la sesión base. Revisar fatiga y simetría.`;
  } else {
    summaryMessage = `Rendimiento estable (${overallDelta >= 0 ? '+' : ''}${overallDelta} pts) entre ambas sesiones.`;
  }

  return {
    sessionA,
    sessionB,
    overallDelta,
    techniqueDelta,
    velocityDelta,
    reactionDelta,
    asymmetryDelta,
    summaryMessage,
  };
}
