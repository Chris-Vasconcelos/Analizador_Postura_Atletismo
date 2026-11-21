import React from 'react';
import { JointColor } from '../types/biomechanics';

interface MetricCardsProps {
  kneeRight: number | null;
  kneeLeft: number | null;
  reactionTimeMs: number | null;
  confidencePct: number | null;
  trunkLean: number | null;
  contacts: number | null;
  kneeRightColor?: JointColor;
  kneeLeftColor?: JointColor;
  trunkColor?: JointColor;
}

function dotClass(color?: JointColor): string {
  if (color === 'green') return 'bg-emerald-400';
  if (color === 'yellow') return 'bg-amber-400';
  if (color === 'red') return 'bg-red-500';
  return 'bg-slate-600';
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  kneeRight,
  kneeLeft,
  reactionTimeMs,
  confidencePct,
  trunkLean,
  contacts,
  kneeRightColor,
  kneeLeftColor,
  trunkColor,
}) => {
  const cards = [
    {
      title: 'ÁNGULO RODILLA D',
      value: kneeRight !== null ? kneeRight.toFixed(1) : '--',
      unit: '°',
      color: kneeRightColor,
    },
    {
      title: 'ÁNGULO RODILLA I',
      value: kneeLeft !== null ? kneeLeft.toFixed(1) : '--',
      unit: '°',
      color: kneeLeftColor,
    },
    {
      title: 'TIEMPO REACCIÓN',
      value: reactionTimeMs !== null ? Math.round(reactionTimeMs).toString() : '--',
      unit: 'ms',
      color:
        reactionTimeMs === null
          ? undefined
          : reactionTimeMs <= 150
          ? ('green' as JointColor)
          : reactionTimeMs <= 185
          ? ('yellow' as JointColor)
          : ('red' as JointColor),
    },
    {
      title: 'CONFIANZA',
      value: confidencePct !== null ? Math.round(confidencePct).toString() : '--',
      unit: '%',
      color:
        confidencePct === null
          ? undefined
          : confidencePct >= 80
          ? ('green' as JointColor)
          : confidencePct >= 55
          ? ('yellow' as JointColor)
          : ('red' as JointColor),
    },
    {
      title: 'TRONCO',
      value: trunkLean !== null ? trunkLean.toFixed(1) : '--',
      unit: '°',
      color: trunkColor,
    },
    {
      title: 'CONTACTOS',
      value: contacts !== null ? contacts.toString() : '--',
      unit: 'pasos',
      color: contacts !== null && contacts > 0 ? ('green' as JointColor) : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              {card.title}
            </span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass(card.color)}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl lg:text-3xl font-black text-[#F8FAFC] tabular-nums leading-none">
              {card.value}
            </span>
            {card.value !== '--' && (
              <span className="text-xs font-semibold text-[#64748B]">{card.unit}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
