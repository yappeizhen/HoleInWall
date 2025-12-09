import type { Landmark, PoseShape } from '@/types'
import { KEY_LANDMARKS, POSE_LANDMARKS } from '@/types'

interface MatchResult {
  score: number // 0-100 percentage
  isMatch: boolean
  landmarkScores: Map<number, number>
}

// Weights for different landmarks (higher = more important for matching)
const LANDMARK_WEIGHTS: Record<number, number> = {
  [POSE_LANDMARKS.LEFT_SHOULDER]: 1.5,
  [POSE_LANDMARKS.RIGHT_SHOULDER]: 1.5,
  [POSE_LANDMARKS.LEFT_ELBOW]: 1.3,
  [POSE_LANDMARKS.RIGHT_ELBOW]: 1.3,
  [POSE_LANDMARKS.LEFT_WRIST]: 1.1,
  [POSE_LANDMARKS.RIGHT_WRIST]: 1.1,
  [POSE_LANDMARKS.LEFT_HIP]: 1.0,
  [POSE_LANDMARKS.RIGHT_HIP]: 1.0,
}

// Calculate distance between two landmarks (normalized 0-1 space)
const landmarkDistance = (a: Landmark, b: Landmark): number => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Convert distance to a score (0-1, where 1 is perfect match)
const distanceToScore = (distance: number, tolerance: number): number => {
  // tolerance affects how forgiving the matching is
  // Higher tolerance = more forgiving
  const normalizedDistance = distance / tolerance
  return Math.max(0, 1 - normalizedDistance)
}

// Normalize pose landmarks relative to shoulder width and hip position
// This makes the matching scale-invariant
const normalizePose = (landmarks: Landmark[]): Landmark[] => {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return landmarks
  }

  // Calculate center point (between shoulders and hips)
  const centerX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4
  const centerY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4

  // Calculate scale based on shoulder width
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x)
  const scale = shoulderWidth > 0.01 ? shoulderWidth : 0.3 // Avoid division by zero

  return landmarks.map((lm) => ({
    x: (lm.x - centerX) / scale + 0.5,
    y: (lm.y - centerY) / scale + 0.5,
    z: lm.z,
    visibility: lm.visibility,
  }))
}

export const comparePoses = (
  playerLandmarks: Landmark[],
  targetShape: PoseShape,
  tolerance: number = 0.15
): MatchResult => {
  const landmarkScores = new Map<number, number>()

  if (playerLandmarks.length < 33) {
    return { score: 0, isMatch: false, landmarkScores }
  }

  // Normalize both poses for scale-invariant comparison
  const normalizedPlayer = normalizePose(playerLandmarks)
  const normalizedTarget = normalizePose(targetShape.landmarks)

  let totalScore = 0
  let totalWeight = 0
  let coverageHits = 0
  let coverageTotal = 0

  // Outline-style coverage: treat inside a padded bounding box as a fit.
  const bounds = getPaddedBounds(normalizedTarget, tolerance * 2)

  // Compare key landmarks
  for (const landmarkIndex of KEY_LANDMARKS) {
    const playerLm = normalizedPlayer[landmarkIndex]
    const targetLm = normalizedTarget[landmarkIndex]

    if (!playerLm || !targetLm) continue

    // Check visibility - skip landmarks with low visibility
    if ((playerLm.visibility ?? 1) < 0.5) {
      continue
    }

    const distance = landmarkDistance(playerLm, targetLm)
    const score = distanceToScore(distance, tolerance)
    const weight = LANDMARK_WEIGHTS[landmarkIndex] ?? 1.0

    landmarkScores.set(landmarkIndex, score)
    totalScore += score * weight
    totalWeight += weight

    coverageTotal += 1
    if (isInsideBounds(playerLm, bounds)) {
      coverageHits += 1
    }
  }

  const weightedScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0
  const coverageScore = coverageTotal > 0 ? (coverageHits / coverageTotal) * 100 : 0

  // Blend precision with coverage; emphasize coverage so "inside the outline" counts.
  const finalScore = weightedScore * 0.4 + coverageScore * 0.6

  // A match requires most key points inside the forgiving outline and a modest blended score.
  const isMatch = coverageScore >= 70 && finalScore >= 55

  return {
    score: Math.round(finalScore),
    isMatch,
    landmarkScores,
  }
}

function getPaddedBounds(landmarks: Landmark[], padding: number) {
  const usable = landmarks.filter((lm) => lm && (lm.visibility ?? 1) > 0.2)
  if (!usable.length) {
    return { minX: 0.35, maxX: 0.65, minY: 0.25, maxY: 0.75 }
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

  return {
    minX: Math.max(0, minX - padX),
    maxX: Math.min(1, maxX + padX),
    minY: Math.max(0, minY - padY),
    maxY: Math.min(1, maxY + padY),
  }
}

function isInsideBounds(lm: Landmark, bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  return lm.x >= bounds.minX && lm.x <= bounds.maxX && lm.y >= bounds.minY && lm.y <= bounds.maxY
}

// Get match quality description
export const getMatchQuality = (score: number): string => {
  if (score >= 95) return 'PERFECT!'
  if (score >= 85) return 'Excellent!'
  if (score >= 75) return 'Great!'
  if (score >= 70) return 'Good!'
  if (score >= 50) return 'Close...'
  return 'Try again!'
}

// Calculate bonus points based on match quality
export const calculateBonus = (score: number, basePoints: number): number => {
  if (score >= 95) return basePoints * 2
  if (score >= 85) return Math.floor(basePoints * 1.5)
  if (score >= 75) return Math.floor(basePoints * 1.2)
  return basePoints
}

