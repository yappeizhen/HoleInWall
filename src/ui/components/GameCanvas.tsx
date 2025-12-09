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
      // Laptop webcams sit high; focus on upper/three-quarter body targets.
      const centerY = canvas.height * 0.6
      const scale = Math.min(canvas.width, canvas.height) * 0.95

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
  // Build a forgiving bounding capsule instead of precise keypoint outline.
  const paddedBounds = getPaddedBounds(targetShape.landmarks, 0.2)
  const outlineScale = 0.85 + progress * 0.4
  const strokeWidth = 6 + progress * 6

  const width = paddedBounds.width * scale * outlineScale
  const height = paddedBounds.height * scale * outlineScale

  // Transform center to screen space
  const boxCenter = {
    x: centerX + (0.5 - paddedBounds.centerX) * scale,
    y: centerY + (paddedBounds.centerY - 0.5) * scale,
  }

  ctx.save()
  ctx.lineWidth = strokeWidth
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.9)'
  ctx.shadowColor = '#00f5ff'
  ctx.shadowBlur = 25 + progress * 40
  ctx.globalAlpha = 0.9
  ctx.setLineDash([18, 10])
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  drawRoundedBox(ctx, boxCenter.x, boxCenter.y, width, height, Math.min(width, height) * 0.18)
  ctx.restore()
}

function getPaddedBounds(landmarks: Landmark[], padding: number) {
  const usable = landmarks.filter((lm) => lm && (lm.visibility ?? 1) > 0.2)
  if (usable.length === 0) {
    return {
      minX: 0.35,
      maxX: 0.65,
      minY: 0.25,
      maxY: 0.75,
      centerX: 0.5,
      centerY: 0.5,
      width: 0.3,
      height: 0.5,
    }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  usable.forEach((lm) => {
    minX = Math.min(minX, lm.x)
    maxX = Math.max(maxX, lm.x)
    minY = Math.min(minY, lm.y)
    maxY = Math.max(maxY, lm.y)
  })

  const width = maxX - minX
  const height = maxY - minY
  const padX = width * padding
  const padY = height * padding

  minX = Math.max(0, minX - padX)
  maxX = Math.min(1, maxX + padX)
  minY = Math.max(0, minY - padY)
  maxY = Math.min(1, maxY + padY)

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: Math.max(0.25, maxX - minX),
    height: Math.max(0.35, maxY - minY),
  }
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  radius: number
) {
  const x = cx - width / 2
  const y = cy - height / 2
  const r = Math.min(radius, width / 2, height / 2)

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.stroke()
}
