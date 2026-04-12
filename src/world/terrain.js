import { getActiveWorldPreset } from './worldPresets.js'

export function getSurfaceHeightExact(bx, bz) {
  return getActiveWorldPreset().getSurfaceHeightExact(bx, bz)
}

export function getSurfaceHeight(bx, bz) {
  return Math.floor(getSurfaceHeightExact(bx, bz))
}

export function generateBlock(bx, by, bz) {
  return getActiveWorldPreset().getBlockId(bx, by, bz)
}
