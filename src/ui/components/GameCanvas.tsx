import { useRef, useEffect } from 'react'
import type { Landmark, PoseShape } from '@/types'
import { POSE_LANDMARKS } from '@/types'
import './GameCanvas.css'

interface GameCanvasProps {
  playerLandmarks: Landmark[] | null
  targetShape: PoseShape | null
  wallProgress: number
  isPlaying: boolean
  matchScore: number
}

export function GameCanvas({
  playerLandmarks,
  targetShape,
  wallProgress,
  isPlaying,
  matchScore,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    updateSize()
    window.addEventListener('resize', updateSize)

    // Animation loop
    let animationId: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      // Laptop webcams sit high and rarely capture full legs. Shift down and
      // shrink to keep targets realistic for seated/standing laptop users.
      const centerY = canvas.height * 0.64
      const scale = Math.min(canvas.width, canvas.height) * 0.7

      // AR-style target outline over live video
      if (isPlaying && targetShape) {
        drawTargetOutline(ctx, targetShape, wallProgress, scale, centerX, centerY)
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', updateSize)
      cancelAnimationFrame(animationId)
    }
  }, [playerLandmarks, targetShape, wallProgress, isPlaying, matchScore])

  return <canvas ref={canvasRef} className="game-canvas" />
}

function drawTargetOutline(
  ctx: CanvasRenderingContext2D,
  targetShape: PoseShape,
  progress: number,
  scale: number,
  centerX: number,
  centerY: number
) {
  // Outline grows slightly as the wall approaches
  const outlineScale = 0.75 + progress * 0.35
  const strokeWidth = 6 + progress * 6

  ctx.save()
  ctx.lineWidth = strokeWidth
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.9)'
  ctx.shadowColor = '#00f5ff'
  ctx.shadowBlur = 25 + progress * 40
  ctx.globalAlpha = 0.95
  ctx.setLineDash([18, 10])
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  drawGingerbreadOutline(ctx, targetShape.landmarks, scale * outlineScale, centerX, centerY, scale * 0.045)
  ctx.restore()
}

// Draw a rounded gingerbread outline (arms/legs/head) as one composed path
function drawGingerbreadOutline(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  scale: number,
  centerX: number,
  centerY: number,
  baseThickness: number
) {
  // Compress vertical space so targets are framed as half/three-quarter body.
  // This keeps the outline inside a typical laptop webcam view (less floor, more torso).
  const verticalCompression = 0.72
  const verticalOffset = 0.12

  const getPos = (idx: number) => {
    const lm = landmarks[idx]
    if (!lm) return null
    return {
      x: centerX + (0.5 - lm.x) * scale,
      y: centerY + ((lm.y - 0.5) * verticalCompression + verticalOffset) * scale,
    }
  }

  const nose = getPos(POSE_LANDMARKS.NOSE)
  const leftShoulder = getPos(POSE_LANDMARKS.LEFT_SHOULDER)
  const rightShoulder = getPos(POSE_LANDMARKS.RIGHT_SHOULDER)
  const leftWrist = getPos(POSE_LANDMARKS.LEFT_WRIST)
  const rightWrist = getPos(POSE_LANDMARKS.RIGHT_WRIST)
  const leftHip = getPos(POSE_LANDMARKS.LEFT_HIP)
  const rightHip = getPos(POSE_LANDMARKS.RIGHT_HIP)
  const leftAnkle = getPos(POSE_LANDMARKS.LEFT_ANKLE)
  const rightAnkle = getPos(POSE_LANDMARKS.RIGHT_ANKLE)

  if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) return

  const headRadius = scale * 0.08 + baseThickness * 0.6
  const armRadius = scale * 0.045 + baseThickness * 0.5
  const legRadius = scale * 0.05 + baseThickness * 0.5
  const torsoRadius = scale * 0.09 + baseThickness * 0.7

  const torsoTop = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  }
  const torsoBottom = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  }

  ctx.beginPath()

  // Head
  ctx.moveTo(nose.x + headRadius, nose.y - headRadius * 0.35)
  ctx.arc(nose.x, nose.y - headRadius * 0.35, headRadius, 0, Math.PI * 2)

  // Torso
  addCapsulePath(ctx, torsoTop, torsoBottom, torsoRadius)

  // Arms
  if (leftWrist) addCapsulePath(ctx, leftShoulder, leftWrist, armRadius)
  if (rightWrist) addCapsulePath(ctx, rightShoulder, rightWrist, armRadius)

  // Legs
  if (leftAnkle) addCapsulePath(ctx, leftHip, leftAnkle, legRadius)
  if (rightAnkle) addCapsulePath(ctx, rightHip, rightAnkle, legRadius)

  ctx.stroke()
}

function addCapsulePath(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
  r: number
) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) {
    ctx.moveTo(a.x + r, a.y)
    ctx.arc(a.x, a.y, r, 0, Math.PI * 2)
    return
  }
  const angle = Math.atan2(dy, dx)

  ctx.moveTo(
    a.x + Math.cos(angle + Math.PI / 2) * r,
    a.y + Math.sin(angle + Math.PI / 2) * r
  )
  ctx.arc(a.x, a.y, r, angle + Math.PI / 2, angle - Math.PI / 2)
  ctx.lineTo(
    b.x + Math.cos(angle - Math.PI / 2) * r,
    b.y + Math.sin(angle - Math.PI / 2) * r
  )
  ctx.arc(b.x, b.y, r, angle - Math.PI / 2, angle + Math.PI / 2)
  ctx.lineTo(
    a.x + Math.cos(angle + Math.PI / 2) * r,
    a.y + Math.sin(angle + Math.PI / 2) * r
  )
}
