import { useCallback, useEffect, useRef } from 'react'
import { useGameStore } from '@/state'
import { usePoseData, useVideoRef } from '@/cv'
import { comparePoses } from '@/game'
import { GameCanvas } from './GameCanvas'
import { GameHUD } from './GameHUD'
import { MenuScreen } from './MenuScreen'
import { CountdownScreen } from './CountdownScreen'
import { ResultScreen } from './ResultScreen'
import { GameOverScreen } from './GameOverScreen'
import { PauseOverlay } from './PauseOverlay'
import './GameContainer.css'

export function GameContainer() {
  const { videoRef, startTracking, isStarted } = useVideoRef()
  const { frame, status } = usePoseData()
  const animationRef = useRef<number | undefined>(undefined)
  const roundStartTimeRef = useRef<number>(0)

  const {
    phase,
    currentRound,
    currentShape,
    wallProgress,
    wallSpeed,
    tolerance,
    player,
    startGame,
    startRound,
    updateWallProgress,
    completeRound,
    failRound,
    resetGame,
    pauseGame,
    resumeGame,
    setPhase,
  } = useGameStore()

  // Handle camera permission and start tracking
  const handleStartCamera = useCallback(async () => {
    if (!isStarted) {
      await startTracking()
    }
  }, [isStarted, startTracking])

  // Game loop for wall animation
  useEffect(() => {
    if (phase !== 'playing') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    roundStartTimeRef.current = performance.now()

    const animate = () => {
      const elapsed = performance.now() - roundStartTimeRef.current
      const progress = elapsed / wallSpeed

      updateWallProgress(progress)

      if (progress >= 1) {
        // Wall reached player - check pose match
        if (frame && currentShape) {
          const result = comparePoses(frame.landmarks, currentShape, tolerance)
          if (result.isMatch) {
            completeRound(result.score)
          } else {
            failRound()
          }
        } else {
          failRound()
        }
        return
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [phase, wallSpeed, tolerance, currentShape, frame, updateWallProgress, completeRound, failRound])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'playing') {
          pauseGame()
        } else if (phase === 'paused') {
          resumeGame()
        }
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (phase === 'menu') {
          handleStartCamera().then(() => startGame())
        } else if (phase === 'countdown') {
          // Countdown will auto-start round
        } else if (phase === 'success' || phase === 'fail') {
          setPhase('countdown')
        } else if (phase === 'gameover') {
          resetGame()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, handleStartCamera, startGame, pauseGame, resumeGame, setPhase, resetGame])

  // Get current match score for live feedback
  const liveMatchScore =
    frame && currentShape ? comparePoses(frame.landmarks, currentShape, tolerance).score : 0

  return (
    <div className="game-container">
      {/* Visible video element for camera feed (background layer) */}
      <video
        ref={videoRef}
        className="camera-video"
        playsInline
        muted
        autoPlay
      />

      {/* Main game canvas */}
      <GameCanvas
        playerLandmarks={frame?.landmarks ?? null}
        targetShape={currentShape}
        wallProgress={wallProgress}
        isPlaying={phase === 'playing'}
        matchScore={liveMatchScore}
      />

      {/* HUD overlay */}
      {(phase === 'playing' || phase === 'paused') && (
        <GameHUD
          round={currentRound}
          score={player.score}
          lives={player.lives}
          matchScore={liveMatchScore}
          wallProgress={wallProgress}
        />
      )}

      {/* Game screens */}
      {phase === 'menu' && (
        <MenuScreen
          onStart={async () => {
            await handleStartCamera()
            startGame()
          }}
          cameraStatus={status}
          highScore={player.highScore}
        />
      )}

      {phase === 'countdown' && (
        <CountdownScreen
          onComplete={startRound}
          shapeName={null}
        />
      )}

      {(phase === 'success' || phase === 'fail') && (
        <ResultScreen
          success={phase === 'success'}
          score={useGameStore.getState().lastRoundScore}
          matchScore={useGameStore.getState().matchScore}
          onContinue={() => {
            useGameStore.setState({ currentRound: currentRound + 1 })
            setPhase('countdown')
          }}
        />
      )}

      {phase === 'gameover' && (
        <GameOverScreen
          finalScore={player.score}
          highScore={player.highScore}
          roundsCompleted={currentRound - 1}
          onRestart={resetGame}
        />
      )}

      {phase === 'paused' && (
        <PauseOverlay
          onResume={resumeGame}
          onQuit={resetGame}
        />
      )}
    </div>
  )
}

