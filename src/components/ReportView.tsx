import React, { useMemo } from 'react';
import { FileJson, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { AnalysisResult } from '../types/biomechanics';
import {
  buildSummaryText,
  exportCsv,
  exportJson,
  exportPdfReport,
  exportSummaryTxt,
} from '../utils/exporters';

interface ReportViewProps {
  result: AnalysisResult | null;
  onRunDemo: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ result, onRunDemo }) => {
  const summaryPreview = useMemo(() => (result ? buildSummaryText(result) : ''), [result]);

  if (!result) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-10 text-center">
        <FileText className="w-10 h-10 text-[#38BDF8] mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#F8FAFC] mb-1">Reporte final aún no generado</h3>
        <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-5">
          Ejecuta primero un análisis completo de video o la simulación 100m para habilitar el
          reporte PDF profesional y la exportación a CSV, JSON y resumen TXT.
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

  const totalColors =
    result.colorDistribution.green +
    result.colorDistribution.yellow +
    result.colorDistribution.red;
  const greenPct = totalColors ? Math.round((result.colorDistribution.green / totalColors) * 100) : 0;
  const yellowPct = totalColors ? Math.round((result.colorDistribution.yellow / totalColors) * 100) : 0;
  const redPct = totalColors ? Math.max(0, 100 - greenPct - yellowPct) : 0;

  return (
    <div className="space-y-6">
      {/* Export Actions Bar */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#F8FAFC]">
            Exportación de Reporte y Datos (v2.1)
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Video analizado: <strong className="text-[#CBD5E1]">{result.videoName}</strong> •{' '}
            {result.validFrames} frames válidos ({result.validityPercentage}%)
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => exportPdfReport(result)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Generar PDF
          </button>
          <button
            type="button"
            onClick={() => exportCsv(result)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => exportJson(result)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#334155] hover:bg-[#475569] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <FileJson className="w-4 h-4" />
            Exportar JSON
          </button>
          <button
            type="button"
            onClick={() => exportSummaryTxt(result)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#0F172A] hover:bg-[#334155] border border-[#334155] text-[#F8FAFC] font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Resumen (.txt)
          </button>
        </div>
      </div>

      {/* Global Scores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] border border-[#38BDF8]/40 rounded-xl p-5">
          <span className="text-xs font-bold uppercase text-[#38BDF8]">Score Total</span>
          <div className="text-4xl font-black text-[#F8FAFC] mt-1 tabular-nums">
            {result.scores.overall}
            <span className="text-base font-semibold text-[#64748B]">/100</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-2">
            Reacción {result.scores.reactionPoints}/20 • Vel. {result.scores.velocityPoints}/30 •
            Técnica {result.scores.techniquePoints}/50
          </p>
        </div>

        {[
          { label: 'Técnica', value: result.scores.technique, color: 'bg-emerald-400' },
          { label: 'Potencia', value: result.scores.power, color: 'bg-sky-400' },
          { label: 'Eficiencia', value: result.scores.efficiency, color: 'bg-amber-400' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold uppercase text-[#94A3B8]">{item.label}</span>
              <div className="text-3xl font-black text-[#F8FAFC] mt-1 tabular-nums">
                {item.value}
                <span className="text-sm font-semibold text-[#64748B]">/100</span>
              </div>
            </div>
            <div className="w-full h-2 bg-[#0F172A] rounded-full overflow-hidden mt-3">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Color Evaluation Distribution + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-[#F8FAFC]">
            Distribución Técnica por Colores
          </h4>

          <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-[#0F172A]">
            <div className="bg-emerald-500 h-full" style={{ width: `${greenPct}%` }} />
            <div className="bg-amber-400 h-full" style={{ width: `${yellowPct}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${redPct}%` }} />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#E2E8F0]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Verde — Técnica correcta
              </span>
              <strong className="tabular-nums text-emerald-400">{greenPct}%</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#E2E8F0]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Amarillo — Requiere mejora
              </span>
              <strong className="tabular-nums text-amber-300">{yellowPct}%</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#E2E8F0]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Rojo — Problema técnico
              </span>
              <strong className="tabular-nums text-red-400">{redPct}%</strong>
            </div>
          </div>

          <div className="border-t border-[#334155] pt-3 text-xs text-[#94A3B8] space-y-1">
            <div>
              Tiempo Contacto Prom.:{' '}
              <strong className="text-[#F8FAFC]">{result.contactsSummary.averageGroundTimeMs} ms</strong>
            </div>
            <div>
              Tiempo Vuelo Prom.:{' '}
              <strong className="text-[#F8FAFC]">{result.contactsSummary.averageFlightTimeMs} ms</strong>
            </div>
            <div>
              Block Clearance:{' '}
              <strong className="text-[#F8FAFC]">{result.blockClearanceTimeMs} ms</strong>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#1E293B] border border-[#334155] rounded-xl p-5">
          <h4 className="text-sm font-bold text-[#F8FAFC] mb-3">
            Recomendaciones Técnicas Personalizadas
          </h4>
          <div className="space-y-3">
            {result.recommendations.map((rec) => {
              const badgeClass =
                rec.priority === 'Alta'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : rec.priority === 'Media'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

              return (
                <div
                  key={rec.id}
                  className="bg-[#0F172A] border border-[#334155] rounded-lg p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-[#38BDF8] uppercase">
                      {rec.area}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badgeClass}`}>
                      Prioridad {rec.priority}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#F8FAFC] mb-1">{rec.title}</div>
                  <p className="text-xs text-[#CBD5E1] mb-1.5">{rec.detail}</p>
                  <p className="text-xs text-emerald-400/90">
                    <strong>Plan sugerido:</strong> {rec.drill}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* resumen.txt preview */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
        <h4 className="text-sm font-bold text-[#F8FAFC] mb-2">
          Vista Previa del Resumen de Sesión (resumen.txt)
        </h4>
        <pre className="bg-[#0F172A] border border-[#334155] rounded-lg p-4 text-xs font-mono text-[#CBD5E1] overflow-x-auto max-h-72 leading-relaxed">
          {summaryPreview}
        </pre>
      </div>
    </div>
  );
};
