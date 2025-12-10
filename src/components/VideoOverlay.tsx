import { useEffect, useRef, type RefObject } from 'react'
import type {
  FitResult,
  NormalizedKeypoint,
  ShapeConfig,
} from '../game/shapeLogic'
import type { GameState } from '../game/stateMachine'

interface VideoOverlayProps {
  videoRef: RefObject<HTMLVideoElement | null>
  shape: ShapeConfig
  gameState: GameState
  countdown: number
  fitResult: FitResult | null
  keypoints: NormalizedKeypoint[]
}

export function VideoOverlay({
  videoRef,
  shape,
  gameState,
  countdown,
  fitResult,
  keypoints,
}: VideoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = video.videoWidth || video.clientWidth || 1280
    const height = video.videoHeight || video.clientHeight || 720
    canvas.width = width
    canvas.height = height

    ctx.clearRect(0, 0, width, height)

    drawShape(ctx, shape, width, height)
    drawKeypoints(ctx, keypoints, width, height)
  }, [shape, countdown, gameState, fitResult, keypoints, videoRef])

  return (
    <div className="viewer">
      <video ref={videoRef} className="video" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="overlay" />
      <div className="countdown-badge">
        <span className="clock-icon" aria-hidden />
        <span className="value">
          {gameState === 'countdown' ? `${countdown}s` : '...'}
        </span>
      </div>
    </div>
  )
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeConfig,
  width: number,
  height: number,
) {
  ctx.save()
  ctx.beginPath()
  ctx.shadowColor = 'rgba(0, 255, 180, 0.65)'
  ctx.shadowBlur = 30
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(0, 255, 200, 0.9)'

  if (shape.kind === 'circle') {
    ctx.arc(
      shape.center.x * width,
      shape.center.y * height,
      shape.radius * Math.min(width, height),
      0,
      Math.PI * 2,
    )
  } else if (shape.kind === 'rect') {
    const w = shape.width * width
    const h = shape.height * height
    const x = shape.center.x * width - w / 2
    const y = shape.center.y * height - h / 2
    const r = Math.min(shape.cornerRadius ?? 0, Math.min(w, h) / 2)
    if (r > 0) {
      roundedRect(ctx, x, y, w, h, r)
    } else {
      ctx.rect(x, y, w, h)
    }
  } else if (shape.kind === 'triangle') {
    const [p0, p1, p2] = shape.points
    ctx.moveTo(p0.x * width, p0.y * height)
    ctx.lineTo(p1.x * width, p1.y * height)
    ctx.lineTo(p2.x * width, p2.y * height)
    ctx.closePath()
  }

  ctx.stroke()
  ctx.restore()
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawKeypoints(
  ctx: CanvasRenderingContext2D,
  keypoints: NormalizedKeypoint[],
  width: number,
  height: number,
) {
  ctx.save()
  ctx.fillStyle = '#8ae2ff'
  keypoints.forEach((kp) => {
    ctx.beginPath()
    ctx.arc(kp.x * width, kp.y * height, 4, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}

