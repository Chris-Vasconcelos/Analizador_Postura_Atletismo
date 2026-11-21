import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, Gauge, TrendingUp } from 'lucide-react';
import { ELITE_STANDARDS } from '../engine/biomechanics';
import { AnalysisResult } from '../types/biomechanics';

interface PhaseAnalysisViewProps {
  result: AnalysisResult | null;
  onRunDemo: () => void;
}

export const PhaseAnalysisView: React.FC<PhaseAnalysisViewProps> = ({ result, onRunDemo }) => {
  const [selectedEliteId, setSelectedEliteId] = useState<string>(ELITE_STANDARDS[0].id);

  const selectedElite = useMemo(
    () => ELITE_STANDARDS.find((e) => e.id === selectedEliteId) ?? ELITE_STANDARDS[0],
    [selectedEliteId]
  );

  const velocityProfile = useMemo(() => {
    if (!result) return [];
    const stride = Math.max(1, Math.floor(result.timeSeries.length / 80));
    return result.timeSeries
      .filter((_, idx) => idx % stride === 0 || idx === result.timeSeries.length - 1)
      .map((f) => ({
        distance: Number(f.distanceM.toFixed(1)),
        velocity: Number(f.velocityMs.toFixed(2)),
        trunk: Number(f.trunkLean.toFixed(1)),
      }));
  }, [result]);

  if (!result) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-10 text-center">
        <Gauge className="w-10 h-10 text-[#38BDF8] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#F8FAFC] mb-1">
          Sin análisis por fases disponible
        </h3>
        <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-5">
          Ejecuta el análisis de un video de sprint o utiliza la simulación de 100m para desglosar
          las 4 fases biomecánicas y comparar con estándares de élite.
        </p>
        <button
          type="button"
          onClick={onRunDemo}
          className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm rounded-lg transition-colors cursor-pointer"
        >
          Ejecutar Demo Sprint 100m
        </button>
      </div>
    );
  }

  const s = result.summaryMetrics;
  const c = result.contactsSummary;

  const eliteComparisons = [
    {
      label: 'Velocidad Máxima',
      athlete: `${s.maxVelocityMs.toFixed(2)} m/s`,
      elite: `${selectedElite.maxVelocityMs.toFixed(2)} m/s`,
      pct: Math.min(100, Math.round((s.maxVelocityMs / selectedElite.maxVelocityMs) * 100)),
    },
    {
      label: 'Tiempo de Reacción',
      athlete: `${result.reactionTimeMs} ms`,
      elite: `${selectedElite.reactionTimeMs} ms`,
      pct: Math.min(100, Math.round((selectedElite.reactionTimeMs / Math.max(100, result.reactionTimeMs)) * 100)),
    },
    {
      label: 'Frecuencia de Pasos',
      athlete: `${s.stepFrequencyHz.toFixed(2)} Hz`,
      elite: `${selectedElite.stepFrequencyHz.toFixed(2)} Hz`,
      pct: Math.min(100, Math.round((s.stepFrequencyHz / selectedElite.stepFrequencyHz) * 100)),
    },
    {
      label: 'Longitud de Zancada',
      athlete: `${s.stepLengthM.toFixed(2)} m`,
      elite: `${selectedElite.stepLengthM.toFixed(2)} m`,
      pct: Math.min(100, Math.round((s.stepLengthM / selectedElite.stepLengthM) * 100)),
    },
    {
      label: 'Tiempo de Contacto',
      athlete: `${c.averageGroundTimeMs} ms`,
      elite: `${selectedElite.groundContactMs} ms`,
      pct: Math.min(100, Math.round((selectedElite.groundContactMs / Math.max(70, c.averageGroundTimeMs)) * 100)),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Sprint Phases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {result.phases.map((phase) => {
          const statusStyle =
            phase.status === 'Óptimo'
              ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
              : phase.status === 'Aceptable'
              ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
              : 'text-red-400 bg-red-500/15 border-red-500/30';

          return (
            <div
              key={phase.id}
              className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#38BDF8]">
                      {phase.rangeLabel}
                    </p>
                    <h4 className="text-base font-bold text-[#F8FAFC]">{phase.name}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded border ${statusStyle}`}
                  >
                    {phase.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 my-3 text-xs">
                  <div className="bg-[#0F172A] rounded-lg p-2.5 border border-[#334155]/70">
                    <span className="block text-[#94A3B8]">Vel. Pico</span>
                    <span className="text-sm font-black text-[#F8FAFC] tabular-nums">
                      {phase.peakVelocity.toFixed(2)} m/s
                    </span>
                  </div>
                  <div className="bg-[#0F172A] rounded-lg p-2.5 border border-[#334155]/70">
                    <span className="block text-[#94A3B8]">Tronco Prom.</span>
                    <span className="text-sm font-black text-[#F8FAFC] tabular-nums">
                      {phase.avgTrunkLean.toFixed(1)}°
                    </span>
                  </div>
                  <div className="bg-[#0F172A] rounded-lg p-2.5 border border-[#334155]/70">
                    <span className="block text-[#94A3B8]">Frecuencia</span>
                    <span className="text-sm font-black text-[#F8FAFC] tabular-nums">
                      {phase.stepFrequency.toFixed(2)} Hz
                    </span>
                  </div>
                  <div className="bg-[#0F172A] rounded-lg p-2.5 border border-[#334155]/70">
                    <span className="block text-[#94A3B8]">Score Fase</span>
                    <span className="text-sm font-black text-[#38BDF8] tabular-nums">
                      {phase.score}/100
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#CBD5E1] leading-relaxed border-t border-[#334155] pt-2.5">
                {phase.feedback}
              </p>
            </div>
          );
        })}
      </div>

      {/* Velocity Profile Chart */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Curva de Velocidad y Caída por Fatiga (m/s vs Distancia)
            </h3>
          </div>
          <span className="text-xs text-[#94A3B8]">
            Caída final de velocidad:{' '}
            <strong className={s.fatigueDropPct > 5 ? 'text-amber-400' : 'text-emerald-400'}>
              {s.fatigueDropPct.toFixed(1)}%
            </strong>
          </span>
        </div>

        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={velocityProfile} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="distance"
                stroke="#94A3B8"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                unit="m"
              />
              <YAxis
                stroke="#94A3B8"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                domain={[0, 13]}
                unit=" m/s"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="velocity"
                name="Velocidad (m/s)"
                stroke="#38BDF8"
                strokeWidth={2.5}
                fill="url(#velGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Elite Comparison Section */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Comparativa con Estándares de Élite (v2.1)
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Referencia actual: {selectedElite.athlete} ({selectedElite.record100m})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ELITE_STANDARDS.map((elite) => (
              <button
                key={elite.id}
                type="button"
                onClick={() => setSelectedEliteId(elite.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedElite.id === elite.id
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#0F172A] text-[#94A3B8] hover:text-white border border-[#334155]'
                }`}
              >
                {elite.athlete}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {eliteComparisons.map((item) => (
            <div
              key={item.label}
              className="bg-[#0F172A] border border-[#334155] rounded-lg p-3.5"
            >
              <div className="text-[11px] font-bold uppercase text-[#94A3B8] mb-2">
                {item.label}
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-lg font-black text-[#F8FAFC] tabular-nums">
                  {item.athlete}
                </span>
                <span className="text-xs font-bold text-[#38BDF8] tabular-nums">{item.pct}%</span>
              </div>
              <div className="text-[11px] text-[#64748B] mb-2.5">Élite: {item.elite}</div>
              <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.pct >= 90
                      ? 'bg-emerald-400'
                      : item.pct >= 78
                      ? 'bg-sky-400'
                      : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.max(8, item.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
