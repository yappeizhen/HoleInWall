import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { VideoOverlay } from './components/VideoOverlay'
import { evaluateFit, getDefaultShapes } from './game/shapeLogic'
import type { FitResult, NormalizedKeypoint } from './game/shapeLogic'
import {
  COUNTDOWN_SECONDS,
  FEEDBACK_MS,
  type GameState,
  nextShapeIndex,
} from './game/stateMachine'
import { poseDetector } from './services/poseDetector'

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [streamReady, setStreamReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [keypoints, setKeypoints] = useState<NormalizedKeypoint[]>([])
  const shapes = useMemo(() => getDefaultShapes(), [])
  const [shapeIndex, setShapeIndex] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [fitResult, setFitResult] = useState<FitResult | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)

  // Set up webcam stream
  useEffect(() => {
    let active = true
    let stream: MediaStream | null = null

    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (!active) return
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
          setStreamReady(true)
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to access webcam'
        setCameraError(message)
      }
    }

    void initCamera()

    return () => {
      active = false
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  // Pose detection loop
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!streamReady || cancelled) return
      await poseDetector.init()

      const step = async () => {
        if (cancelled) return
        const video = videoRef.current
        if (video && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
          const pts = await poseDetector.estimate(video)
          if (pts && video.videoWidth > 0 && video.videoHeight > 0) {
            const normalized = pts.map<NormalizedKeypoint>((k) => ({
              x: k.x / video.videoWidth,
              y: k.y / video.videoHeight,
              score: k.score ?? 0,
              name: k.name,
            }))
            setKeypoints(normalized)
          }
        }
        requestAnimationFrame(step)
      }

      step()
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [streamReady])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
      }
      poseDetector.dispose()
    }
  }, [])

  // Countdown management
  useEffect(() => {
    if (gameState !== 'countdown') return
    setCountdown(COUNTDOWN_SECONDS)
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [gameState])

  useEffect(() => {
    if (gameState === 'countdown' && countdown === 0) {
      runEvaluation()
    }
  }, [countdown, gameState])

  const runEvaluation = () => {
    const shape = shapes[shapeIndex]
    const result = evaluateFit(shape, keypoints, {
      minScore: 0.25,
      tolerance: 0.04,
    })
    setFitResult(result)
    setGameState('feedback')

    feedbackTimerRef.current = window.setTimeout(() => {
      setShapeIndex((prev) => nextShapeIndex(prev, shapes.length))
      setFitResult(null)
      setGameState('countdown')
    }, FEEDBACK_MS)
  }

  const handleStart = async () => {
    if (videoRef.current && videoRef.current.paused) {
      try {
        await videoRef.current.play()
      } catch {
        // Ignore autoplay failures; user can interact again
      }
    }
    setShapeIndex(0)
    setFitResult(null)
    setGameState('countdown')
  }

  const statusText =
    gameState === 'countdown'
      ? `Hold the shape in ${countdown}s`
      : gameState === 'feedback'
        ? fitResult?.pass
          ? 'Nice fit!'
          : 'Missed it'
        : 'Press start to play'

  return (
    <div className="app">
      <header className="topbar">
      <div>
          <h1>Shapeshift</h1>
          <p className="subtitle">
            Align yourself inside the glowing outline before the timer ends.
          </p>
      </div>
        <div className="actions">
          <button className="primary" onClick={handleStart} disabled={!streamReady}>
            {gameState === 'idle' ? 'Start' : 'Restart'}
        </button>
          <div className="pill">
            <span className="label">Shape</span>
            <span className="value">
              {shapeIndex + 1}/{shapes.length} • {shapes[shapeIndex].name}
            </span>
          </div>
        </div>
      </header>

      <main className="stage">
        <VideoOverlay
          videoRef={videoRef}
          shape={shapes[shapeIndex]}
          gameState={gameState}
          countdown={countdown}
          fitResult={fitResult}
          keypoints={keypoints}
        />
      </main>

      <footer className="footer">
        <div className="info-row">
          <div className="pill">
            <span className="label">Status</span>
            <span className="value">{statusText}</span>
          </div>
          <div className="pill">
            <span className="label">Fit</span>
            <span className={`value ${fitResult?.pass ? 'positive' : ''}`}>
              {fitResult ? `${Math.round(fitResult.insideRatio * 100)}%` : '—'}
            </span>
          </div>
          {cameraError && <span className="error">Camera error: {cameraError}</span>}
        </div>
        <p className="helper">
          Tip: keep upper body in frame; stretch creatively as long as all keypoints
          stay inside the outline.
        </p>
      </footer>
    </div>
  )
}

export default App
