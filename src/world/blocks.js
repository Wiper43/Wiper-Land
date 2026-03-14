export const BLOCK = Object.freeze({
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
})

export const BLOCK_DEFS = Object.freeze({
  [BLOCK.AIR]: {
    id: BLOCK.AIR,
    name: 'air',
    solid: false,
    destructible: false,
    regenerates: false,
    regenDelay: 0,
  },

  [BLOCK.GRASS]: {
    id: BLOCK.GRASS,
    name: 'grass',
    solid: true,
    destructible: true,
    regenerates: true,
    regenDelay: 4.0,
  },

  [BLOCK.DIRT]: {
    id: BLOCK.DIRT,
    name: 'dirt',
    solid: true,
    destructible: true,
    regenerates: true,
    regenDelay: 5.0,
  },

  [BLOCK.STONE]: {
    id: BLOCK.STONE,
    name: 'stone',
    solid: true,
    destructible: true,
    regenerates: true,
    regenDelay: 6.0,
  },
})

export function getBlockDef(blockId) {
  return BLOCK_DEFS[blockId] ?? BLOCK_DEFS[BLOCK.AIR]
}

export function isSolidBlockId(blockId) {
  return getBlockDef(blockId).solid === true
}

export function isDestructibleBlockId(blockId) {
  return getBlockDef(blockId).destructible === true
}

export function doesBlockRegenerate(blockId) {
  return getBlockDef(blockId).regenerates === true
}

export function getBlockRegenDelay(blockId) {
  return getBlockDef(blockId).regenDelay ?? 0
}