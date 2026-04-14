// ============================================================
// CUBE-SPHERE COORDINATE SYSTEM
//
// Ported from ddupont808/planetcraft (C# → JS).
// Maps 6 cube faces onto a sphere, eliminating polar
// singularities and giving uniform block density everywhere.
//
// Face indices & cube-point convention:
//   Face 0 (+X): cube point = ( alt,  u·alt, v·alt)  u→Y, v→Z
//   Face 1 (-X): cube point = (-alt,  u·alt, v·alt)  u→Y, v→Z
//   Face 2 (+Y): cube point = ( u·alt, alt,  v·alt)  u→X, v→Z
//   Face 3 (-Y): cube point = ( u·alt,-alt,  v·alt)  u→X, v→Z
//   Face 4 (+Z): cube point = ( u·alt, v·alt, alt)   u→X, v→Y
//   Face 5 (-Z): cube point = ( u·alt, v·alt,-alt)   u→X, v→Y
//
// u = bx / FACE_RES * 2 - 1  (block centre: bx+0.5)
// v = by / FACE_RES * 2 - 1  (block centre: by+0.5)
//
// "Up"   at any point = normalize(worldPos) — radially outward
// "Down" (gravity)    = -normalize(worldPos) — toward core
// ============================================================

import * as THREE from 'three'

export const SPHERE_RADIUS = 1024  // world-unit radius of outer surface
export const FACE_RES      = 128   // blocks per face edge
export const SHELL_DEPTH   = 1     // single surface layer only
export const LAYER_SCALE   = 1.0   // world units per depth step
export const NUM_FACES     = 6

// ── Core math (planetcraft port) ─────────────────────────────

/**
 * Maps a point on a cube face to the sphere surface.
 * Input (cx, cy, cz) is a cube point at the given altitude
 * (the dominant component has magnitude = altitude).
 * Returns a THREE.Vector3 on the sphere at the same altitude.
 */
export function cubeToSphere(cx, cy, cz, altitude) {
  if (altitude === 0) return new THREE.Vector3(0, 0, 0)
  const x = cx / altitude, y = cy / altitude, z = cz / altitude
  const x2 = x * x, y2 = y * y, z2 = z * z
  return new THREE.Vector3(
    cx * Math.sqrt(Math.max(0, 1 - y2 / 2 - z2 / 2 + y2 * z2 / 3)),
    cy * Math.sqrt(Math.max(0, 1 - x2 / 2 - z2 / 2 + x2 * z2 / 3)),
    cz * Math.sqrt(Math.max(0, 1 - x2 / 2 - y2 / 2 + x2 * y2 / 3)),
  )
}

/**
 * Algebraic inverse of cubeToSphere.
 * Input (x, y, z) must be on the UNIT sphere (normalised before calling).
 * Returns { faceIdx, u, v } where faceIdx is 0–5 and u,v ∈ [-1, 1].
 */
export function cubizePoint(x, y, z) {
  const fx = Math.abs(x), fy = Math.abs(y), fz = Math.abs(z)
  const INV_SQRT2 = 0.70710676908493042

  let u, v, faceIdx

  if (fy >= fx && fy >= fz) {
    // Y dominant — face +Y (2) or -Y (3)
    const a2 = x * x * 2.0
    const b2 = z * z * 2.0
    const inner = -a2 + b2 - 3.0
    const disc  = Math.max(0, inner * inner - 12.0 * a2)
    const isqrt = -Math.sqrt(disc)
    u = x === 0 ? 0 : Math.sign(x) * Math.min(1, Math.sqrt(Math.max(0, isqrt + a2 - b2 + 3.0)) * INV_SQRT2)
    v = z === 0 ? 0 : Math.sign(z) * Math.min(1, Math.sqrt(Math.max(0, isqrt - a2 + b2 + 3.0)) * INV_SQRT2)
    faceIdx = y >= 0 ? 2 : 3

  } else if (fx >= fy && fx >= fz) {
    // X dominant — face +X (0) or -X (1)
    const a2 = y * y * 2.0
    const b2 = z * z * 2.0
    const inner = -a2 + b2 - 3.0
    const disc  = Math.max(0, inner * inner - 12.0 * a2)
    const isqrt = -Math.sqrt(disc)
    u = y === 0 ? 0 : Math.sign(y) * Math.min(1, Math.sqrt(Math.max(0, isqrt + a2 - b2 + 3.0)) * INV_SQRT2)
    v = z === 0 ? 0 : Math.sign(z) * Math.min(1, Math.sqrt(Math.max(0, isqrt - a2 + b2 + 3.0)) * INV_SQRT2)
    faceIdx = x >= 0 ? 0 : 1

  } else {
    // Z dominant — face +Z (4) or -Z (5)
    const a2 = x * x * 2.0
    const b2 = y * y * 2.0
    const inner = -a2 + b2 - 3.0
    const disc  = Math.max(0, inner * inner - 12.0 * a2)
    const isqrt = -Math.sqrt(disc)
    u = x === 0 ? 0 : Math.sign(x) * Math.min(1, Math.sqrt(Math.max(0, isqrt + a2 - b2 + 3.0)) * INV_SQRT2)
    v = y === 0 ? 0 : Math.sign(y) * Math.min(1, Math.sqrt(Math.max(0, isqrt - a2 + b2 + 3.0)) * INV_SQRT2)
    faceIdx = z >= 0 ? 4 : 5
  }

  return { faceIdx, u, v }
}

// ── Internal helpers ─────────────────────────────────────────

