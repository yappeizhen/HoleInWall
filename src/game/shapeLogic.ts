export type Vec2 = { x: number; y: number }

export type ShapeConfig =
  | {
      id: string
      name: string
      kind: 'circle'
      center: Vec2
      radius: number
    }
  | {
      id: string
      name: string
      kind: 'rect'
      center: Vec2
      width: number
      height: number
      cornerRadius?: number
    }
  | {
      id: string
      name: string
      kind: 'triangle'
      points: [Vec2, Vec2, Vec2]
    }
  | {
      id: string
      name: string
      kind: 'polygon'
      points: Vec2[]
    }
  | {
      id: string
      name: string
      kind: 'curve'
      points: Vec2[]
      thickness: number
    }

export type NormalizedKeypoint = Vec2 & { score?: number; name?: string }

export interface FitOptions {
  minScore?: number
  tolerance?: number
}

export interface FitResult {
  pass: boolean
  insideRatio: number
  insideCount: number
  total: number
}

const FLOOR_Y = 0.95

export function getDefaultShapes(): ShapeConfig[] {
  return [
    makeTriangle(),
    makeTallRect(),
    makeThinRect(),
    makeBubbleT(),
    makeBubbleY(),
    makeBubbleF(),
    makeFlippedL(),
    makeSuperThin(),
  ]
}

function makeTriangle(): ShapeConfig {
  return {
    id: 'triangle-wide',
    name: 'Triangle',
    kind: 'triangle',
    points: [
      { x: 0.5, y: 0.52 },
      { x: 0.15, y: FLOOR_Y },
      { x: 0.85, y: FLOOR_Y },
    ],
  }
}

function makeTallRect(): ShapeConfig {
  return {
    id: 'door-rect',
    name: 'Tall Rectangle',
    kind: 'rect',
    center: { x: 0.5, y: FLOOR_Y - 0.3 },
    width: 0.44,
    height: 0.6,
    cornerRadius: 0,
  }
}

function makeThinRect(): ShapeConfig {
  return {
    id: 'rectangle-thin',
    name: 'Thin Rectangle (Tall)',
    kind: 'rect',
    center: { x: 0.5, y: FLOOR_Y - 0.09 },
    width: 0.35,
    height: 0.18,
    cornerRadius: 0,
  }
}

function makeBubbleT(): ShapeConfig {
  const top = 0.52
  const stemTop = 0.6
  const stemBottom = FLOOR_Y
  return {
    id: 'shape-t',
    name: 'Bubble T',
    kind: 'polygon',
    points: [
      { x: 0.2, y: top },
      { x: 0.8, y: top },
      { x: 0.8, y: stemTop },
      { x: 0.6, y: stemTop },
      { x: 0.6, y: stemBottom },
      { x: 0.4, y: stemBottom },
      { x: 0.4, y: stemTop },
      { x: 0.2, y: stemTop },
    ],
  }
}

function makeBubbleY(): ShapeConfig {
  const top = 0.52
  const junction = 0.64
  const bottom = FLOOR_Y
  return {
    id: 'shape-y',
    name: 'Bubble Y',
    kind: 'polygon',
    points: [
      { x: 0.24, y: top },
      { x: 0.44, y: junction },
      { x: 0.44, y: bottom },
      { x: 0.56, y: bottom },
      { x: 0.56, y: junction },
      { x: 0.76, y: top },
      { x: 0.64, y: top },
      { x: 0.50, y: 0.66 },
      { x: 0.36, y: top },
    ],
  }
}

function makeBubbleF(): ShapeConfig {
  const top = 0.52
  const mid = 0.68
  const low = 0.82
  const bottom = FLOOR_Y
  return {
    id: 'shape-f',
    name: 'Bubble F',
    kind: 'polygon',
    points: [
      { x: 0.18, y: top },
      { x: 0.72, y: top },
      { x: 0.72, y: 0.6 },
      { x: 0.44, y: 0.6 },
      { x: 0.44, y: mid },
      { x: 0.68, y: mid },
      { x: 0.68, y: low },
      { x: 0.44, y: low },
      { x: 0.44, y: bottom },
      { x: 0.18, y: bottom },
    ],
  }
}

function makeSuperThin(): ShapeConfig {
  return {
    id: 'shape-thin-rect',
    name: 'Super Thin Rect',
    kind: 'rect',
    center: { x: 0.5, y: FLOOR_Y - 0.07 },
    width: 0.36,
    height: 0.14,
    cornerRadius: 0,
  }
}

