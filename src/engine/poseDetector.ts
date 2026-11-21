import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { FrameMetrics, JointColor, NormalizedLandmark } from '../types/biomechanics';
import { getFeedbackMessage, POSE_LANDMARKS } from './biomechanics';

let landmarkerInstance: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
    );
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
    });
    landmarkerInstance = landmarker;
    return landmarker;
  })().catch(async (gpuErr) => {
    // Fallback to CPU delegate if WebGL/GPU fails
    console.warn('MediaPipe GPU delegate fallback to CPU:', gpuErr);
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
    );
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
    });
    landmarkerInstance = landmarker;
    return landmarker;
  });

  return initPromise;
}

const POSE_CONNECTIONS: Array<[number, number, 'rightLeg' | 'leftLeg' | 'trunk' | 'arms']> = [
  // Trunk
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, 'trunk'],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, 'trunk'],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP, 'trunk'],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP, 'trunk'],
  // Right leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE, 'rightLeg'],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE, 'rightLeg'],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX, 'rightLeg'],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL, 'rightLeg'],
  // Left leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, 'leftLeg'],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE, 'leftLeg'],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX, 'leftLeg'],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL, 'leftLeg'],
  // Arms
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW, 'arms'],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST, 'arms'],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, 'arms'],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST, 'arms'],
];

function jointColorToHex(color: JointColor): string {
  if (color === 'green') return '#22C55E';
  if (color === 'yellow') return '#FACC15';
  return '#EF4444';
}

/**
 * Draws the colored biomechanical skeleton overlay (ported from demo_completo.py & run_sprint_analyzer.py)
 */
export function drawSkeletonOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  metrics: FrameMetrics,
  coloredFeedback: boolean
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [startIdx, endIdx, group] of POSE_CONNECTIONS) {
    const a = landmarks[startIdx];
    const b = landmarks[endIdx];
    if (!a || !b) continue;
    if ((a.visibility ?? 1) < 0.25 || (b.visibility ?? 1) < 0.25) continue;

    let stroke = '#22C55E';
    if (coloredFeedback) {
      if (group === 'rightLeg') stroke = jointColorToHex(metrics.evaluation.rightKnee);
      else if (group === 'leftLeg') stroke = jointColorToHex(metrics.evaluation.leftKnee);
      else if (group === 'trunk') stroke = jointColorToHex(metrics.evaluation.trunk);
      else stroke = '#38BDF8';
    }

    ctx.strokeStyle = stroke;
    ctx.lineWidth = group === 'trunk' ? 4 : 3.5;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  }

  // Draw head circle
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  if (nose && (nose.visibility ?? 1) > 0.2) {
    ctx.strokeStyle = '#38BDF8';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(nose.x * width, nose.y * height, Math.max(8, height * 0.025), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw joint nodes
  const keyJoints: Array<[number, string]> = [
    [POSE_LANDMARKS.RIGHT_SHOULDER, '#38BDF8'],
    [POSE_LANDMARKS.LEFT_SHOULDER, '#38BDF8'],
    [POSE_LANDMARKS.RIGHT_HIP, coloredFeedback ? jointColorToHex(metrics.evaluation.rightHip) : '#22C55E'],
    [POSE_LANDMARKS.LEFT_HIP, coloredFeedback ? jointColorToHex(metrics.evaluation.leftHip) : '#22C55E'],
    [POSE_LANDMARKS.RIGHT_KNEE, coloredFeedback ? jointColorToHex(metrics.evaluation.rightKnee) : '#22C55E'],
    [POSE_LANDMARKS.LEFT_KNEE, coloredFeedback ? jointColorToHex(metrics.evaluation.leftKnee) : '#22C55E'],
    [POSE_LANDMARKS.RIGHT_ANKLE, '#F8FAFC'],
    [POSE_LANDMARKS.LEFT_ANKLE, '#F8FAFC'],
    [POSE_LANDMARKS.RIGHT_ELBOW, '#94A3B8'],
    [POSE_LANDMARKS.LEFT_ELBOW, '#94A3B8'],
    [POSE_LANDMARKS.RIGHT_WRIST, '#E2E8F0'],
    [POSE_LANDMARKS.LEFT_WRIST, '#E2E8F0'],
  ];

  for (const [idx, color] of keyJoints) {
    const pt = landmarks[idx];
    if (!pt || (pt.visibility ?? 1) < 0.25) continue;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pt.x * width, pt.y * height, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Draw angle arcs on Right Knee
  const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  if (rKnee) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    const lx = rKnee.x * width + 10;
    const ly = rKnee.y * height - 10;
    ctx.fillRect(lx - 4, ly - 13, 52, 18);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${metrics.kneeRight.toFixed(0)}°`, lx, ly);
  }

  ctx.restore();
}

/**
 * Draws the HUD metrics overlay box matching draw_metrics_on_frame in run_sprint_analyzer.py
 */
export function drawMetricsHud(
  ctx: CanvasRenderingContext2D,
  metrics: FrameMetrics,
  totalFrames: number
): void {
  ctx.save();
  const x = 14;
  const y = 14;
  const w = 248;
  const h = 166;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(`Frame: ${metrics.frameIdx}${totalFrames > 0 ? ` / ${totalFrames}` : ''}`, x + 14, y + 24);

  ctx.font = '600 12px monospace';
  ctx.fillStyle = jointColorToHex(metrics.evaluation.rightKnee);
  ctx.fillText(`Rodilla D:  ${metrics.kneeRight.toFixed(1)}°`, x + 14, y + 46);

  ctx.fillStyle = jointColorToHex(metrics.evaluation.leftKnee);
  ctx.fillText(`Rodilla I:  ${metrics.kneeLeft.toFixed(1)}°`, x + 14, y + 65);

  ctx.fillStyle = '#38BDF8';
  ctx.fillText(`Cadera D:   ${metrics.hipRight.toFixed(1)}°`, x + 14, y + 84);

  ctx.fillStyle = jointColorToHex(metrics.evaluation.trunk);
  ctx.fillText(`Tronco:     ${metrics.trunkLean.toFixed(1)}°`, x + 14, y + 103);

  ctx.fillStyle = '#CBD5E1';
  ctx.fillText(`Velocidad:  ${metrics.velocityMs.toFixed(2)} m/s`, x + 14, y + 122);

  const scoreColor =
    metrics.score >= 70 ? '#22C55E' : metrics.score >= 50 ? '#F59E0B' : '#EF4444';
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = scoreColor;
  ctx.fillText(`Score: ${metrics.score}/100`, x + 14, y + 148);

  // Compact bottom feedback bar
  const feedback = getFeedbackMessage(metrics.evaluation);
  const canvasH = ctx.canvas.height;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.beginPath();
  ctx.roundRect(14, canvasH - 40, Math.min(ctx.canvas.width - 28, 390), 28, 6);
  ctx.fill();
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#38BDF8';
  ctx.fillText(`Feedback: ${feedback}`, 24, canvasH - 22);

  ctx.restore();
}
