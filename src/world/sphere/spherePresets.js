import { BLOCK } from '../blocks.js'

export const SPHERE_PRESET = Object.freeze({
  id: 'globe',
  label: 'Globe',
  description: 'Single-layer spherical shell world',

  getBlockId(_faceIdx, _bx, _by, bz) {
    return bz === 0 ? BLOCK.GRASS : BLOCK.AIR
  },

  colors: {
    grass: { r: 0.28, g: 0.62, b: 0.28 },
    dirt: { r: 0.44, g: 0.30, b: 0.20 },
    stone: { r: 0.52, g: 0.52, b: 0.56 },
  },
})
