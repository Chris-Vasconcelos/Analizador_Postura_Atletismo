import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, BookmarkPlus, Trash2 } from 'lucide-react';
import { AnalysisResult, SavedSession } from '../types/biomechanics';
import { compareSessions } from '../utils/sessionStorage';

interface SessionsViewProps {
  sessions: SavedSession[];
  currentResult: AnalysisResult | null;
  onSaveCurrent: (label: string) => void;
  onDeleteSession: (id: number) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  sessions,
  currentResult,
  onSaveCurrent,
  onDeleteSession,
}) => {
  const [labelInput, setLabelInput] = useState('');
  const [sessionAId, setSessionAId] = useState<number | null>(sessions[1]?.id ?? sessions[0]?.id ?? null);
  const [sessionBId, setSessionBId] = useState<number | null>(sessions[0]?.id ?? null);

  const effectiveA = useMemo(() => {
    if (sessions.length < 2) return null;
    return sessions.find((s) => s.id === sessionAId) ?? sessions[1];
  }, [sessions, sessionAId]);

  const effectiveB = useMemo(() => {
    if (sessions.length < 2) return null;
    return sessions.find((s) => s.id === sessionBId) ?? sessions[0];
  }, [sessions, sessionBId]);

  const comparison = useMemo(() => {
    if (!effectiveA || !effectiveB || effectiveA.id === effectiveB.id) return null;
    return compareSessions(effectiveA, effectiveB);
  }, [effectiveA, effectiveB]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentResult) return;
    onSaveCurrent(labelInput);
    setLabelInput('');
  };

  return (
    <div className="space-y-6">
      {/* Save current session bar */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <h3 className="text-sm font-bold text-[#F8FAFC] mb-1">
          Guardar Sesión Actual (SessionComparator)
        </h3>
        <p className="text-xs text-[#94A3B8] mb-3">
          Guarda tus análisis para comparar evolución de técnica, velocidad máxima, reacción y
          asimetría entre entrenamientos.
        </p>
        <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder={
              currentResult
                ? `Ej: Entrenamiento Pista — ${currentResult.videoName}`
                : 'Completa un análisis primero para guardar sesión'
            }
            disabled={!currentResult}
            className="flex-1 bg-[#0F172A] border border-[#334155] rounded-lg px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!currentResult}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] disabled:bg-[#334155] disabled:text-[#64748B] text-white font-bold text-sm rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <BookmarkPlus className="w-4 h-4" />
            Guardar Sesión
          </button>
        </form>
      </div>

      {/* Session Comparison Box */}
      {sessions.length >= 2 && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightLeft className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Comparación Entre Entrenamientos
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Sesión Base (A)
              </label>
              <select
                value={effectiveA?.id ?? ''}
                onChange={(e) => setSessionAId(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#F8FAFC]"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} — {s.label} ({s.overallScore}/100)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                Sesión Comparada (B)
              </label>
              <select
                value={effectiveB?.id ?? ''}
                onChange={(e) => setSessionBId(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#F8FAFC]"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} — {s.label} ({s.overallScore}/100)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {comparison ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#0F172A] border border-[#38BDF8]/30 text-sm text-[#E2E8F0]">
                {comparison.summaryMessage}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  {
                    label: 'Score Global',
                    delta: comparison.overallDelta,
                    suffix: ' pts',
                    positiveGood: true,
                  },
                  {
                    label: 'Técnica',
                    delta: comparison.techniqueDelta,
                    suffix: ' pts',
                    positiveGood: true,
                  },
                  {
                    label: 'Vel. Máxima',
                    delta: comparison.velocityDelta,
                    suffix: ' m/s',
                    positiveGood: true,
                  },
                  {
                    label: 'Reacción',
                    delta: comparison.reactionDelta,
                    suffix: ' ms',
                    positiveGood: false,
                  },
                  {
                    label: 'Asimetría Rodillas',
                    delta: comparison.asymmetryDelta,
                    suffix: '°',
                    positiveGood: false,
                  },
                ].map((metric) => {
                  const isGood = metric.positiveGood ? metric.delta >= 0 : metric.delta <= 0;
                  const sign = metric.delta > 0 ? '+' : '';
                  return (
                    <div
                      key={metric.label}
                      className="bg-[#0F172A] border border-[#334155] rounded-lg p-3"
                    >
                      <span className="block text-[11px] uppercase font-bold text-[#94A3B8] mb-1">
                        {metric.label}
                      </span>
                      <span
                        className={`text-lg font-black tabular-nums ${
                          metric.delta === 0
                            ? 'text-[#CBD5E1]'
                            : isGood
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {sign}
                        {metric.delta}
                        {metric.suffix}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#94A3B8]">
              Selecciona dos sesiones distintas para visualizar las diferencias biomecánicas.
            </p>
          )}
        </div>
      )}

      {/* Saved sessions list */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#F8FAFC]">
            Historial de Sesiones Guardadas ({sessions.length})
          </h3>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#94A3B8]">
            Aún no hay sesiones guardadas. Analiza un video o ejecuta la demo y haz clic en{' '}
            <strong className="text-[#F8FAFC]">Guardar Sesión</strong>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F172A] text-[#94A3B8] uppercase">
                <tr>
                  <th className="px-4 py-3">Sesión</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Técnica</th>
                  <th className="px-4 py-3">Vel. Máx</th>
                  <th className="px-4 py-3">Reacción</th>
                  <th className="px-4 py-3">Rodilla D / I</th>
                  <th className="px-4 py-3">Contactos</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#0F172A]/40">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#F8FAFC]">{s.label}</div>
                      <div className="text-[11px] text-[#64748B]">
                        {new Date(s.createdAt).toLocaleString('es-ES')}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-black text-[#38BDF8] tabular-nums">
                      {s.overallScore}/100
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-400 tabular-nums">
                      {s.techniqueScore}/100
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s.maxVelocityMs.toFixed(2)} m/s</td>
                    <td className="px-4 py-3 tabular-nums">{s.reactionTimeMs} ms</td>
                    <td className="px-4 py-3 tabular-nums">
                      {s.summaryMetrics.meanKneeAngleRight.toFixed(1)}° /{' '}
                      {s.summaryMetrics.meanKneeAngleLeft.toFixed(1)}°
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s.totalContacts}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteSession(s.id)}
                        className="p-1.5 text-[#94A3B8] hover:text-red-400 transition-colors cursor-pointer"
                        title="Eliminar sesión"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
