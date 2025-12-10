import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { VideoOverlay } from './components/VideoOverlay'
import { evaluateFit, getDefaultShapes, randomizeShapeHorizontal } from './game/shapeLogic'
import type { FitResult, NormalizedKeypoint, ShapeConfig } from './game/shapeLogic'
import {
  COUNTDOWN_SECONDS,
  FEEDBACK_MS,
  type GameState,
  nextShapeIndex,
} from './game/stateMachine'
import { poseDetector } from './services/poseDetector'

const INITIAL_LIVES = 5
const SCORE_REWARD = 1

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [streamReady, setStreamReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [keypoints, setKeypoints] = useState<NormalizedKeypoint[]>([])
  const shapes = useMemo(() => getDefaultShapes(), [])
  const [shapeIndex, setShapeIndex] = useState(0)
  const [shapeVariant, setShapeVariant] = useState<ShapeConfig>(() =>
    randomizeShapeHorizontal(getDefaultShapes()[0], 0.1),
  )
  const [lives, setLives] = useState(INITIAL_LIVES)
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [fitResult, setFitResult] = useState<FitResult | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const roundRef = useRef(0)
  const evaluatingRef = useRef(false)

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
      if (!evaluatingRef.current) {
        runEvaluation(roundRef.current)
      }
    }
  }, [countdown, gameState])

  useEffect(() => {
    setShapeVariant(randomizeShapeHorizontal(shapes[shapeIndex], 0.1))
  }, [shapeIndex, shapes])

  const runEvaluation = (roundId: number) => {
    if (evaluatingRef.current) return
    evaluatingRef.current = true

    const result = evaluateFit(shapeVariant, keypoints, {
      minScore: 0.25,
      tolerance: 0.04,
    })
    const nextLives = result.pass ? lives : Math.max(0, lives - 1)
    if (result.pass) {
      setScore((prev) => prev + SCORE_REWARD)
    }
    if (nextLives !== lives) {
      setLives(nextLives)
    }
    setFitResult(result)
    setGameState('feedback')

    feedbackTimerRef.current = window.setTimeout(() => {
      evaluatingRef.current = false
      roundRef.current = roundId + 1
      const outOfLives = nextLives <= 0
      if (outOfLives) {
        setGameState('idle')
        return
      }
      setCountdown(COUNTDOWN_SECONDS)
      setShapeIndex((prev) => nextShapeIndex(prev, shapes.length))
      setFitResult(null)
      setGameState('countdown')
    }, FEEDBACK_MS)
  }

  const handleSkip = () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
    evaluatingRef.current = false
    roundRef.current += 1
    setFitResult(null)
    setCountdown(COUNTDOWN_SECONDS)
    setShapeIndex((prev) => nextShapeIndex(prev, shapes.length))
    setGameState('countdown')
  }

  const handleStart = async () => {
    roundRef.current += 1
    evaluatingRef.current = false
    setLives(INITIAL_LIVES)
    setScore(0)
    setCountdown(COUNTDOWN_SECONDS)
    if (videoRef.current && videoRef.current.paused) {
      try {
        await videoRef.current.play()
      } catch {
        // Ignore autoplay failures
      }
    }
    setShapeIndex(0)
    setShapeVariant(randomizeShapeHorizontal(shapes[0], 0.1))
    setFitResult(null)
    setGameState('countdown')
  }

  const getStatusText = () => {
    if (gameState === 'countdown') return 'Get into position!'
    if (gameState === 'feedback') {
      return fitResult?.pass ? 'Nice work!' : 'Almost there!'
    }
    return 'Ready to play'
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="branding">
          <h1>Hole In Wall</h1>
          <p className="subtitle">Fit yourself within the shape before time runs out</p>
        </div>
        <div className="actions">
          <div className="pill">
            <span className="label">Shape</span>
            <span className="value">
              {shapeIndex + 1}/{shapes.length}
            </span>
          </div>
          <button
            className="ghost"
            onClick={handleSkip}
            disabled={!streamReady}
            type="button"
          >
            Skip
          </button>
          <button
            className="primary"
            onClick={handleStart}
            disabled={!streamReady}
          >
            {gameState === 'idle' ? 'Start Game' : 'Restart'}
          </button>
        </div>
      </header>

      <main className="stage">
        <VideoOverlay
          videoRef={videoRef}
          shape={shapeVariant}
          gameState={gameState}
          countdown={countdown}
          fitResult={fitResult}
          keypoints={keypoints}
          lives={lives}
          initialLives={INITIAL_LIVES}
          score={score}
        />
        {gameState === 'idle' && (
          <div className="start-overlay">
            <div className="start-card">
              <p className="eyebrow">Ready?</p>
              <h2>Hole In Wall Game</h2>
              <p className="helper">
                Stand where the camera can see you. When you hit start, match the glowing shapes
                before time runs out.
              </p>
              <div className="start-actions">
                <button
                  className="primary"
                  onClick={handleStart}
                  disabled={!streamReady}
                  type="button"
                >
                  Start Game
                </button>
                <span className="hint">{streamReady ? 'Camera ready' : 'Waiting for camera…'}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="info-row">
          <div className="pill">
            <span className="label">Status</span>
            <span className="value">{getStatusText()}</span>
          </div>
          <div className="pill">
            <span className="label">Accuracy</span>
            <span
              className={`value ${fitResult?.pass ? 'positive' : ''} ${fitResult && !fitResult.pass ? 'negative' : ''}`}
            >
              {fitResult ? `${Math.round(fitResult.insideRatio * 100)}%` : '—'}
            </span>
          </div>
          {cameraError && (
            <span className="error">Camera error: {cameraError}</span>
          )}
        </div>
        <p className="helper">
          Position yourself so all body points fit inside the glowing outline
        </p>
      </footer>
    </div>
  )
}

export default App
