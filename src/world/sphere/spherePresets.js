import { BLOCK } from '../blocks.js'
import { FACE_RES } from './cubeSphereCoords.js'
import {
  sampleApproxEarthLandMask,
  sampleApproxEarthTerrainHeight,
} from './earthAppearance.js'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getFaceLatLon(faceIdx, bx, by) {
  const u = ((bx + 0.5) / FACE_RES) * 2 - 1
  const v = ((by + 0.5) / FACE_RES) * 2 - 1

  let x = 0
  let y = 0
  let z = 0

  switch (faceIdx) {
    case 0: x = 1;  y = u;  z = v;  break
    case 1: x = -1; y = u;  z = v;  break
    case 2: x = u;  y = 1;  z = v;  break
    case 3: x = u;  y = -1; z = v;  break
    case 4: x = u;  y = v;  z = 1;  break
    case 5: x = u;  y = v;  z = -1; break
  }

  const len = Math.hypot(x, y, z) || 1
  const nx = x / len
  const ny = y / len
  const nz = z / len

  return {
    latitude: Math.asin(clamp(ny, -1, 1)) * 180 / Math.PI,
    longitude: Math.atan2(nz, nx) * 180 / Math.PI,
  }
}

export function getColumnProfile(faceIdx, bx, by) {
  const { latitude, longitude } = getFaceLatLon(faceIdx, bx, by)
  const landMask = sampleApproxEarthLandMask(latitude, longitude)
  const terrainHeight = sampleApproxEarthTerrainHeight(latitude, longitude)
  const topBz = -terrainHeight + 1

  return {
    landMask,
    terrainHeight,
    topBz,
  }
}

export const SPHERE_PRESET = Object.freeze({
  id: 'globe',
  label: 'Globe Hills',
  description: 'Cube-sphere shell with low rolling land heightfield',

  getBlockId(faceIdx, bx, by, bz) {
    const { landMask, topBz } = getColumnProfile(faceIdx, bx, by)

    if (landMask <= 0.33) {
      return bz === 0 ? BLOCK.GRASS : BLOCK.AIR
    }

    if (bz < topBz || bz > 0) return BLOCK.AIR
    if (bz === topBz) return BLOCK.GRASS
    if (bz >= -1) return BLOCK.DIRT
    return BLOCK.STONE
  },

  colors: {
    grass: { r: 0.28, g: 0.62, b: 0.28 },
    dirt: { r: 0.44, g: 0.30, b: 0.20 },
    stone: { r: 0.52, g: 0.52, b: 0.56 },
  },
})
