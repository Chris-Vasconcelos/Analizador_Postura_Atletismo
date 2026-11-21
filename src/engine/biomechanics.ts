import {
  AnalysisResult,
  ColorDistribution,
  ContactsSummary,
  EliteStandard,
  FrameEvaluation,
  FrameMetrics,
  GlobalScores,
  JointColor,
  NormalizedLandmark,
  PhaseAnalysis,
  Recommendation,
  SummaryMetrics,
} from '../types/biomechanics';

// MediaPipe Pose Landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export const ELITE_STANDARDS: EliteStandard[] = [
  {
    id: 'bolt',
    athlete: 'Usain Bolt',
    category: 'Masculino',
    record100m: '9.58s (WR)',
    reactionTimeMs: 146,
    maxVelocityMs: 12.27,
    stepFrequencyHz: 4.49,
    stepLengthM: 2.44,
    trunkAccelDeg: 38,
    trunkMaxVDeg: 9,
    groundContactMs: 86,
  },
  {
    id: 'coleman',
    athlete: 'Christian Coleman',
    category: 'Masculino',
    record100m: '9.76s',
    reactionTimeMs: 128,
    maxVelocityMs: 11.85,
    stepFrequencyHz: 4.95,
    stepLengthM: 2.31,
    trunkAccelDeg: 42,
    trunkMaxVDeg: 11,
    groundContactMs: 89,
  },
  {
    id: 'flojo',
    athlete: 'Florence Griffith-Joyner',
    category: 'Femenino',
    record100m: '10.49s (WR)',
    reactionTimeMs: 140,
    maxVelocityMs: 10.95,
    stepFrequencyHz: 4.78,
    stepLengthM: 2.25,
    trunkAccelDeg: 36,
    trunkMaxVDeg: 10,
    groundContactMs: 94,
  },
  {
    id: 'fraser-pryce',
    athlete: 'Shelly-Ann Fraser-Pryce',
    category: 'Femenino',
    record100m: '10.60s',
    reactionTimeMs: 132,
    maxVelocityMs: 10.78,
    stepFrequencyHz: 5.02,
    stepLengthM: 2.14,
    trunkAccelDeg: 40,
    trunkMaxVDeg: 11,
    groundContactMs: 92,
  },
];

/**
 * Exact port of AnalysisThread.calculate_angle from run_sprint_analyzer.py
 */
export function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  let ang =
    (Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)) *
    (180 / Math.PI);
  if (ang < 0) ang += 360;
  return ang < 180 ? ang : 360 - ang;
}

/**
 * Trunk lean angle relative to vertical axis (0° = completely upright, positive = forward lean)
 */
