import { FrameMetrics, NormalizedLandmark } from '../types/biomechanics';
import {
  calculateAngle,
  calculateFrameScore,
  calculateTrunkLean,
  evaluateJoints,
  POSE_LANDMARKS,
} from './biomechanics';

export interface DemoSprintProfile {
  id: 'club' | 'elite';
  label: string;
  description: string;
  peakVelocity: number;
  reactionSec: number;
  stepFreq: number;
  asymmetryBias: number;
  fatigueFactor: number;
  durationSec: number;
}

export const DEMO_PROFILES: DemoSprintProfile[] = [
  {
    id: 'elite',
    label: 'Demo Sprint Élite (9.88s)',
    description: 'Perfil de alta velocidad (11.8 m/s), salida explosiva (138 ms) y simetría óptima.',
    peakVelocity: 11.82,
    reactionSec: 0.138,
    stepFreq: 4.78,
    asymmetryBias: 2.2,
    fatigueFactor: 0.032,
    durationSec: 6.4,
  },
  {
    id: 'club',
    label: 'Demo Sprint Club (11.05s)',
    description: 'Perfil de entrenamiento con oportunidades de mejora en reacción, asimetría y fatiga.',
    peakVelocity: 10.18,
    reactionSec: 0.178,
    stepFreq: 4.38,
    asymmetryBias: 11.5,
    fatigueFactor: 0.072,
    durationSec: 7.0,
  },
];

/**
 * Generates an anatomically consistent 33-landmark running pose + frame metrics
 * for a sagittal-plane 100m sprint simulation.
 */
