import * as THREE from 'three'

// ============================================================
// SPHERE COORDINATE SYSTEM
//
// x (bx) = latitude index   : 0 → LAT_RES-1  maps to  -90° → +90°
// y (by) = longitude index  : 0 → LON_RES-1  maps to    0° → 360°
// z (bz) = depth index      : 0 = outer surface, SHELL_DEPTH-1 = innermost
//
// 3D world position formula:
//   φ = (bx / LAT_RES) * π  - π/2
//   θ = (by / LON_RES) * 2π
//   r = SPHERE_RADIUS - bz * LAYER_SCALE
//   world = (r·cos(φ)·cos(θ),  r·sin(φ),  r·cos(φ)·sin(θ))
//
// "Up"   at any point = normalize(worldPos) — radially outward
// "Down" (gravity)    = -normalize(worldPos) — toward core (origin)
// ============================================================

export const SPHERE_RADIUS = 256   // world-unit radius of the outer surface
export const LAT_RES       = 512   // total latitude block columns  (bx: 0..511)
export const LON_RES       = 1024  // total longitude block columns (by: 0..1023)
export const SHELL_DEPTH   = 50    // max depth layers (bz: 0..49)
export const LAYER_SCALE   = 1.0   // world units per depth step

// ── Angle / radius helpers ──────────────────────────────────

export function bxToLatRad(bx) {
  return (bx / LAT_RES) * Math.PI - Math.PI / 2   // -π/2 to +π/2
}

export function byToLonRad(by) {
  return (by / LON_RES) * 2 * Math.PI              // 0 to 2π
}

export function bzToRadius(bz) {
  return SPHERE_RADIUS - bz * LAYER_SCALE
}

// ── Block centre → 3D world position ───────────────────────

export function blockToWorld(bx, by, bz) {
  const phi   = bxToLatRad(bx + 0.5)
  const theta = byToLonRad(by + 0.5)
  const r     = bzToRadius(bz + 0.5)
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.cos(theta),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.sin(theta)
  )
}

// ── Block corner → 3D world position ───────────────────────
//
// Corner index encodes three bits: (dlat | dlon | dz)
//   0 = (bx,  by,  bz )   "outer-lat-lon-"
//   1 = (bx+1,by,  bz )
//   2 = (bx,  by+1,bz )
//   3 = (bx+1,by+1,bz )
//   4 = (bx,  by,  bz+1)  "inner-lat-lon-"
//   5 = (bx+1,by,  bz+1)
//   6 = (bx,  by+1,bz+1)
//   7 = (bx+1,by+1,bz+1)

const CORNER_OFFSETS = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
]

export function blockCornerToWorld(bx, by, bz, cornerIndex) {
  const [dlat, dlon, dz] = CORNER_OFFSETS[cornerIndex]
  const phi   = bxToLatRad(bx + dlat)
  const theta = byToLonRad(by + dlon)
  const r     = bzToRadius(bz + dz)
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.cos(theta),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.sin(theta)
  )
}

// ── 3D world position → nearest block indices ──────────────

export function worldToBlock(worldPos) {
  const r = worldPos.length()
  if (r < 0.001) return { bx: LAT_RES >> 1, by: 0, bz: 0 }

  const phi      = Math.asin(Math.max(-1, Math.min(1, worldPos.y / r)))
  const theta    = Math.atan2(worldPos.z, worldPos.x)
  const thetaNorm = theta < 0 ? theta + 2 * Math.PI : theta

  const bxExact = (phi + Math.PI / 2) / Math.PI * LAT_RES
  const byExact = thetaNorm / (2 * Math.PI) * LON_RES
  const bzExact = (SPHERE_RADIUS - r) / LAYER_SCALE

  return {
    bx: Math.floor(bxExact),
    by: Math.floor(byExact),
    bz: Math.floor(bzExact),
  }
}

// ── Radial direction helpers ────────────────────────────────

export function getRadialUp(worldPos) {
  return worldPos.clone().normalize()
}

export function getGravityDir(worldPos) {
  return worldPos.clone().normalize().negate()
}

// ── Surface tangent vectors ─────────────────────────────────
//
// latDir — northward direction (∂pos/∂φ, normalised)
//   = (-sin(φ)·cos(θ),  cos(φ),  -sin(φ)·sin(θ))   already unit length
//
// lonDir — eastward direction (∂pos/∂θ, normalised)
//   = (-sin(θ),  0,  cos(θ))                        independent of φ

export function getLatLonTangents(worldPos) {
  const r = worldPos.length()
  if (r < 0.001) {
    return {
      latDir: new THREE.Vector3(0, 0, 1),
      lonDir: new THREE.Vector3(1, 0, 0),
    }
  }

  const phi   = Math.asin(Math.max(-1, Math.min(1, worldPos.y / r)))
  const theta = Math.atan2(worldPos.z, worldPos.x)

  const latDir = new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
     Math.cos(phi),
    -Math.sin(phi) * Math.sin(theta)
  ) // already unit length (magnitude = 1)

  const lonDir = new THREE.Vector3(
    -Math.sin(theta),
     0,
     Math.cos(theta)
  ) // already unit length

  return { latDir, lonDir }
}

// ── Longitude wrapping ──────────────────────────────────────

export function wrapLon(by) {
  return ((by % LON_RES) + LON_RES) % LON_RES
}

export function isValidLat(bx) {
  return bx >= 0 && bx < LAT_RES
}