function makeFlippedL(): ShapeConfig {
  const top = 0.52
  const bottom = FLOOR_Y
  const footBottom = top + 0.04
  return {
    id: 'shape-flipped-l',
    name: 'Flipped L',
    kind: 'polygon',
    points: [
      { x: 0.24, y: top },
      { x: 0.80, y: top },
      { x: 0.80, y: footBottom },
      { x: 0.54, y: footBottom },
      { x: 0.54, y: bottom },
      { x: 0.24, y: bottom },
    ],
  }
}

export function evaluateFit(
  shape: ShapeConfig,
  keypoints: NormalizedKeypoint[],
  opts?: FitOptions,
): FitResult {
  const minScore = opts?.minScore ?? 0.25
  const tolerance = opts?.tolerance ?? 0.04
  const scored = keypoints.filter((k) => (k.score ?? 0) >= minScore)
  if (scored.length === 0) {
    return { pass: false, insideRatio: 0, insideCount: 0, total: 0 }
  }

  const inside = scored.filter((k) => isInsideShape(shape, k, tolerance))
  const insideRatio = inside.length / scored.length
  const pass = scored.length >= 4 && insideRatio >= 0.85

  return {
    pass,
    insideRatio,
    insideCount: inside.length,
    total: scored.length,
  }
}

export function isInsideShape(
  shape: ShapeConfig,
  point: Vec2,
  tolerance: number,
): boolean {
  // Allow points below a floor line to count as inside to accommodate half-body/open bottom
  if (point.y >= FLOOR_Y) return true

  if (shape.kind === 'circle') {
    const dx = point.x - shape.center.x
    const dy = point.y - shape.center.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    return dist <= Math.max(shape.radius - tolerance, 0)
  }
  if (shape.kind === 'rect') {
    const halfW = shape.width / 2 - tolerance
    const halfH = shape.height / 2 - tolerance
    return (
      Math.abs(point.x - shape.center.x) <= Math.max(halfW, 0) &&
      Math.abs(point.y - shape.center.y) <= Math.max(halfH, 0)
    )
  }
  if (shape.kind === 'triangle') {
    return pointInTriangle(point, shape.points, tolerance)
  }
  if (shape.kind === 'polygon') {
    return pointInPolygon(point, shape.points, tolerance)
  }
  if (shape.kind === 'curve') {
    return pointNearCurve(point, shape.points, shape.thickness, tolerance)
  }
  return false
}

function pointInTriangle(
  point: Vec2,
  pts: [Vec2, Vec2, Vec2],
  tolerance: number,
) {
  const [a, b, c] = pts
  const area = (p1: Vec2, p2: Vec2, p3: Vec2) =>
    Math.abs(
      (p1.x * (p2.y - p3.y) +
        p2.x * (p3.y - p1.y) +
        p3.x * (p1.y - p2.y)) /
        2,
    )

  const areaABC = area(a, b, c)
  const area1 = area(point, b, c)
  const area2 = area(a, point, c)
  const area3 = area(a, b, point)
  const totalArea = area1 + area2 + area3

  const toleranceArea = areaABC * tolerance + 1e-4
  return Math.abs(areaABC - totalArea) <= toleranceArea
}

function pointInPolygon(point: Vec2, pts: Vec2[], tolerance: number) {
  // Ray-casting algorithm with tolerance by inflating edges
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x
    const yi = pts[i].y
    const xj = pts[j].x
    const yj = pts[j].y

    const intersect =
      yi + tolerance < point.y + 1e-6 !== yj + tolerance < point.y + 1e-6 &&
      point.x <
        ((xj - xi) * (point.y - yi + tolerance)) / (yj - yi + tolerance) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointNearCurve(
  point: Vec2,
  pts: Vec2[],
  thickness: number,
  tolerance: number,
) {
  const band = thickness - tolerance
  if (pts.length < 2) return false
  let minDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distancePointToSegment(point, pts[i], pts[i + 1])
    if (d < minDist) minDist = d
  }
  return minDist <= Math.max(band, 0)
}

function distancePointToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const apx = p.x - a.x
  const apy = p.y - a.y
  const abLenSq = abx * abx + aby * aby
  const t = abLenSq > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq)) : 0
  const projx = a.x + t * abx
  const projy = a.y + t * aby
  const dx = p.x - projx
  const dy = p.y - projy
  return Math.sqrt(dx * dx + dy * dy)
}