export function calculateTrunkLean(
  shoulder: { x: number; y: number },
  hip: { x: number; y: number }
): number {
  const dx = Math.abs(shoulder.x - hip.x);
  const dy = Math.abs(hip.y - shoulder.y);
  if (dy < 1e-5) return 90;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

/**
 * Exact port of ModernSprintDashboard.calculate_score from run_sprint_analyzer.py
 */
export function calculateFrameScore(
  kneeR: number,
  kneeL: number,
  hip: number,
  trunk: number
): number {
  let score = 100;
  if (kneeR > 170 || kneeR < 140) score -= 15;
  if (kneeL > 170 || kneeL < 140) score -= 15;
  if (hip > 160) score -= 10;
  if (Math.abs(trunk) > 30) score -= 10;
  const asymmetry = Math.abs(kneeR - kneeL);
  if (asymmetry > 15) score -= Math.floor(asymmetry);
  return Math.max(0, Math.min(100, Math.floor(score)));
}

/**
 * Joint technique quality evaluation (green / yellow / red) ported from demo_completo.py
 */
export function evaluateJoints(
  kneeR: number,
  kneeL: number,
  hipR: number,
  hipL: number,
  trunk: number
): FrameEvaluation {
  const evalKnee = (angle: number): JointColor => {
    if (angle >= 115 && angle <= 168) return 'green';
    if ((angle >= 85 && angle < 115) || (angle > 168 && angle <= 176)) return 'yellow';
    return 'red';
  };

  const evalHip = (angle: number): JointColor => {
    if (angle >= 110 && angle <= 165) return 'green';
    if ((angle >= 85 && angle < 110) || (angle > 165 && angle <= 175)) return 'yellow';
    return 'red';
  };

  const evalTrunk = (lean: number): JointColor => {
    if (lean >= 5 && lean <= 35) return 'green';
    if (lean > 35 && lean <= 50) return 'yellow';
    if (lean < 5) return 'yellow';
    return 'red';
  };

  return {
    rightKnee: evalKnee(kneeR),
    leftKnee: evalKnee(kneeL),
    rightHip: evalHip(hipR),
    leftHip: evalHip(hipL),
    trunk: evalTrunk(trunk),
  };
}

export function getFeedbackMessage(evaluation: FrameEvaluation): string {
  const values = Object.values(evaluation);
  const redCount = values.filter((c) => c === 'red').length;
  const yellowCount = values.filter((c) => c === 'yellow').length;

  if (redCount >= 2) return 'Corregir alineación y extensión articular';
  if (evaluation.trunk === 'red') return 'Excesiva inclinación de tronco';
  if (evaluation.rightKnee === 'red' || evaluation.leftKnee === 'red') {
    return 'Revisar ángulo de ataque de rodilla';
  }
  if (yellowCount >= 2) return 'Ajustar simetría y recobro de zancada';
  return 'Técnica biomecánica óptima';
}

export function extractFrameMetricsFromLandmarks(
  landmarks: NormalizedLandmark[],
  frameIdx: number,
  timeSec: number,
  prevHipCenterX: number | null,
  prevTimeSec: number | null,
  prevVelocityMs: number,
  prevDistanceM: number
): FrameMetrics {
  const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const lKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];

  const kneeRight = calculateAngle(rHip, rKnee, rAnkle);
  const kneeLeft = calculateAngle(lHip, lKnee, lAnkle);
  const hipRight = calculateAngle(rShoulder, rHip, rKnee);
  const hipLeft = calculateAngle(lShoulder, lHip, lKnee);

  const midShoulder = {
    x: (rShoulder.x + lShoulder.x) / 2,
    y: (rShoulder.y + lShoulder.y) / 2,
  };
  const midHip = {
    x: (rHip.x + lHip.x) / 2,
    y: (rHip.y + lHip.y) / 2,
  };

  const trunkLean = calculateTrunkLean(midShoulder, midHip);

  const keyVisibilities = [
    rHip.visibility ?? 0.85,
    rKnee.visibility ?? 0.85,
    rAnkle.visibility ?? 0.85,
    lHip.visibility ?? 0.85,
    lKnee.visibility ?? 0.85,
    lAnkle.visibility ?? 0.85,
    rShoulder.visibility ?? 0.85,
    lShoulder.visibility ?? 0.85,
  ];
  const confidence =
    (keyVisibilities.reduce((acc, v) => acc + v, 0) / keyVisibilities.length) * 100;

  // Estimate horizontal velocity using normalized torso scale (~0.52m torso length reference)
  const torsoHeightNorm = Math.max(
    0.08,
    Math.hypot(midShoulder.x - midHip.x, midShoulder.y - midHip.y)
  );
  const metersPerNormUnit = 0.52 / torsoHeightNorm;

  const dt = prevTimeSec !== null ? Math.max(0.008, timeSec - prevTimeSec) : 1 / 30;
  let instantVelocity = prevVelocityMs;

  if (prevHipCenterX !== null) {
    const dxNorm = Math.abs(midHip.x - prevHipCenterX);
    const rawVel = (dxNorm * metersPerNormUnit) / dt;
    // Clamp realistic sprint velocity & smooth with EMA
    const clamped = Math.min(12.8, Math.max(0, rawVel));
    instantVelocity = prevVelocityMs * 0.78 + clamped * 0.22;
  }

  // If video camera pans with the runner (dxNorm stays near zero), derive kinematic speed estimate from cadence & knee swing
  if (instantVelocity < 0.8 && frameIdx > 5) {
    const legSeparation = Math.abs(rAnkle.x - lAnkle.x) * metersPerNormUnit;
    const estimatedFromStride = Math.min(11.4, Math.max(2.5, legSeparation * 5.8 + 3.2));
    instantVelocity = prevVelocityMs * 0.85 + estimatedFromStride * 0.15;
  }

  const accelerationMs2 = Math.max(-4.5, Math.min(9.5, (instantVelocity - prevVelocityMs) / dt));
  const distanceM = prevDistanceM + instantVelocity * dt;

  const evaluation = evaluateJoints(kneeRight, kneeLeft, hipRight, hipLeft, trunkLean);
  const score = calculateFrameScore(kneeRight, kneeLeft, hipRight, trunkLean);

  // Simple foot contact heuristic: ankle near lowest vertical point relative to hip
  const groundThresholdY = Math.max(rAnkle.y, lAnkle.y);
  const rightOnGround = rAnkle.y >= groundThresholdY - 0.012 && rAnkle.y > midHip.y + torsoHeightNorm * 1.15;
  const leftOnGround = lAnkle.y >= groundThresholdY - 0.012 && lAnkle.y > midHip.y + torsoHeightNorm * 1.15;
  const isGroundContact = rightOnGround || leftOnGround;
  const contactFoot = rightOnGround ? 'right' : leftOnGround ? 'left' : null;

  return {
    frameIdx,
    timeSec,
    kneeRight,
    kneeLeft,
    hipRight,
    hipLeft,
    trunkLean,
    velocityMs: instantVelocity,
    accelerationMs2,
    distanceM,
    confidence,
    score,
    evaluation,
    isGroundContact,
    contactFoot,
    landmarks,
  };
}

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function computeAnalysisResult(
  frames: FrameMetrics[],
  videoName: string,
  fps: number,
  totalFrames: number,
  sourceType: 'video' | 'demo'
): AnalysisResult {
  const validFrames = frames.filter((f) => f.confidence >= 40);
  const activeFrames = validFrames.length > 0 ? validFrames : frames;
  const durationSeconds =
    frames.length > 1 ? frames[frames.length - 1].timeSec - frames[0].timeSec : frames.length / Math.max(1, fps);

  const meanKneeAngleRight = mean(activeFrames.map((f) => f.kneeRight));
  const meanKneeAngleLeft = mean(activeFrames.map((f) => f.kneeLeft));
  const meanHipAngleRight = mean(activeFrames.map((f) => f.hipRight));
  const meanHipAngleLeft = mean(activeFrames.map((f) => f.hipLeft));
  const meanTrunkLean = mean(activeFrames.map((f) => f.trunkLean));
  const kneeAsymmetry = Math.abs(meanKneeAngleRight - meanKneeAngleLeft);
  const hipAsymmetry = Math.abs(meanHipAngleRight - meanHipAngleLeft);

  const velocities = activeFrames.map((f) => f.velocityMs);
  const maxVelocityMs = velocities.length ? Math.max(...velocities) : 0;
  const avgVelocityMs = mean(velocities);
  const peakAccelerationMs2 = activeFrames.length
    ? Math.max(...activeFrames.map((f) => f.accelerationMs2))
    : 0;

  // Detect distinct ground contact steps (rising edges with refractory window)
  let totalContacts = 0;
  let lastContactTime = -1;
  const contactDurationsMs: number[] = [];
  const flightDurationsMs: number[] = [];
  let inContact = false;
  let segmentStartTime = activeFrames[0]?.timeSec ?? 0;

  for (let i = 0; i < activeFrames.length; i++) {
    const f = activeFrames[i];
    if (f.isGroundContact && !inContact) {
      if (f.timeSec - lastContactTime >= 0.16) {
        totalContacts += 1;
        lastContactTime = f.timeSec;
        if (i > 0) {
          const flightMs = (f.timeSec - segmentStartTime) * 1000;
          if (flightMs >= 45 && flightMs <= 260) flightDurationsMs.push(flightMs);
        }
        inContact = true;
        segmentStartTime = f.timeSec;
      }
    } else if (!f.isGroundContact && inContact) {
      const groundMs = (f.timeSec - segmentStartTime) * 1000;
      if (groundMs >= 55 && groundMs <= 240) contactDurationsMs.push(groundMs);
      inContact = false;
      segmentStartTime = f.timeSec;
    }
  }

  // Fallback sensible contacts estimate if short clip
  if (totalContacts === 0 && durationSeconds > 0.5) {
    totalContacts = Math.max(2, Math.round(durationSeconds * 4.3));
  }

  const averageGroundTimeMs =
    contactDurationsMs.length > 0 ? mean(contactDurationsMs) : Math.max(85, Math.min(135, 118 - (maxVelocityMs - 9) * 8));
  const averageFlightTimeMs =
    flightDurationsMs.length > 0 ? mean(flightDurationsMs) : Math.max(105, Math.min(155, 115 + (maxVelocityMs - 9) * 6));

  const stepFrequencyHz =
    durationSeconds > 0.4
      ? Math.min(5.3, Math.max(3.6, totalContacts / durationSeconds))
      : 4.5;
  const stepLengthM = stepFrequencyHz > 0 ? Math.min(2.65, Math.max(1.5, maxVelocityMs / stepFrequencyHz)) : 2.1;

  // Reaction time detection: first frame where velocity exceeds 0.65 m/s
  const firstMoveFrame = activeFrames.find((f) => f.velocityMs >= 0.65);
  const rawReactionMs = firstMoveFrame ? firstMoveFrame.timeSec * 1000 : 155;
  const reactionTimeMs = Math.round(Math.max(115, Math.min(260, rawReactionMs > 400 ? 148 : rawReactionMs)));
  const blockClearanceTimeMs = Math.round(reactionTimeMs + Math.max(210, Math.min(340, 310 - peakAccelerationMs2 * 10)));

  // Fatigue drop: compare velocity in last 20% vs peak velocity
  const tailStart = Math.floor(activeFrames.length * 0.8);
  const tailAvgVel = mean(activeFrames.slice(tailStart).map((f) => f.velocityMs));
  const fatigueDropPct =
    maxVelocityMs > 1 ? Math.max(0, Math.min(22, ((maxVelocityMs - tailAvgVel) / maxVelocityMs) * 100)) : 0;

  // Color distribution
  const colorDistribution: ColorDistribution = { green: 0, yellow: 0, red: 0 };
  for (const f of activeFrames) {
    (Object.values(f.evaluation) as JointColor[]).forEach((c) => {
      colorDistribution[c] += 1;
    });
  }

  const totalEvals = colorDistribution.green + colorDistribution.yellow + colorDistribution.red;
  const rawTechniqueScore =
    totalEvals > 0
      ? (colorDistribution.green * 100 + colorDistribution.yellow * 58 + colorDistribution.red * 18) / totalEvals
      : 72;

  const technique = Math.round(Math.max(0, Math.min(100, rawTechniqueScore - kneeAsymmetry * 0.6)));
  const power = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        55 + Math.min(30, peakAccelerationMs2 * 4.5) + Math.max(0, (190 - reactionTimeMs) * 0.25)
      )
    )
  );
  const efficiency = Math.round(
    Math.max(0, Math.min(100, 92 - fatigueDropPct * 2.4 - kneeAsymmetry * 0.8 - Math.abs(meanTrunkLean - 18) * 0.4))
  );

  // README Scoring System: 0-20 Reaction, 0-30 Max Velocity, 0-50 General Technique
  const reactionPoints = Math.round(Math.max(4, Math.min(20, 20 - Math.max(0, reactionTimeMs - 125) * 0.14)));
  const velocityPoints = Math.round(Math.max(6, Math.min(30, ((maxVelocityMs - 6.5) / 5.5) * 30)));
  const techniquePoints = Math.round((technique / 100) * 50);
  const overall = Math.min(100, reactionPoints + velocityPoints + techniquePoints);

  const scores: GlobalScores = {
    technique,
    power,
    efficiency,
    reactionPoints,
    velocityPoints,
    techniquePoints,
    overall,
  };

  // Build 4-Phase Sprint Analysis (0-10m, 10-30m, 30-60m, 60-100m)
  const totalDist = activeFrames.length ? Math.max(10, activeFrames[activeFrames.length - 1].distanceM) : 100;
  const phaseDefs: Array<{
    id: PhaseAnalysis['id'];
    name: string;
    rangeLabel: string;
    startFrac: number;
    endFrac: number;
  }> = [
    { id: 'start', name: 'Fase de Salida', rangeLabel: '0 - 10 m', startFrac: 0.0, endFrac: 0.14 },
    { id: 'acceleration', name: 'Aceleración', rangeLabel: '10 - 30 m', startFrac: 0.14, endFrac: 0.36 },
    { id: 'max_velocity', name: 'Velocidad Máxima', rangeLabel: '30 - 60 m', startFrac: 0.36, endFrac: 0.68 },
    { id: 'maintenance', name: 'Mantenimiento', rangeLabel: '60 - 100 m', startFrac: 0.68, endFrac: 1.0 },
  ];

  const phases: PhaseAnalysis[] = phaseDefs.map((pd) => {
    const startIdx = Math.floor(activeFrames.length * pd.startFrac);
    const endIdx = Math.max(startIdx + 1, Math.floor(activeFrames.length * pd.endFrac));
    const slice = activeFrames.slice(startIdx, endIdx);

    const pAvgVel = mean(slice.map((f) => f.velocityMs));
    const pPeakVel = slice.length ? Math.max(...slice.map((f) => f.velocityMs)) : 0;
    const pAvgAcc = mean(slice.map((f) => f.accelerationMs2));
    const pTrunk = mean(slice.map((f) => f.trunkLean));
    const pKneeR = mean(slice.map((f) => f.kneeRight));
    const pKneeL = mean(slice.map((f) => f.kneeLeft));
    const pDuration =
      slice.length > 1 ? slice[slice.length - 1].timeSec - slice[0].timeSec : durationSeconds * (pd.endFrac - pd.startFrac);

    const pStepFreq = Math.min(5.2, Math.max(3.8, stepFrequencyHz * (pd.id === 'max_velocity' ? 1.04 : pd.id === 'maintenance' ? 0.96 : 0.99)));
    const pStepLen = pStepFreq > 0 ? Math.min(2.6, Math.max(1.2, pAvgVel / pStepFreq)) : 1.9;
    const pFatigue = pd.id === 'maintenance' && maxVelocityMs > 0 ? fatigueDropPct : 0;

    let phaseScore = Math.round(mean(slice.map((f) => f.score)));
    if (pd.id === 'start' && reactionTimeMs <= 150) phaseScore = Math.min(100, phaseScore + 8);
    if (pd.id === 'maintenance' && pFatigue > 6) phaseScore = Math.max(35, phaseScore - Math.round(pFatigue * 1.8));
    phaseScore = Math.max(35, Math.min(99, phaseScore));

    const status: PhaseAnalysis['status'] =
      phaseScore >= 80 ? 'Óptimo' : phaseScore >= 65 ? 'Aceptable' : 'Mejorar';

    let feedback = 'Ejecución sólida y eficiente dentro del rango biomecánico objetivo.';
    if (pd.id === 'start') {
      feedback =
        reactionTimeMs <= 150
          ? `Reacción explosiva (${reactionTimeMs} ms) con buena proyección inicial de tronco (${pTrunk.toFixed(1)}°).`
          : `Tiempo de reacción mejorable (${reactionTimeMs} ms). Trabajar salidas con estímulo auditivo.`;
    } else if (pd.id === 'acceleration') {
      feedback =
        pTrunk >= 18
          ? `Buena transición progresiva del tronco (${pTrunk.toFixed(1)}°) favoreciendo el empuje horizontal.`
          : `Elevación prematura del tronco (${pTrunk.toFixed(1)}°). Mantener ángulo de empuje hasta los 25-30m.`;
    } else if (pd.id === 'max_velocity') {
      feedback =
        pPeakVel >= 10.5
          ? `Excelente velocidad punta (${pPeakVel.toFixed(2)} m/s) y mecánica de zancada cíclica.`
          : `Velocidad pico de ${pPeakVel.toFixed(2)} m/s. Optimizar rigidez de tobillo y recobro de rodilla alta.`;
    } else {
      feedback =
        pFatigue <= 4.5
          ? `Gran resistencia a la velocidad (caída de solo ${pFatigue.toFixed(1)}%).`
          : `Caída de velocidad del ${pFatigue.toFixed(1)}% en el tramo final. Reforzar relajación facial y resistencia láctica.`;
    }

    return {
      id: pd.id,
      name: pd.name,
      rangeLabel: totalDist < 50 ? `${pd.rangeLabel} (norm.)` : pd.rangeLabel,
      durationSec: Number(pDuration.toFixed(2)),
      avgVelocity: Number(pAvgVel.toFixed(2)),
      peakVelocity: Number(pPeakVel.toFixed(2)),
      avgAcceleration: Number(pAvgAcc.toFixed(2)),
      avgTrunkLean: Number(pTrunk.toFixed(1)),
      avgKneeRight: Number(pKneeR.toFixed(1)),
      avgKneeLeft: Number(pKneeL.toFixed(1)),
      stepFrequency: Number(pStepFreq.toFixed(2)),
      stepLength: Number(pStepLen.toFixed(2)),
      fatigueDropPct: Number(pFatigue.toFixed(1)),
      score: phaseScore,
      status,
      feedback,
    };
  });

  // Personalized Recommendations
  const recommendations: Recommendation[] = [];

  if (reactionTimeMs > 150) {
    recommendations.push({
      id: 'rec-reaction',
      area: 'Salida de Tacos',
      priority: 'Alta',
      title: 'Reducir tiempo de reacción (< 150 ms)',
      detail: `Tu tiempo de reacción estimado es de ${reactionTimeMs} ms frente al estándar óptimo (< 150 ms).`,
      drill: 'Series de salidas cortas de 10m con señales auditivas variables y enfoque en el empuje del pie retrasado.',
    });
  }

  if (kneeAsymmetry > 8) {
    recommendations.push({
      id: 'rec-asymmetry',
      area: 'Simetría Bilateral',
      priority: kneeAsymmetry > 14 ? 'Alta' : 'Media',
      title: `Corregir asimetría de rodillas (${kneeAsymmetry.toFixed(1)}°)`,
      detail: `Diferencia media detectada entre Rodilla D (${meanKneeAngleRight.toFixed(1)}°) y Rodilla I (${meanKneeAngleLeft.toFixed(1)}°).`,
      drill: 'Trabajo unilateral: zancadas búlgaras, skipping a una pierna y pliometría monopodal en vallas bajas.',
    });
  }

  if (maxVelocityMs < 10.8) {
    recommendations.push({
      id: 'rec-velocity',
      area: 'Velocidad Máxima',
      priority: 'Media',
      title: 'Incrementar pico de velocidad máxima',
      detail: `Velocidad máxima registrada: ${maxVelocityMs.toFixed(2)} m/s (referencia élite masculina 11.5–12.2 m/s, femenina 10.6–10.9 m/s).`,
      drill: 'Sprints lanzados de 20–30m (flying sprints) con recuperación completa y trineo ligero (10% peso corporal).',
    });
  }

  if (meanTrunkLean > 28 || meanTrunkLean < 7) {
    recommendations.push({
      id: 'rec-trunk',
      area: 'Control Postural',
      priority: 'Media',
      title: 'Optimizar inclinación del tronco',
      detail: `Ángulo medio de tronco de ${meanTrunkLean.toFixed(1)}°. En velocidad máxima se busca verticalidad estable (8°–14°).`,
      drill: 'Wickets (mini-vallas progresivas) y ejercicios de core anti-extensión para fijar la pelvis.',
    });
  }

  if (fatigueDropPct > 4.5) {
    recommendations.push({
      id: 'rec-fatigue',
      area: 'Mantenimiento (60-100m)',
      priority: 'Media',
      title: 'Minimizar pérdida de velocidad por fatiga',
      detail: `Se observó una caída del ${fatigueDropPct.toFixed(1)}% en el segmento final respecto a la velocidad punta.`,
      drill: 'Series de resistencia a la velocidad (3x80m–120m al 95%) manteniendo hombros relajados y frecuencia de brazos.',
    });
  }

  if (recommendations.length < 2) {
    recommendations.push({
      id: 'rec-optimal',
      area: 'Optimización Élite',
      priority: 'Baja',
      title: 'Mantener consistencia biomecánica',
      detail: 'Los indicadores articulares y de frecuencia se encuentran muy equilibrados.',
      drill: 'Continuar con micro-dosis de sprints lanzados a máxima intensidad y monitoreo de simetría semanal.',
    });
  }

  const summaryMetrics: SummaryMetrics = {
    meanKneeAngleRight: Number(meanKneeAngleRight.toFixed(1)),
    meanKneeAngleLeft: Number(meanKneeAngleLeft.toFixed(1)),
    meanHipAngleRight: Number(meanHipAngleRight.toFixed(1)),
    meanHipAngleLeft: Number(meanHipAngleLeft.toFixed(1)),
    meanTrunkLean: Number(meanTrunkLean.toFixed(1)),
    kneeAsymmetry: Number(kneeAsymmetry.toFixed(1)),
    hipAsymmetry: Number(hipAsymmetry.toFixed(1)),
    maxVelocityMs: Number(maxVelocityMs.toFixed(2)),
    avgVelocityMs: Number(avgVelocityMs.toFixed(2)),
    peakAccelerationMs2: Number(peakAccelerationMs2.toFixed(2)),
    stepFrequencyHz: Number(stepFrequencyHz.toFixed(2)),
    stepLengthM: Number(stepLengthM.toFixed(2)),
    fatigueDropPct: Number(fatigueDropPct.toFixed(1)),
  };

  const contactsSummary: ContactsSummary = {
    totalContacts,
    averageFlightTimeMs: Math.round(averageFlightTimeMs),
    averageGroundTimeMs: Math.round(averageGroundTimeMs),
  };

  const validityPercentage =
    totalFrames > 0 ? Math.min(100, Number(((activeFrames.length / Math.max(1, frames.length)) * 100).toFixed(1))) : 0;

  return {
    videoName,
    sourceType,
    fps: Number(fps.toFixed(1)),
    durationSeconds: Number(Math.max(0.1, durationSeconds).toFixed(2)),
    totalFrames: Math.max(totalFrames, frames.length),
    validFrames: activeFrames.length,
    validityPercentage,
    reactionTimeMs,
    blockClearanceTimeMs,
    summaryMetrics,
    contactsSummary,
    scores,
    colorDistribution,
    phases,
    recommendations,
    timeSeries: frames,
    createdAt: new Date().toISOString(),
  };
}
