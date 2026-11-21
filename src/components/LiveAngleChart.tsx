import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FrameMetrics } from '../types/biomechanics';

interface LiveAngleChartProps {
  frames: FrameMetrics[];
}

type ChartMode = 'knee_r' | 'knees' | 'velocity' | 'posture';

export const LiveAngleChart: React.FC<LiveAngleChartProps> = ({ frames }) => {
  const [mode, setMode] = useState<ChartMode>('knee_r');

  // Downsample gently if very long video (>300 frames) for smooth 60fps chart updates
  const chartData = useMemo(() => {
    const stride = frames.length > 260 ? Math.ceil(frames.length / 260) : 1;
    return frames
      .filter((_, idx) => idx % stride === 0 || idx === frames.length - 1)
      .map((f) => ({
        frame: f.frameIdx,
        kneeRight: Number(f.kneeRight.toFixed(1)),
        kneeLeft: Number(f.kneeLeft.toFixed(1)),
        trunkLean: Number(f.trunkLean.toFixed(1)),
        hipRight: Number(f.hipRight.toFixed(1)),
        velocityMs: Number(f.velocityMs.toFixed(2)),
      }));
  }, [frames]);

  const titleMap: Record<ChartMode, string> = {
    knee_r: 'Ángulo Rodilla D vs Frame',
    knees: 'Simetría Rodilla D vs Rodilla I (°)',
    velocity: 'Perfil de Velocidad (m/s) vs Frame',
    posture: 'Inclinación Tronco y Cadera (°) vs Frame',
  };

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#F8FAFC]">{titleMap[mode]}</h3>
          <p className="text-xs text-[#94A3B8]">
            {frames.length > 0
              ? `${frames.length} frames registrados en tiempo real`
              : 'Esperando datos cinemáticos...'}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['knee_r', 'Rodilla D'],
              ['knees', 'Rodilla D/I'],
              ['velocity', 'Velocidad'],
              ['posture', 'Tronco / Cadera'],
            ] as Array<[ChartMode, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === id
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-[#0F172A] text-[#94A3B8] hover:text-white border border-[#334155]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[220px] w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-[#64748B] border border-dashed border-[#334155] rounded-lg bg-[#0F172A]/60">
            Inicia un análisis para visualizar la curva cinemática en vivo
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="frame"
                stroke="#94A3B8"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                label={{ value: 'Frame', position: 'insideBottomRight', offset: -2, fill: '#64748B', fontSize: 11 }}
              />
              <YAxis
                stroke="#94A3B8"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                domain={mode === 'velocity' ? [0, 13] : [0, 185]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#F8FAFC',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />

              {mode === 'knee_r' && (
                <Line
                  type="monotone"
                  dataKey="kneeRight"
                  name="Rodilla D (°)"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {mode === 'knees' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="kneeRight"
                    name="Rodilla D (°)"
                    stroke="#38BDF8"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="kneeLeft"
                    name="Rodilla I (°)"
                    stroke="#10B981"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}

              {mode === 'velocity' && (
                <Line
                  type="monotone"
                  dataKey="velocityMs"
                  name="Velocidad (m/s)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {mode === 'posture' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="trunkLean"
                    name="Tronco (°)"
                    stroke="#F59E0B"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="hipRight"
                    name="Cadera D (°)"
                    stroke="#A78BFA"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
