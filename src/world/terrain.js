import { BLOCK } from './blocks.js'

const GROUND_Y = -2

export function generateBlock(bx, by, bz) {
  if (by === 0) return BLOCK.GRASS
  if (by === -1) return BLOCK.DIRT
  if (by <= -2) return BLOCK.STONE
  return BLOCK.AIR
}