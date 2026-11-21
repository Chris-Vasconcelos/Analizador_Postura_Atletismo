export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type JointColor = 'green' | 'yellow' | 'red';

export interface FrameEvaluation {
  rightKnee: JointColor;
  leftKnee: JointColor;
  rightHip: JointColor;
  leftHip: JointColor;
  trunk: JointColor;
}

export interface FrameMetrics {
  frameIdx: number;
  timeSec: number;
  kneeRight: number;
  kneeLeft: number;
  hipRight: number;
  hipLeft: number;
  trunkLean: number;
  velocityMs: number;
  accelerationMs2: number;
  distanceM: number;
  confidence: number;
  score: number;
  evaluation: FrameEvaluation;
  isGroundContact: boolean;
  contactFoot: 'right' | 'left' | null;
  landmarks?: NormalizedLandmark[];
}

export type PhaseId = 'start' | 'acceleration' | 'max_velocity' | 'maintenance';

export interface PhaseAnalysis {
  id: PhaseId;
  name: string;
  rangeLabel: string;
  durationSec: number;
  avgVelocity: number;
  peakVelocity: number;
  avgAcceleration: number;
  avgTrunkLean: number;
  avgKneeRight: number;
  avgKneeLeft: number;
  stepFrequency: number;
  stepLength: number;
  fatigueDropPct: number;
  score: number;
  status: 'Óptimo' | 'Aceptable' | 'Mejorar';
  feedback: string;
}

export interface EliteStandard {
  id: string;
  athlete: string;
  category: 'Masculino' | 'Femenino';
  record100m: string;
  reactionTimeMs: number;
  maxVelocityMs: number;
  stepFrequencyHz: number;
  stepLengthM: number;
  trunkAccelDeg: number;
  trunkMaxVDeg: number;
  groundContactMs: number;
}

export interface SummaryMetrics {
  meanKneeAngleRight: number;
  meanKneeAngleLeft: number;
  meanHipAngleRight: number;
  meanHipAngleLeft: number;
  meanTrunkLean: number;
  kneeAsymmetry: number;
  hipAsymmetry: number;
  maxVelocityMs: number;
  avgVelocityMs: number;
  peakAccelerationMs2: number;
  stepFrequencyHz: number;
  stepLengthM: number;
  fatigueDropPct: number;
}

export interface ContactsSummary {
  totalContacts: number;
  averageFlightTimeMs: number;
  averageGroundTimeMs: number;
}

export interface GlobalScores {
  technique: number;
  power: number;
  efficiency: number;
  reactionPoints: number; // 0-20
  velocityPoints: number; // 0-30
  techniquePoints: number; // 0-50
  overall: number; // 0-100
}

export interface Recommendation {
  id: string;
  area: string;
  priority: 'Alta' | 'Media' | 'Baja';
  title: string;
  detail: string;
  drill: string;
}

export interface ColorDistribution {
  green: number;
  yellow: number;
  red: number;
}

export interface AnalysisResult {
  videoName: string;
  sourceType: 'video' | 'demo';
  fps: number;
  durationSeconds: number;
  totalFrames: number;
  validFrames: number;
  validityPercentage: number;
  reactionTimeMs: number;
  blockClearanceTimeMs: number;
  summaryMetrics: SummaryMetrics;
  contactsSummary: ContactsSummary;
  scores: GlobalScores;
  colorDistribution: ColorDistribution;
  phases: PhaseAnalysis[];
  recommendations: Recommendation[];
  timeSeries: FrameMetrics[];
  createdAt: string;
}

export interface SavedSession {
  id: number;
  label: string;
  createdAt: string;
  videoName: string;
  framesAnalyzed: number;
  techniqueScore: number;
  powerScore: number;
  efficiencyScore: number;
  overallScore: number;
  reactionTimeMs: number;
  maxVelocityMs: number;
  totalContacts: number;
  summaryMetrics: SummaryMetrics;
  colorDistribution: ColorDistribution;
}

export interface SessionComparison {
  sessionA: SavedSession;
  sessionB: SavedSession;
  overallDelta: number;
  techniqueDelta: number;
  velocityDelta: number;
  reactionDelta: number;
  asymmetryDelta: number;
  summaryMessage: string;
}
