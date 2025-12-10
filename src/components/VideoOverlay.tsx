import { useEffect, useRef, type RefObject } from 'react'
import type {
  FitResult,
  NormalizedKeypoint,
  ShapeConfig,
  Vec2,
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

    drawShape(ctx, shape, width, height, gameState)
    drawKeypoints(ctx, keypoints, width, height)
  }, [shape, countdown, gameState, fitResult, keypoints, videoRef])

  return (
    <div className="viewer">
      <video ref={videoRef} className="video" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="overlay" />
      
      {gameState === 'countdown' && (
        <div className="countdown-badge">
          <span className="clock-icon" aria-hidden />
          <span className="value">{countdown}s</span>
        </div>
      )}
      
      {gameState === 'feedback' && fitResult && (
        <div className={`feedback-badge ${fitResult.pass ? 'success' : 'fail'}`}>
          {fitResult.pass ? 'Perfect!' : 'Try Again'}
        </div>
      )}
    </div>
  )
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeConfig,
  width: number,
  height: number,
  gameState: GameState,
) {
  // Hide outline during feedback to let the badge take focus
  if (gameState === 'feedback') return
  
  ctx.save()
  ctx.beginPath()
  
  // Neon blue/cyan outline during countdown
  const glowColor = 'rgba(5, 217, 232, 0.6)'
  const strokeColor = 'rgba(5, 217, 232, 0.95)'
  
  ctx.shadowColor = glowColor
  ctx.shadowBlur = 40
  ctx.lineWidth = 4
  ctx.strokeStyle = strokeColor

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
  } else if (shape.kind === 'polygon') {
    drawPolygon(ctx, shape.points, width, height)
  } else if (shape.kind === 'curve') {
    drawCurveBand(ctx, shape.points, width, height, shape.thickness, strokeColor, glowColor)
  }

  ctx.stroke()
  
  // Draw second stroke for extra glow effect
  ctx.shadowBlur = 80
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.5
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
  
  keypoints.forEach((kp) => {
    const score = kp.score ?? 0
    if (score < 0.3) return
    
    const x = kp.x * width
    const y = kp.y * height
    
    // Outer glow
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(173, 216, 255, 0.3)'
    ctx.fill()
    
    // Inner dot
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(173, 216, 255, 0.9)'
    ctx.shadowColor = 'rgba(173, 216, 255, 0.8)'
    ctx.shadowBlur = 10
    ctx.fill()
  })
  
  ctx.restore()
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: Vec2[],
  width: number,
  height: number,
) {
  if (points.length < 3) return
  const scaled = points.map((p) => ({ x: p.x * width, y: p.y * height }))
  const floorNorm = 0.95
  ctx.beginPath()
  ctx.moveTo(scaled[0].x, scaled[0].y)
  for (let i = 1; i < scaled.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const skipBottom = prev.y >= floorNorm && curr.y >= floorNorm
    if (skipBottom) {
      ctx.moveTo(scaled[i].x, scaled[i].y)
    } else {
      ctx.lineTo(scaled[i].x, scaled[i].y)
    }
  }
  const last = points[points.length - 1]
  const first = points[0]
  const skipClose = last.y >= floorNorm && first.y >= floorNorm
  if (!skipClose) {
    ctx.lineTo(scaled[0].x, scaled[0].y)
  }
}

function drawCurveBand(
  ctx: CanvasRenderingContext2D,
  points: Vec2[],
  width: number,
  height: number,
  thickness: number,
  strokeColor: string,
  glowColor: string,
) {
  if (points.length < 2) return
  const scaled = points.map((p) => ({ x: p.x * width, y: p.y * height }))
  const band = thickness * Math.min(width, height) * 2

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(scaled[0].x, scaled[0].y)
  for (let i = 1; i < scaled.length; i++) {
    const prev = scaled[i - 1]
    const curr = scaled[i]
    const midX = (prev.x + curr.x) / 2
    const midY = (prev.y + curr.y) / 2
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY)
  }

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = band
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = glowColor
  ctx.shadowBlur = 40
  ctx.stroke()
  ctx.restore()
}
