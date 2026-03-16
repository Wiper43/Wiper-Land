import { BLOCK } from './blocks.js'
import {
  CHUNK_SIZE,
  CHUNK_VOLUME,
  getBlockIndex,
  getChunkKey,
  isValidLocalCoord,
  localToBlock,
} from './worldMath.js'

export function createChunk(cx, cy, cz) {
  const blocks = new Uint8Array(CHUNK_VOLUME)
  const originalBlocks = new Uint8Array(CHUNK_VOLUME)

  blocks.fill(BLOCK.AIR)
  originalBlocks.fill(BLOCK.AIR)

  return {
    cx,
    cy,
    cz,
    key: getChunkKey(cx, cy, cz),

    size: CHUNK_SIZE,
    blocks,
    originalBlocks,

    dirty: true,
    mesh: null,

    regenQueue: [],
  }
}

export function getChunkBlock(chunk, lx, ly, lz) {
  if (!isValidLocalCoord(lx, ly, lz)) return BLOCK.AIR
  return chunk.blocks[getBlockIndex(lx, ly, lz)]
}

export function getChunkOriginalBlock(chunk, lx, ly, lz) {
  if (!isValidLocalCoord(lx, ly, lz)) return BLOCK.AIR
  return chunk.originalBlocks[getBlockIndex(lx, ly, lz)]
}

export function setChunkBlock(chunk, lx, ly, lz, blockId) {
  if (!isValidLocalCoord(lx, ly, lz)) return false

  const index = getBlockIndex(lx, ly, lz)
  const prev = chunk.blocks[index]

  if (prev === blockId) return false

  chunk.blocks[index] = blockId
  chunk.dirty = true
  return true
}

export function setChunkOriginalBlock(chunk, lx, ly, lz, blockId) {
  if (!isValidLocalCoord(lx, ly, lz)) return false

  const index = getBlockIndex(lx, ly, lz)
  chunk.originalBlocks[index] = blockId
  return true
}

export function setChunkBlockAndOriginal(chunk, lx, ly, lz, blockId) {
  if (!isValidLocalCoord(lx, ly, lz)) return false

  const index = getBlockIndex(lx, ly, lz)
  chunk.blocks[index] = blockId
  chunk.originalBlocks[index] = blockId
  chunk.dirty = true
  return true
}

export function fillChunkFromGenerator(chunk, generatorFn) {
  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const { bx, by, bz } = localToBlock(chunk.cx, chunk.cy, chunk.cz, lx, ly, lz)
        const blockId = generatorFn(bx, by, bz, lx, ly, lz, chunk) ?? BLOCK.AIR
        const index = getBlockIndex(lx, ly, lz)

        chunk.blocks[index] = blockId
        chunk.originalBlocks[index] = blockId
      }
    }
  }

  chunk.dirty = true
  return chunk
}

export function markChunkDirty(chunk) {
  chunk.dirty = true
}

export function clearChunkDirty(chunk) {
  chunk.dirty = false
}

export function isChunkDirty(chunk) {
  return chunk.dirty === true
}

export function setChunkMesh(chunk, mesh) {
  chunk.mesh = mesh
}

export function disposeChunkMesh(chunk) {
  if (!chunk.mesh) return

  if (chunk.mesh.parent) {
    chunk.mesh.parent.remove(chunk.mesh)
  }

  if (chunk.mesh.geometry) {
    chunk.mesh.geometry.dispose()
  }

  // Important: the world material is shared across many chunk meshes,
  // so it must NOT be disposed here.
  chunk.mesh = null
}

export function queueChunkRegen(chunk, regenRecord) {
  chunk.regenQueue.push(regenRecord)
}

export function removeChunkRegenAt(chunk, index) {
  chunk.regenQueue.splice(index, 1)
}
