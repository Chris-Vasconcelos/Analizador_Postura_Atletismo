import { jsPDF } from 'jspdf';
import { AnalysisResult } from '../types/biomechanics';

function triggerDownload(content: string | Blob, filename: string, mimeType?: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType ?? 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exact format port of save_session_metrics (resumen.txt) from run_sprint_analyzer.py
 */
export function buildSummaryText(result: AnalysisResult): string {
  const s = result.summaryMetrics;
  const c = result.contactsSummary;
  const lines = [
    '==================================================',
    'REPORTE BIOMECÁNICO - BOLT REBOOT',
    '==================================================',
    '',
    `Video: ${result.videoName}`,
    `FPS: ${result.fps.toFixed(1)}`,
    `Duración: ${result.durationSeconds.toFixed(2)}s`,
    `Fecha: ${new Date(result.createdAt).toLocaleString('es-ES')}`,
    '',
    'PUNTUACIONES GLOBALES:',
    '------------------------------',
    `Score Total: ${result.scores.overall}/100`,
    `Técnica: ${result.scores.technique}/100`,
    `Potencia: ${result.scores.power}/100`,
    `Eficiencia: ${result.scores.efficiency}/100`,
    '',
    'MÉTRICAS PRINCIPALES:',
    '------------------------------',
    `Ángulo Rodilla D: ${s.meanKneeAngleRight.toFixed(1)}°`,
    `Ángulo Rodilla I: ${s.meanKneeAngleLeft.toFixed(1)}°`,
    `Ángulo Cadera D: ${s.meanHipAngleRight.toFixed(1)}°`,
    `Ángulo Cadera I: ${s.meanHipAngleLeft.toFixed(1)}°`,
    `Inclinación Tronco: ${s.meanTrunkLean.toFixed(1)}°`,
    `Asimetría Rodillas: ${s.kneeAsymmetry.toFixed(1)}°`,
    `Asimetría Cadera: ${s.hipAsymmetry.toFixed(1)}°`,
    `Velocidad Máxima: ${s.maxVelocityMs.toFixed(2)} m/s`,
    `Frecuencia Pasos: ${s.stepFrequencyHz.toFixed(2)} Hz`,
    `Longitud Zancada: ${s.stepLengthM.toFixed(2)} m`,
    '',
    'TIEMPOS:',
    '------------------------------',
    `Tiempo Reacción: ${result.reactionTimeMs} ms`,
    `Block Clearance: ${result.blockClearanceTimeMs} ms`,
    '',
    'CONTACTOS:',
    '------------------------------',
    `Total Contactos: ${c.totalContacts}`,
    `Tiempo Vuelo Prom: ${c.averageFlightTimeMs} ms`,
    `Tiempo Contacto Prom: ${c.averageGroundTimeMs} ms`,
    '',
    'CONFIANZA:',
    '------------------------------',
    `Calidad: ${result.validityPercentage.toFixed(1)}%`,
    `Frames Válidos: ${result.validFrames}`,
    `Frames Totales: ${result.totalFrames}`,
    '',
    'RECOMENDACIONES TÉCNICAS:',
    '------------------------------',
    ...result.recommendations.map(
      (r, idx) => `${idx + 1}. [${r.priority}] ${r.title}\n   ${r.detail}\n   Ejercicio: ${r.drill}`
    ),
  ];
  return lines.join('\n');
}

export function exportSummaryTxt(result: AnalysisResult): void {
  const txt = buildSummaryText(result);
  triggerDownload(txt, `resumen_bolt_reboot_${Date.now()}.txt`, 'text/plain;charset=utf-8');
}

export function exportCsv(result: AnalysisResult): void {
  const headers = [
    'frame',
    'time_s',
    'distance_m',
    'velocity_ms',
    'acceleration_ms2',
    'knee_right_deg',
    'knee_left_deg',
    'hip_right_deg',
    'hip_left_deg',
    'trunk_lean_deg',
    'confidence_pct',
    'score',
    'ground_contact',
  ];
  const rows = result.timeSeries.map((f) =>
    [
      f.frameIdx,
      f.timeSec.toFixed(3),
      f.distanceM.toFixed(2),
      f.velocityMs.toFixed(2),
      f.accelerationMs2.toFixed(2),
      f.kneeRight.toFixed(1),
      f.kneeLeft.toFixed(1),
      f.hipRight.toFixed(1),
      f.hipLeft.toFixed(1),
      f.trunkLean.toFixed(1),
      f.confidence.toFixed(1),
      f.score,
      f.isGroundContact ? 1 : 0,
    ].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload(csv, `sprint_biomechanics_${Date.now()}.csv`, 'text/csv;charset=utf-8');
}

export function exportJson(result: AnalysisResult): void {
  // Strip raw 33-landmark arrays to keep JSON concise & portable
  const cleanPayload = {
    ...result,
    timeSeries: result.timeSeries.map(({ landmarks: _omit, ...rest }) => rest),
  };
  triggerDownload(
    JSON.stringify(cleanPayload, null, 2),
    `sprint_biomechanics_${Date.now()}.json`,
    'application/json;charset=utf-8'
  );
}

export function exportPdfReport(result: AnalysisResult): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 0;

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 88, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('BOLT REBOOT - SPRINT BIOMECHANICS PRO', 40, 42);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Reporte Biomecánico de 100m  |  Video: ${result.videoName}  |  ${new Date(result.createdAt).toLocaleDateString('es-ES')}`,
    40,
    66
  );

  y = 114;

  // Global Scores Row
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Puntuaciones Globales (0 - 100)', 40, y);
  y += 14;

  const scoreBoxes = [
    { label: 'SCORE TOTAL', value: `${result.scores.overall}/100` },
    { label: 'TÉCNICA', value: `${result.scores.technique}/100` },
    { label: 'POTENCIA', value: `${result.scores.power}/100` },
    { label: 'EFICIENCIA', value: `${result.scores.efficiency}/100` },
  ];

  const boxW = (pageWidth - 80 - 30) / 4;
  scoreBoxes.forEach((box, idx) => {
    const bx = 40 + idx * (boxW + 10);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(bx, y, boxW, 52, 6, 6, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(box.label, bx + 10, y + 18);
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(box.value, bx + 10, y + 40);
  });

  y += 76;

  // Key Metrics Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Métricas Biomecánicas Principales', 40, y);
  y += 18;

  const s = result.summaryMetrics;
  const c = result.contactsSummary;
  const metricsPairs = [
    ['Ángulo Rodilla Derecha', `${s.meanKneeAngleRight.toFixed(1)}°`, 'Tiempo de Reacción', `${result.reactionTimeMs} ms`],
    ['Ángulo Rodilla Izquierda', `${s.meanKneeAngleLeft.toFixed(1)}°`, 'Velocidad Máxima', `${s.maxVelocityMs.toFixed(2)} m/s`],
    ['Ángulo Cadera (D / I)', `${s.meanHipAngleRight.toFixed(1)}° / ${s.meanHipAngleLeft.toFixed(1)}°`, 'Frecuencia de Pasos', `${s.stepFrequencyHz.toFixed(2)} Hz`],
    ['Inclinación de Tronco', `${s.meanTrunkLean.toFixed(1)}°`, 'Longitud de Zancada', `${s.stepLengthM.toFixed(2)} m`],
    ['Asimetría de Rodillas', `${s.kneeAsymmetry.toFixed(1)}°`, 'Contactos Totales', `${c.totalContacts} pasos`],
    ['Confianza de Detección', `${result.validityPercentage.toFixed(1)}%`, 'Contacto / Vuelo Prom.', `${c.averageGroundTimeMs} ms / ${c.averageFlightTimeMs} ms`],
  ];

  doc.setFontSize(9.5);
  metricsPairs.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(40, y - 12, pageWidth - 80, 20, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], 48, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], 195, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row[2], 305, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[3], 445, y);
    y += 22;
  });

  y += 14;

  // Phase Analysis Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Análisis por Fases (0 - 100 m)', 40, y);
  y += 16;

  doc.setFillColor(30, 41, 59);
  doc.rect(40, y - 12, pageWidth - 80, 22, 'F');
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(9);
  doc.text('Fase', 48, y + 2);
  doc.text('Segmento', 165, y + 2);
  doc.text('Vel. Prom', 250, y + 2);
  doc.text('Vel. Pico', 320, y + 2);
  doc.text('Tronco', 390, y + 2);
  doc.text('Score', 460, y + 2);
  doc.text('Estado', 505, y + 2);
  y += 22;

  result.phases.forEach((p, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(40, y - 12, pageWidth - 80, 22, 'F');
    }
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(p.name, 48, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(p.rangeLabel, 165, y + 2);
    doc.text(`${p.avgVelocity.toFixed(2)} m/s`, 250, y + 2);
    doc.text(`${p.peakVelocity.toFixed(2)} m/s`, 320, y + 2);
    doc.text(`${p.avgTrunkLean.toFixed(1)}°`, 390, y + 2);
    doc.text(`${p.score}/100`, 460, y + 2);
    doc.text(p.status, 505, y + 2);
    y += 22;
  });

  y += 18;

  // Recommendations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Recomendaciones Técnicas Personalizadas', 40, y);
  y += 18;

  result.recommendations.slice(0, 4).forEach((rec) => {
    if (y > 760) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(14, 116, 144);
    doc.text(`[${rec.priority}] ${rec.area}: ${rec.title}`, 40, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const detailLines = doc.splitTextToSize(`${rec.detail} Ejercicio: ${rec.drill}`, pageWidth - 80);
    doc.text(detailLines, 48, y);
    y += detailLines.length * 12 + 8;
  });

  doc.save(`reporte_sprint_bolt_reboot_${Date.now()}.pdf`);
}