// Convert (faceIdx, u, v, altitude) to an unmodified cube point [cx, cy, cz].
function faceToCubePoint(faceIdx, u, v, altitude) {
  switch (faceIdx) {
    case 0: return [altitude,  u * altitude, v * altitude]
    case 1: return [-altitude, u * altitude, v * altitude]
    case 2: return [u * altitude,  altitude, v * altitude]
    case 3: return [u * altitude, -altitude, v * altitude]
    case 4: return [u * altitude, v * altitude,  altitude]
    case 5: return [u * altitude, v * altitude, -altitude]
  }
}

// bx/by → u/v (block CENTRE offset +0.5)
function bxToU(bx) { return (bx + 0.5) / FACE_RES * 2 - 1 }
function byToV(by) { return (by + 0.5) / FACE_RES * 2 - 1 }

// bx/by integer edge → u/v (no +0.5, used for corners)
function edgeToU(b) { return b / FACE_RES * 2 - 1 }
function edgeToV(b) { return b / FACE_RES * 2 - 1 }

// ── Block centre → 3D world position ─────────────────────────

export function blockToWorld(faceIdx, bx, by, bz) {
  const u   = bxToU(bx)
  const v   = byToV(by)
  const r   = SPHERE_RADIUS - (bz + 0.5) * LAYER_SCALE
  const [cx, cy, cz] = faceToCubePoint(faceIdx, u, v, r)
  return cubeToSphere(cx, cy, cz, r)
}

// ── Block corner → 3D world position ─────────────────────────
//
// Corner index bit layout:  bit0 = dbx, bit1 = dby, bit2 = dbz
//   0: (bx,   by,   bz  )
//   1: (bx+1, by,   bz  )
//   2: (bx,   by+1, bz  )
//   3: (bx+1, by+1, bz  )
//   4: (bx,   by,   bz+1)
//   5: (bx+1, by,   bz+1)
//   6: (bx,   by+1, bz+1)
//   7: (bx+1, by+1, bz+1)

const CORNER_OFFSETS = [
  [0,0,0],[1,0,0],[0,1,0],[1,1,0],
  [0,0,1],[1,0,1],[0,1,1],[1,1,1],
]

export function blockCornerToWorld(faceIdx, bx, by, bz, cornerIdx) {
  const [dbx, dby, dbz] = CORNER_OFFSETS[cornerIdx]
  const u = edgeToU(bx + dbx)
  const v = edgeToV(by + dby)
  const r = SPHERE_RADIUS - (bz + dbz) * LAYER_SCALE
  const [cx, cy, cz] = faceToCubePoint(faceIdx, u, v, r)
  return cubeToSphere(cx, cy, cz, r)
}

// ── 3D world position → nearest block indices ─────────────────

export function worldToBlock(worldPos) {
  const r = worldPos.length()
  if (r < 0.001) {
    return { faceIdx: 2, bx: FACE_RES >> 1, by: FACE_RES >> 1, bz: 0 }
  }
  const { faceIdx, u, v } = cubizePoint(worldPos.x / r, worldPos.y / r, worldPos.z / r)
  return {
    faceIdx,
    bx: Math.min(FACE_RES - 1, Math.max(0, Math.floor((u + 1) / 2 * FACE_RES))),
    by: Math.min(FACE_RES - 1, Math.max(0, Math.floor((v + 1) / 2 * FACE_RES))),
    bz: Math.floor((SPHERE_RADIUS - r) / LAYER_SCALE),
  }
}

// ── Face-edge wrapping ─────────────────────────────────────────
//
// When bx or by is outside [0, FACE_RES), project through the cube
// onto the correct adjacent face.  Works by normalising the cube-
// direction vector and re-running cubizePoint.
//
// NOTE: cubizePoint is the inverse of cubeToSphere (sphere→cube),
// not the cube-projection inverse.  For neighbour lookups (d ≤ 1)
// the difference is sub-block and geometrically negligible.

export function wrapBlockCoords(faceIdx, bx, by) {
  if (bx >= 0 && bx < FACE_RES && by >= 0 && by < FACE_RES) {
    return { faceIdx, bx, by }
  }
  const u = bx / FACE_RES * 2 - 1
  const v = by / FACE_RES * 2 - 1
  const [cx, cy, cz] = faceToCubePoint(faceIdx, u, v, 1.0)
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz)
  const { faceIdx: newFace, u: nu, v: nv } = cubizePoint(cx / len, cy / len, cz / len)
  return {
    faceIdx: newFace,
    bx: Math.min(FACE_RES - 1, Math.max(0, Math.floor((nu + 1) / 2 * FACE_RES))),
    by: Math.min(FACE_RES - 1, Math.max(0, Math.floor((nv + 1) / 2 * FACE_RES))),
  }
}

// ── Radial direction helpers ──────────────────────────────────

export function getRadialUp(worldPos) {
  return worldPos.clone().normalize()
}

export function getGravityDir(worldPos) {
  return worldPos.clone().normalize().negate()
}

// ── Local frame at a world position ──────────────────────────
//
// Returns { up, north, east } — all unit vectors.
// "north" and "east" are arbitrary tangents perpendicular to "up".
// Uses a fallback reference to avoid degenerate cross products.

export function getLocalFrame(worldPos) {
  const up  = worldPos.clone().normalize()
  const ref = Math.abs(up.x) < 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0)
  const east  = new THREE.Vector3().crossVectors(ref, up).normalize()
  const north = new THREE.Vector3().crossVectors(up, east).normalize()
  return { up, north, east }
}
