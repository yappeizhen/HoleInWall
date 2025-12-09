// Pose tracking types
export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface PoseFrame {
  landmarks: Landmark[]
  timestamp: number
  fps: number
}

export type PoseTrackingStatus = 'idle' | 'initializing' | 'ready' | 'permission-denied' | 'error'

// Game types
export type GamePhase = 'menu' | 'countdown' | 'playing' | 'success' | 'fail' | 'gameover' | 'paused'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface PoseShape {
  id: string
  name: string
  landmarks: Landmark[]
  difficulty: Difficulty
  description?: string
}

export interface GameRound {
  roundNumber: number
  shape: PoseShape
  duration: number // wall approach time in ms
  tolerance: number // how forgiving the pose match is (0-1)
  completed: boolean
  score: number
}

export interface Checkpoint {
  level: number
  name: string
  roundsRequired: number
  wallSpeed: number // duration in ms
  tolerance: number
  availablePoses: Difficulty[]
}

export interface PlayerState {
  id: string
  lives: number
  score: number
  currentRound: number
  checkpoint: number
  highScore: number
}

export interface GameSettings {
  soundEnabled: boolean
  showDebugOverlay: boolean
  cameraId?: string
}

// Landmark indices for MediaPipe Pose (33 landmarks)
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

// Key landmarks for pose matching (weighted higher)
export const KEY_LANDMARKS = [
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_ELBOW,
  POSE_LANDMARKS.RIGHT_ELBOW,
  POSE_LANDMARKS.LEFT_WRIST,
  POSE_LANDMARKS.RIGHT_WRIST,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
] as const