export function generateSimulatedFrame(
  frameIdx: number,
  fps: number,
  profile: DemoSprintProfile
): FrameMetrics {
  const timeSec = frameIdx / fps;
  const activeTime = Math.max(0, timeSec - profile.reactionSec);

  // Realistic mono-exponential sprint velocity curve with late fatigue decay
  const tau = 1.18;
  const rawAccelVel = profile.peakVelocity * (1 - Math.exp(-activeTime / tau));
  const peakTime = 4.2;
  const fatigueDecay =
    activeTime > peakTime
      ? 1 - profile.fatigueFactor * Math.min(1, (activeTime - peakTime) / (profile.durationSec - peakTime))
      : 1;
  const velocityMs = activeTime <= 0 ? 0 : rawAccelVel * fatigueDecay;

  // Approximate distance scaled across 0 -> 100m during the demo clip
  const progress = Math.min(1, timeSec / profile.durationSec);
  const distanceM = Number((Math.pow(progress, 1.18) * 100).toFixed(2));
  const accelerationMs2 =
    activeTime <= 0
      ? 0
      : activeTime < peakTime
      ? (profile.peakVelocity / tau) * Math.exp(-activeTime / tau)
      : -profile.peakVelocity * profile.fatigueFactor * 0.32;

  // Progressive upright trunk lean: 44° at start -> ~10° at max velocity
  const targetTrunkDeg = activeTime <= 0 ? 46 : 10 + 34 * Math.exp(-activeTime / 1.45);
  const trunkRad = (targetTrunkDeg * Math.PI) / 180;

  // Running gait cycle phase
  const strideFreq = profile.stepFreq * (0.72 + 0.28 * Math.min(1, velocityMs / profile.peakVelocity));
  const phase = activeTime * strideFreq * Math.PI; // PI per step (2*PI per full stride)

  // Center of mass moves smoothly across screen frame (camera pans softly)
  const hipX = 0.26 + 0.48 * Math.min(1, progress * 1.05);
  const bounceY = activeTime <= 0 ? 0 : Math.abs(Math.sin(phase)) * 0.022;
  const hipY = (activeTime <= 0 ? 0.66 : 0.54) - bounceY;

  const torsoLen = 0.21;
  const thighLen = 0.165;
  const shinLen = 0.165;
  const upperArmLen = 0.11;
  const forearmLen = 0.105;

  const shoulderX = hipX + Math.sin(trunkRad) * torsoLen;
  const shoulderY = hipY - Math.cos(trunkRad) * torsoLen;
  const headX = shoulderX + Math.sin(trunkRad) * 0.075;
  const headY = shoulderY - Math.cos(trunkRad) * 0.075;

  // Leg swing angles (relative to vertical downward)
  const computeLeg = (legPhase: number, biasDeg: number) => {
    if (activeTime <= 0) {
      // Set position in starting blocks
      const isFront = legPhase === 0;
      const thighAngle = isFront ? 0.95 : 0.55;
      const kneeFlex = isFront ? 1.18 : 0.85;
      const kneeX = hipX + Math.sin(thighAngle) * thighLen;
      const kneeY = hipY + Math.cos(thighAngle) * thighLen;
      const ankleX = kneeX + Math.sin(thighAngle - kneeFlex) * shinLen;
      const ankleY = kneeY + Math.cos(thighAngle - kneeFlex) * shinLen;
      return { kneeX, kneeY, ankleX, ankleY, onGround: true };
    }

    const swingAmp = 0.72 + 0.12 * (velocityMs / profile.peakVelocity);
    const thighAngle = Math.sin(legPhase) * swingAmp + 0.16;
    // High knee recovery when swinging forward, extended at push-off
    const kneeFlexBase =
      0.34 + 0.55 * Math.pow(Math.max(0, Math.sin(legPhase + 0.65)), 1.4) + (biasDeg * Math.PI) / 180;
    const kneeFlex = Math.min(1.55, Math.max(0.18, kneeFlexBase));

    const kneeX = hipX + Math.sin(thighAngle) * thighLen;
    const kneeY = hipY + Math.cos(thighAngle) * thighLen;
    const shinAngle = thighAngle - kneeFlex;
    const ankleX = kneeX + Math.sin(shinAngle) * shinLen;
    const ankleY = Math.min(0.84, kneeY + Math.cos(shinAngle) * shinLen);
    const onGround = ankleY >= 0.805;

    return { kneeX, kneeY, ankleX, ankleY, onGround };
  };

  const rightLeg = computeLeg(phase, 0);
  const leftLeg = computeLeg(phase + Math.PI, profile.asymmetryBias * 0.55);

  const computeArm = (armPhase: number) => {
    const upperAngle = activeTime <= 0 ? 0.35 : Math.sin(armPhase) * 0.85;
    const elbowX = shoulderX + Math.sin(upperAngle) * upperArmLen;
    const elbowY = shoulderY + Math.cos(upperAngle) * upperArmLen;
    const forearmAngle = upperAngle + 1.35;
    const wristX = elbowX + Math.sin(forearmAngle) * forearmLen;
    const wristY = elbowY + Math.cos(forearmAngle) * forearmLen;
    return { elbowX, elbowY, wristX, wristY };
  };

  const rightArm = computeArm(phase + Math.PI);
  const leftArm = computeArm(phase);

  // Build 33 normalized landmarks array
  const landmarks: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({
    x: hipX,
    y: hipY,
    z: 0,
    visibility: 0.96,
  }));

  landmarks[POSE_LANDMARKS.NOSE] = { x: headX, y: headY, z: 0, visibility: 0.98 };
  landmarks[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: shoulderX + 0.008, y: shoulderY, z: -0.05, visibility: 0.98 };
  landmarks[POSE_LANDMARKS.LEFT_SHOULDER] = { x: shoulderX - 0.008, y: shoulderY + 0.004, z: 0.05, visibility: 0.94 };
  landmarks[POSE_LANDMARKS.RIGHT_ELBOW] = { x: rightArm.elbowX, y: rightArm.elbowY, z: -0.06, visibility: 0.96 };
  landmarks[POSE_LANDMARKS.LEFT_ELBOW] = { x: leftArm.elbowX, y: leftArm.elbowY, z: 0.06, visibility: 0.92 };
  landmarks[POSE_LANDMARKS.RIGHT_WRIST] = { x: rightArm.wristX, y: rightArm.wristY, z: -0.06, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.LEFT_WRIST] = { x: leftArm.wristX, y: leftArm.wristY, z: 0.06, visibility: 0.91 };

  landmarks[POSE_LANDMARKS.RIGHT_HIP] = { x: hipX + 0.006, y: hipY, z: -0.04, visibility: 0.98 };
  landmarks[POSE_LANDMARKS.LEFT_HIP] = { x: hipX - 0.006, y: hipY + 0.004, z: 0.04, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.RIGHT_KNEE] = { x: rightLeg.kneeX, y: rightLeg.kneeY, z: -0.04, visibility: 0.98 };
  landmarks[POSE_LANDMARKS.LEFT_KNEE] = { x: leftLeg.kneeX, y: leftLeg.kneeY, z: 0.04, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.RIGHT_ANKLE] = { x: rightLeg.ankleX, y: rightLeg.ankleY, z: -0.04, visibility: 0.97 };
  landmarks[POSE_LANDMARKS.LEFT_ANKLE] = { x: leftLeg.ankleX, y: leftLeg.ankleY, z: 0.04, visibility: 0.94 };

  landmarks[POSE_LANDMARKS.RIGHT_HEEL] = { x: rightLeg.ankleX - 0.015, y: rightLeg.ankleY + 0.012, z: -0.04, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX] = { x: rightLeg.ankleX + 0.028, y: rightLeg.ankleY + 0.014, z: -0.04, visibility: 0.95 };
  landmarks[POSE_LANDMARKS.LEFT_HEEL] = { x: leftLeg.ankleX - 0.015, y: leftLeg.ankleY + 0.012, z: 0.04, visibility: 0.92 };
  landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX] = { x: leftLeg.ankleX + 0.028, y: leftLeg.ankleY + 0.014, z: 0.04, visibility: 0.92 };

  const kneeRight = calculateAngle(
    landmarks[POSE_LANDMARKS.RIGHT_HIP],
    landmarks[POSE_LANDMARKS.RIGHT_KNEE],
    landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  );
  const kneeLeft = calculateAngle(
    landmarks[POSE_LANDMARKS.LEFT_HIP],
    landmarks[POSE_LANDMARKS.LEFT_KNEE],
    landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  );
  const hipRight = calculateAngle(
    landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
    landmarks[POSE_LANDMARKS.RIGHT_HIP],
    landmarks[POSE_LANDMARKS.RIGHT_KNEE]
  );
  const hipLeft = calculateAngle(
    landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
    landmarks[POSE_LANDMARKS.LEFT_HIP],
    landmarks[POSE_LANDMARKS.LEFT_KNEE]
  );
  const trunkLean = calculateTrunkLean(
    landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
    landmarks[POSE_LANDMARKS.RIGHT_HIP]
  );

  const evaluation = evaluateJoints(kneeRight, kneeLeft, hipRight, hipLeft, trunkLean);
  const score = calculateFrameScore(kneeRight, kneeLeft, hipRight, trunkLean);

  return {
    frameIdx,
    timeSec,
    kneeRight,
    kneeLeft,
    hipRight,
    hipLeft,
    trunkLean,
    velocityMs,
    accelerationMs2,
    distanceM,
    confidence: 96.4,
    score,
    evaluation,
    isGroundContact: rightLeg.onGround || leftLeg.onGround,
    contactFoot: rightLeg.onGround ? 'right' : leftLeg.onGround ? 'left' : null,
    landmarks,
  };
}

