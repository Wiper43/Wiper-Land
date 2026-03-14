export const CHUNK_SIZE = 16
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE

export function floorDiv(value, divisor) {
  return Math.floor(value / divisor)
}

export function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus
}

export function worldToBlock(x, y, z) {
  return {
    bx: Math.floor(x),
    by: Math.floor(y),
    bz: Math.floor(z),
  }
}

export function blockToChunk(bx, by, bz) {
  return {
    cx: floorDiv(bx, CHUNK_SIZE),
    cy: floorDiv(by, CHUNK_SIZE),
    cz: floorDiv(bz, CHUNK_SIZE),
  }
}

export function blockToLocal(bx, by, bz) {
  return {
    lx: positiveModulo(bx, CHUNK_SIZE),
    ly: positiveModulo(by, CHUNK_SIZE),
    lz: positiveModulo(bz, CHUNK_SIZE),
  }
}

export function worldToChunk(x, y, z) {
  const { bx, by, bz } = worldToBlock(x, y, z)
  return blockToChunk(bx, by, bz)
}

export function getChunkKey(cx, cy, cz) {
  return `${cx},${cy},${cz}`
}

export function parseChunkKey(key) {
  const [cx, cy, cz] = key.split(',').map(Number)
  return { cx, cy, cz }
}

export function getBlockIndex(lx, ly, lz) {
  return lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE
}

export function isValidLocalCoord(lx, ly, lz) {
  return (
    lx >= 0 && lx < CHUNK_SIZE &&
    ly >= 0 && ly < CHUNK_SIZE &&
    lz >= 0 && lz < CHUNK_SIZE
  )
}

export function chunkToWorldOrigin(cx, cy, cz) {
  return {
    x: cx * CHUNK_SIZE,
    y: cy * CHUNK_SIZE,
    z: cz * CHUNK_SIZE,
  }
}

export function localToBlock(cx, cy, cz, lx, ly, lz) {
  return {
    bx: cx * CHUNK_SIZE + lx,
    by: cy * CHUNK_SIZE + ly,
    bz: cz * CHUNK_SIZE + lz,
  }
}