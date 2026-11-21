import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  FileBarChart2,
  FolderOpen,
  History,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { LiveAngleChart } from './components/LiveAngleChart';
import { MetricCards } from './components/MetricCards';
import { PhaseAnalysisView } from './components/PhaseAnalysisView';
import { ReportView } from './components/ReportView';
import { SessionsView } from './components/SessionsView';
import {
  computeAnalysisResult,
  extractFrameMetricsFromLandmarks,
  POSE_LANDMARKS,
} from './engine/biomechanics';
import {
  drawMetricsHud,
  drawSkeletonOverlay,
  getNextMonotonicTimestampMs,
  getPoseLandmarker,
  resetPoseLandmarker,
} from './engine/poseDetector';
import {
  DEMO_PROFILES,
  DemoSprintProfile,
  drawTrackBackdrop,
  generateSimulatedFrame,
} from './engine/sprintSimulator';
import { AnalysisResult, FrameMetrics, SavedSession } from './types/biomechanics';
import { deleteSession, loadSessions, saveAnalysisSession } from './utils/sessionStorage';

type ActiveTab = 'monitor' | 'phases' | 'sessions' | 'report';
type StatusTone = 'ready' | 'info' | 'running' | 'success' | 'error';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('monitor');

  // Media source state
  const [sourceType, setSourceType] = useState<'none' | 'video' | 'demo'>('none');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [selectedDemo, setSelectedDemo] = useState<DemoSprintProfile>(DEMO_PROFILES[0]);

  // Analysis & live telemetry state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [statusText, setStatusText] = useState('Sistema listo.');
  const [statusTone, setStatusTone] = useState<StatusTone>('ready');
  const [frames, setFrames] = useState<FrameMetrics[]>([]);
  const [currentFrame, setCurrentFrame] = useState<FrameMetrics | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [totalExpectedFrames, setTotalExpectedFrames] = useState(0);
  const [scrubIndex, setScrubIndex] = useState(0);

  // Visual processing options (matching mejorar_claridad_biomecanica & demo_completo.py)
  const [enhancedClarity, setEnhancedClarity] = useState(true);
  const [coloredSkeleton, setColoredSkeleton] = useState(true);

  // Saved sessions (SessionComparator)
  const [sessions, setSessions] = useState<SavedSession[]>(() => loadSessions());

  // Refs for canvas / video loop
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const framesBufferRef = useRef<FrameMetrics[]>([]);

  // Cleanup object URLs & animation loops on unmount
  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const stopActiveLoop = useCallback(() => {
    runningRef.current = false;
    pausedRef.current = false;
    setIsAnalyzing(false);
    setIsPaused(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, []);

  const renderCanvasFrame = useCallback(
    (
      frameMetric: FrameMetrics,
      totalCount: number,
      mode: 'demo' | 'video',
      videoEl?: HTMLVideoElement | null
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (mode === 'demo') {
        drawTrackBackdrop(ctx, w, h, frameMetric, enhancedClarity);
      } else if (videoEl && videoEl.readyState >= 2) {
        ctx.save();
        if (enhancedClarity) {
          // Port of mejorar_claridad_biomecanica (CLAHE + gamma + saturation boost)
          ctx.filter = 'contrast(1.14) saturate(1.18) brightness(1.04)';
        }
        ctx.drawImage(videoEl, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, w, h);
      }

      if (frameMetric.landmarks) {
        drawSkeletonOverlay(ctx, frameMetric.landmarks, w, h, frameMetric, coloredSkeleton);
      }
      drawMetricsHud(ctx, frameMetric, totalCount);
    },
    [enhancedClarity, coloredSkeleton]
  );

  // Handle video file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopActiveLoop();
    if (videoUrl) URL.revokeObjectURL(videoUrl);

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
    setSourceType('video');
    setAnalysisResult(null);
    setFrames([]);
    setCurrentFrame(null);
    setStatusText(`Video: ${file.name}`);
    setStatusTone('info');
    setActiveTab('monitor');
    e.target.value = '';
  };

  // Run built-in 100m Demo Sprint simulation
  const runDemoSprint = useCallback(
    (profile: DemoSprintProfile = selectedDemo) => {
      stopActiveLoop();
      setSelectedDemo(profile);
      setSourceType('demo');
      setVideoName(profile.label);
      setAnalysisResult(null);
      setFrames([]);
      setCurrentFrame(null);
      setActiveTab('monitor');

      const fps = 30;
      const totalFrames = Math.round(profile.durationSec * fps);
      setTotalExpectedFrames(totalFrames);

      framesBufferRef.current = [];
      runningRef.current = true;
      pausedRef.current = false;
      setIsAnalyzing(true);
      setIsPaused(false);
      setStatusText('🔄 Análisis en vivo (Simulación 100m)...');
      setStatusTone('running');

      let frameIdx = 0;
      let lastTick = performance.now();

      const step = (now: number) => {
        if (!runningRef.current) return;
        if (pausedRef.current) {
          lastTick = now;
          rafRef.current = requestAnimationFrame(step);
          return;
        }

        // Advance at ~30 FPS
        if (now - lastTick >= 30) {
          lastTick = now;
          const fm = generateSimulatedFrame(frameIdx, fps, profile);
          framesBufferRef.current.push(fm);

          renderCanvasFrame(fm, totalFrames, 'demo');
          setCurrentFrame(fm);
          setScrubIndex(frameIdx);

          if (frameIdx % 2 === 0 || frameIdx === totalFrames - 1) {
            setFrames([...framesBufferRef.current]);
            setStatusText(`Trackeando... Frame ${frameIdx + 1}/${totalFrames}`);
          }

          frameIdx += 1;
          if (frameIdx >= totalFrames) {
            runningRef.current = false;
            setIsAnalyzing(false);
            const finalFrames = [...framesBufferRef.current];
            setFrames(finalFrames);
            const res = computeAnalysisResult(finalFrames, profile.label, fps, totalFrames, 'demo');
            setAnalysisResult(res);
            setStatusText('✅ ¡Análisis Completado!');
            setStatusTone('success');
            return;
          }
        }

        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [selectedDemo, stopActiveLoop, renderCanvasFrame]
  );

  // Run real MediaPipe Pose Landmarker analysis on uploaded video
  const runVideoAnalysis = useCallback(async () => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoUrl) {
      setStatusText('⚠️ Error: Carga un video primero');
      setStatusTone('error');
      return;
    }

    stopActiveLoop();
    setActiveTab('monitor');
    setAnalysisResult(null);
    setFrames([]);
    setCurrentFrame(null);
    framesBufferRef.current = [];

    setStatusText('🔄 Cargando MediaPipe Pose AI...');
    setStatusTone('running');
    setIsAnalyzing(true);
    runningRef.current = true;

    try {
      const landmarker = await getPoseLandmarker();

      // Ensure metadata loaded
      if (videoEl.readyState < 1) {
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            videoEl.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          };
          const onErr = () => {
            videoEl.removeEventListener('error', onErr);
            reject(new Error('No se pudo abrir el video'));
          };
          videoEl.addEventListener('loadedmetadata', onLoaded);
          videoEl.addEventListener('error', onErr);
        });
      }

      const fps = 30;
      const estimatedTotal = Math.max(1, Math.round((videoEl.duration || 5) * fps));
      setTotalExpectedFrames(estimatedTotal);

      // Ensure video is cleanly rewound to frame 0 before starting playback
      if (videoEl.currentTime > 0.01) {
        await new Promise<void>((resolve) => {
          const timeoutId = window.setTimeout(() => {
            videoEl.removeEventListener('seeked', onSeeked);
            resolve();
          }, 500);
          const onSeeked = () => {
            window.clearTimeout(timeoutId);
            videoEl.removeEventListener('seeked', onSeeked);
            resolve();
          };
          videoEl.addEventListener('seeked', onSeeked);
          videoEl.currentTime = 0;
        });
      }

      if (!runningRef.current) return;

      videoEl.muted = true;
      await videoEl.play();

      let frameIdx = 0;
      let lastVideoTime = -1;
      let prevHipX: number | null = null;
      let prevTimeSec: number | null = null;
      let prevVel = 0;
      let prevDist = 0;

      const processLoop = () => {
        if (!runningRef.current) return;

        if (pausedRef.current) {
          rafRef.current = requestAnimationFrame(processLoop);
          return;
        }

        if (videoEl.ended) {
          runningRef.current = false;
          setIsAnalyzing(false);
          const collected = [...framesBufferRef.current];
          setFrames(collected);
          if (collected.length > 0) {
            const res = computeAnalysisResult(collected, videoName, fps, Math.max(estimatedTotal, collected.length), 'video');
            setAnalysisResult(res);
            setStatusText('✅ ¡Análisis Completado!');
            setStatusTone('success');
          } else {
            setStatusText('⚠️ No se detectaron poses en el video');
            setStatusTone('error');
          }
          return;
        }

        if (
          videoEl.readyState >= 2 &&
          videoEl.videoWidth > 0 &&
          videoEl.videoHeight > 0 &&
          videoEl.currentTime > lastVideoTime
        ) {
          lastVideoTime = videoEl.currentTime;
          let poseLandmarks = null;
          try {
            const tsMs = getNextMonotonicTimestampMs();
            const detection = landmarker.detectForVideo(videoEl, tsMs);
            poseLandmarks = detection.landmarks?.[0] ?? null;
          } catch (detectErr) {
            console.error('MediaPipe detectForVideo error:', detectErr);
            resetPoseLandmarker();
            runningRef.current = false;
            setIsAnalyzing(false);
            if (!videoEl.paused) videoEl.pause();
            const errMsg = detectErr instanceof Error ? detectErr.message : 'Error procesando frame';
            setStatusText(`⚠️ Error de detección: ${errMsg}. Reintenta el análisis.`);
            setStatusTone('error');
            return;
          }

          if (poseLandmarks && poseLandmarks.length >= 33) {
            const fm = extractFrameMetricsFromLandmarks(
              poseLandmarks,
              frameIdx,
              videoEl.currentTime,
              prevHipX,
              prevTimeSec,
              prevVel,
              prevDist
            );
            const rHip = poseLandmarks[POSE_LANDMARKS.RIGHT_HIP];
            const lHip = poseLandmarks[POSE_LANDMARKS.LEFT_HIP];
            prevHipX = (rHip.x + lHip.x) / 2;
            prevTimeSec = videoEl.currentTime;
            prevVel = fm.velocityMs;
            prevDist = fm.distanceM;

            framesBufferRef.current.push(fm);
            renderCanvasFrame(fm, estimatedTotal, 'video', videoEl);
            setCurrentFrame(fm);
            setScrubIndex(framesBufferRef.current.length - 1);

            if (frameIdx % 2 === 0) {
              setFrames([...framesBufferRef.current]);
              setStatusText(`Trackeando... Frame ${frameIdx + 1}/${estimatedTotal}`);
            }
          } else {
            // Draw raw video frame even if pose temporarily undetected
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
              ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            }
            setStatusText(`Sin detección - Frame ${frameIdx + 1}`);
          }

          frameIdx += 1;
        }

        rafRef.current = requestAnimationFrame(processLoop);
      };

      rafRef.current = requestAnimationFrame(processLoop);
    } catch (err) {
      runningRef.current = false;
      setIsAnalyzing(false);
      const message = err instanceof Error ? err.message : 'Error inicializando MediaPipe';
      setStatusText(`⚠️ Error: ${message}`);
      setStatusTone('error');
    }
  }, [videoUrl, videoName, stopActiveLoop, renderCanvasFrame]);

  const handleAnalyzeClick = () => {
    if (sourceType === 'video' && videoUrl) {
      void runVideoAnalysis();
    } else if (sourceType === 'demo') {
      runDemoSprint(selectedDemo);
    } else {
      // If no video loaded yet, offer instant feedback or start demo smoothly
      runDemoSprint(selectedDemo);
    }
  };

  const handleTogglePause = () => {
    if (!isAnalyzing) return;
    const nextPaused = !isPaused;
    pausedRef.current = nextPaused;
    setIsPaused(nextPaused);

    if (sourceType === 'video' && videoRef.current) {
      if (nextPaused) videoRef.current.pause();
      else void videoRef.current.play();
    }
    setStatusText(nextPaused ? '⏸️ Análisis en pausa' : '🔄 Análisis en vivo...');
  };

  const handleScrub = (idx: number) => {
    if (isAnalyzing || frames.length === 0) return;
    const clamped = Math.max(0, Math.min(frames.length - 1, idx));
    setScrubIndex(clamped);
    const targetFrame = frames[clamped];
    setCurrentFrame(targetFrame);

    if (sourceType === 'demo') {
      renderCanvasFrame(targetFrame, frames.length, 'demo');
    } else if (sourceType === 'video' && videoRef.current) {
      const videoEl = videoRef.current;
      videoEl.currentTime = targetFrame.timeSec;
      const onSeeked = () => {
        videoEl.removeEventListener('seeked', onSeeked);
        renderCanvasFrame(targetFrame, frames.length, 'video', videoEl);
      };
      videoEl.addEventListener('seeked', onSeeked);
    }
  };

  const handleSaveSession = (label: string) => {
    if (!analysisResult) return;
    const saved = saveAnalysisSession(analysisResult, label);
    setSessions(loadSessions());
    setStatusText(`💾 Sesión #${saved.id} guardada`);
    setStatusTone('success');
  };

  const handleDeleteSession = (id: number) => {
    setSessions(deleteSession(id));
  };

  const statusColorClass: Record<StatusTone, string> = {
    ready: 'text-emerald-400',
    info: 'text-sky-400',
    running: 'text-amber-400',
    success: 'text-emerald-400',
    error: 'text-red-400',
  };

  // Derive values shown in the 6 dynamic metric cards
  const displayKneeR = analysisResult && !isAnalyzing
    ? currentFrame?.kneeRight ?? analysisResult.summaryMetrics.meanKneeAngleRight
    : currentFrame?.kneeRight ?? null;
  const displayKneeL = analysisResult && !isAnalyzing
    ? currentFrame?.kneeLeft ?? analysisResult.summaryMetrics.meanKneeAngleLeft
    : currentFrame?.kneeLeft ?? null;
  const displayReaction = analysisResult ? analysisResult.reactionTimeMs : null;
  const displayConfidence =
    analysisResult && !isAnalyzing
      ? analysisResult.validityPercentage
      : currentFrame?.confidence ?? null;
  const displayTrunk =
    analysisResult && !isAnalyzing
      ? currentFrame?.trunkLean ?? analysisResult.summaryMetrics.meanTrunkLean
      : currentFrame?.trunkLean ?? null;
  const displayContacts = analysisResult
    ? analysisResult.contactsSummary.totalContacts
    : frames.length > 0
    ? frames.filter((f, idx) => f.isGroundContact && (idx === 0 || !frames[idx - 1].isGroundContact)).length
    : null;

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Hidden video element for MediaPipe processing */}
      <video
        ref={videoRef}
        src={videoUrl ?? undefined}
        playsInline
        muted
        crossOrigin="anonymous"
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* LEFT SIDEBAR — Direct Web Port of ModernSprintDashboard Sidebar */}
      <aside className="w-full lg:w-[300px] shrink-0 bg-[#1E293B] border-b lg:border-b-0 lg:border-r-2 border-[#334155] p-6 lg:py-8 lg:px-6 flex flex-col justify-between gap-6">
        <div className="space-y-6">
          {/* Brand Header */}
          <div>
            <div className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#38BDF8]">
              <Zap className="w-6 h-6 fill-[#38BDF8]" />
              <span>BOLT REBOOT</span>
            </div>
            <p className="text-xs font-medium text-[#64748B] mt-1">
              Sprint Biomechanics Pro v2.1
            </p>
          </div>

          {/* Primary Action Buttons (exact order from run_sprint_analyzer.py) */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-sm py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              CARGAR VIDEO
            </button>

            <button
              type="button"
              onClick={handleAnalyzeClick}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2.5 bg-[#10B981] hover:bg-[#059669] disabled:bg-[#059669]/60 text-white font-bold text-base py-3 px-4 rounded-lg transition-colors cursor-pointer disabled:cursor-wait"
            >
              <Zap className="w-4 h-4" />
              {isAnalyzing ? 'ANALIZANDO...' : 'ANALIZAR'}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`w-full flex items-center justify-center gap-2.5 text-white font-bold text-sm py-3 px-4 rounded-lg transition-colors cursor-pointer ${
                analysisResult
                  ? 'bg-[#3B82F6] hover:bg-[#2563EB]'
                  : 'bg-[#475569] hover:bg-[#64748B]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              REPORTE FINAL
            </button>
          </div>

          {/* Built-in Demo Sprint Selector */}
          <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#38BDF8] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Simulador Demo 100m
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              Prueba el motor cinemático sin subir video o compara dos perfiles biomecánicos:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_PROFILES.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => runDemoSprint(prof)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                    sourceType === 'demo' && selectedDemo.id === prof.id
                      ? 'bg-[#1E293B] border-[#38BDF8] text-[#F8FAFC]'
                      : 'bg-[#1E293B]/50 border-[#334155] text-[#CBD5E1] hover:border-[#64748B]'
                  }`}
                >
                  <div className="font-bold">{prof.label}</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">{prof.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Processing Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-[#334155]">
            <label className="flex items-center justify-between text-xs text-[#CBD5E1] cursor-pointer">
              <span>Mejora Visual (CLAHE/HSV)</span>
              <input
                type="checkbox"
                checked={enhancedClarity}
                onChange={(e) => setEnhancedClarity(e.target.checked)}
                className="accent-[#38BDF8] w-4 h-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between text-xs text-[#CBD5E1] cursor-pointer">
              <span>Esqueleto Coloreado (Feedback)</span>
              <input
                type="checkbox"
                checked={coloredSkeleton}
                onChange={(e) => setColoredSkeleton(e.target.checked)}
                className="accent-[#10B981] w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Status Indicator Footer (bottom of sidebar) */}
        <div className="pt-4 border-t border-[#334155] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Sesiones guardadas</span>
            <span className="font-bold text-[#F8FAFC]">{sessions.length}</span>
          </div>
          <div className={`text-xs font-bold break-words ${statusColorClass[statusTone]}`}>
            {statusText}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-5 lg:p-8 space-y-6 overflow-y-auto">
        {/* Top Header + Navigation Tabs */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-[#F8FAFC]">
              Monitor Cinemático
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {videoName
                ? `Fuente activa: ${videoName}`
                : 'Carga un video lateral de sprint (MP4/MOV/WEBM) o ejecuta el simulador 100m'}
            </p>
          </div>

          <nav className="flex flex-wrap gap-1.5 bg-[#1E293B] p-1 rounded-xl border border-[#334155]">
            {(
              [
                ['monitor', 'Monitor Cinemático', Activity],
                ['phases', 'Análisis por Fases', Layers],
                ['sessions', `Sesiones (${sessions.length})`, History],
                ['report', 'Reporte Final', FileBarChart2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === id
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </header>

        {/* TAB 1: MONITOR CINEMÁTICO (Exact port of run_sprint_analyzer.py main screen) */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            {/* Video / Pose Canvas Viewport */}
            <div className="bg-[#020617] border-2 border-dashed border-[#334155] rounded-2xl overflow-hidden relative">
              <div className="aspect-video w-full max-h-[460px] flex items-center justify-center relative">
                <canvas
                  ref={canvasRef}
                  width={960}
                  height={540}
                  className={`w-full h-full object-contain ${
                    currentFrame || isAnalyzing ? 'block' : 'hidden'
                  }`}
                />

                {!currentFrame && !isAnalyzing && (
                  <div className="p-8 text-center space-y-4">
                    <div className="text-lg lg:text-xl font-bold text-[#64748B]">
                      {sourceType === 'video'
                        ? `🎬 ${videoName}`
                        : 'SISTEMA LISTO: CARGA UN VIDEO O INICIA LA DEMO'}
                    </div>
                    <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                      {sourceType === 'video'
                        ? "Presiona 'ANALIZAR' para iniciar la detección de pose MediaPipe en tiempo real."
                        : 'Soporta videos MP4/WEBM/MOV en vista lateral (plano sagital) con análisis MediaPipe Pose directamente en el navegador.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Seleccionar Video
                      </button>
                      <button
                        type="button"
                        onClick={() => runDemoSprint(selectedDemo)}
                        className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Probar Simulación 100m
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Playback / Frame Scrubber Control Bar */}
              {(isAnalyzing || frames.length > 0) && (
                <div className="bg-[#1E293B] border-t border-[#334155] px-4 py-2.5 flex flex-wrap items-center gap-3">
                  {isAnalyzing ? (
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-white text-xs font-bold rounded-md cursor-pointer"
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      {isPaused ? 'Reanudar' : 'Pausar'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAnalyzeClick}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-white text-xs font-bold rounded-md cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-analizar
                    </button>
                  )}

                  <div className="flex-1 flex items-center gap-3 min-w-[180px]">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, frames.length - 1)}
                      value={Math.min(scrubIndex, Math.max(0, frames.length - 1))}
                      disabled={isAnalyzing || frames.length === 0}
                      onChange={(e) => handleScrub(Number(e.target.value))}
                      className="flex-1 accent-[#38BDF8] cursor-pointer disabled:opacity-50"
                    />
                    <span className="text-xs font-mono text-[#94A3B8] tabular-nums shrink-0">
                      Frame {currentFrame ? currentFrame.frameIdx + 1 : 0} /{' '}
                      {Math.max(totalExpectedFrames, frames.length)}
                    </span>
                  </div>

                  {/* Color Legend */}
                  <div className="hidden xl:flex items-center gap-3 text-[11px] text-[#94A3B8] border-l border-[#334155] pl-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Óptimo
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Mejorar
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Corregir
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 6 Dynamic Metric Cards */}
            <MetricCards
              kneeRight={displayKneeR}
              kneeLeft={displayKneeL}
              reactionTimeMs={displayReaction}
              confidencePct={displayConfidence}
              trunkLean={displayTrunk}
              contacts={displayContacts}
              kneeRightColor={currentFrame?.evaluation.rightKnee}
              kneeLeftColor={currentFrame?.evaluation.leftKnee}
              trunkColor={currentFrame?.evaluation.trunk}
            />

            {/* Live Biomechanical Plot */}
            <LiveAngleChart frames={frames} />
          </div>
        )}

        {/* TAB 2: ANÁLISIS POR FASES & ÉLITE */}
        {activeTab === 'phases' && (
          <PhaseAnalysisView
            result={analysisResult}
            onRunDemo={() => runDemoSprint(selectedDemo)}
          />
        )}

        {/* TAB 3: SESIONES Y COMPARACIÓN */}
        {activeTab === 'sessions' && (
          <SessionsView
            sessions={sessions}
            currentResult={analysisResult}
            onSaveCurrent={handleSaveSession}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {/* TAB 4: REPORTE FINAL & EXPORTACIÓN */}
        {activeTab === 'report' && (
          <ReportView
            result={analysisResult}
            onRunDemo={() => runDemoSprint(selectedDemo)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