/**
 * Renders the biomechanics laboratory track backdrop for the built-in Demo Sprint
 */
export function drawTrackBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  metrics: FrameMetrics,
  enhancedClarity: boolean
): void {
  ctx.save();

  // Studio biomechanics lab backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (enhancedClarity) {
    bgGrad.addColorStop(0, '#09111E');
    bgGrad.addColorStop(0.75, '#132138');
    bgGrad.addColorStop(1, '#1E293B');
  } else {
    bgGrad.addColorStop(0, '#0B1120');
    bgGrad.addColorStop(0.75, '#0F172A');
    bgGrad.addColorStop(1, '#182234');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle calibration grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  const gridStep = 48;
  const scrollOffset = (metrics.distanceM * 26) % gridStep;
  for (let gx = -scrollOffset; gx < width; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height * 0.85);
    ctx.stroke();
  }
  for (let gy = 0; gy < height * 0.85; gy += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  // Track surface
  const trackTop = height * 0.835;
  const trackGrad = ctx.createLinearGradient(0, trackTop, 0, height);
  trackGrad.addColorStop(0, '#7C2D12');
  trackGrad.addColorStop(0.25, '#9A3412');
  trackGrad.addColorStop(1, '#431407');
  ctx.fillStyle = trackGrad;
  ctx.fillRect(0, trackTop, width, height - trackTop);

  // Track lane lines
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, trackTop);
  ctx.lineTo(width, trackTop);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, trackTop + (height - trackTop) * 0.5);
  ctx.lineTo(width, trackTop + (height - trackTop) * 0.5);
  ctx.stroke();

  // Scrolling 10m distance markers
  const pixelsPerMeter = 36;
  const runnerAnchorX = width * 0.5;
  const startMeter = Math.max(0, Math.floor(metrics.distanceM - 15));
  const endMeter = Math.min(100, Math.ceil(metrics.distanceM + 18));

  ctx.font = 'bold 11px monospace';
  for (let m = startMeter; m <= endMeter; m++) {
    if (m % 5 !== 0) continue;
    const mx = runnerAnchorX + (m - metrics.distanceM) * pixelsPerMeter;
    if (mx < -20 || mx > width + 20) continue;

    ctx.strokeStyle = m % 10 === 0 ? 'rgba(248, 250, 252, 0.55)' : 'rgba(248, 250, 252, 0.2)';
    ctx.lineWidth = m % 10 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(mx, trackTop);
    ctx.lineTo(mx, trackTop + 16);
    ctx.stroke();

    if (m % 10 === 0) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(`${m}m`, mx - 10, trackTop + 32);
    }
  }

  // Phase badge top-right
  const phaseLabel =
    metrics.distanceM < 10
      ? 'FASE 1: SALIDA (0-10m)'
      : metrics.distanceM < 30
      ? 'FASE 2: ACELERACIÓN (10-30m)'
      : metrics.distanceM < 60
      ? 'FASE 3: VELOCIDAD MÁXIMA (30-60m)'
      : 'FASE 4: MANTENIMIENTO (60-100m)';

  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(width - 266, 14, 252, 34, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(phaseLabel, width - 252, 35);

  ctx.restore();
}
