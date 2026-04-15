import { BLOCK } from './blocks.js'
import {
  CHUNK_SIZE,
  CHUNK_VOLUME,
  getBlockIndex,
  getChunkKey,
  isValidLocalCoord,
  localToBlock,
} from './worldMath.js'

export function createChunk(cx, cy, cz, storageMode = 'dense') {
  const dense = storageMode === 'dense'
  const blocks = dense ? new Uint8Array(CHUNK_VOLUME) : null
  const originalBlocks = dense ? new Uint8Array(CHUNK_VOLUME) : null

  blocks?.fill(BLOCK.AIR)
  originalBlocks?.fill(BLOCK.AIR)

  return {
    cx,
    cy,
    cz,
    key: getChunkKey(cx, cy, cz),

    size: CHUNK_SIZE,
    storageMode,
    blocks,
    originalBlocks,
    sparseBlocks: dense ? null : new Map(),
    sparseOriginalBlocks: dense ? null : new Map(),

    dirty: true,
    mesh: null,

    regenQueue: [],
  }
}

export function getChunkBlock(chunk, lx, ly, lz) {
  if (!isValidLocalCoord(lx, ly, lz)) return BLOCK.AIR
  const index = getBlockIndex(lx, ly, lz)
  if (chunk.storageMode === 'dense') {
    return chunk.blocks[index]
  }
  return chunk.sparseBlocks.get(index) ?? BLOCK.AIR
}

export function getChunkOriginalBlock(chunk, lx, ly, lz) {
  if (!isValidLocalCoord(lx, ly, lz)) return BLOCK.AIR
  const index = getBlockIndex(lx, ly, lz)
  if (chunk.storageMode === 'dense') {
    return chunk.originalBlocks[index]
  }
  return chunk.sparseOriginalBlocks.get(index) ?? BLOCK.AIR
}

export function setChunkBlock(chunk, lx, ly, lz, blockId) {
  if (!isValidLocalCoord(lx, ly, lz)) return false

  const index = getBlockIndex(lx, ly, lz)
  const prev = getChunkBlock(chunk, lx, ly, lz)

  if (prev === blockId) return false

  if (chunk.storageMode === 'dense') {
    chunk.blocks[index] = blockId
  } else if (blockId === BLOCK.AIR) {
    chunk.sparseBlocks.delete(index)
  } else {
    chunk.sparseBlocks.set(index, blockId)
  }
  chunk.dirty = true
  return true
}

export function setChunkOriginalBlock(chunk, lx, ly, lz, blockId) {
  if (!isValidLocalCoord(lx, ly, lz)) return false

  const index = getBlockIndex(lx, ly, lz)
  if (chunk.storageMode === 'dense') {
    chunk.originalBlocks[index] = blockId
  } else if (blockId === BLOCK.AIR) {
    chunk.sparseOriginalBlocks.delete(index)
  } else {
    chunk.sparseOriginalBlocks.set(index, blockId)
  }
  return true
}

export function setChunkBlockAndOriginal(chunk, lx, ly, lz, blockId) {
  if (!isValidLocalCoord(lx, ly, lz)) return false

  setChunkBlock(chunk, lx, ly, lz, blockId)
  setChunkOriginalBlock(chunk, lx, ly, lz, blockId)
  chunk.dirty = true
  return true
}

export function fillChunkFromGenerator(chunk, generatorFn) {
  if (chunk.storageMode === 'dense') {
    chunk.blocks.fill(BLOCK.AIR)
    chunk.originalBlocks.fill(BLOCK.AIR)
  } else {
    chunk.sparseBlocks.clear()
    chunk.sparseOriginalBlocks.clear()
  }

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const { bx, by, bz } = localToBlock(chunk.cx, chunk.cy, chunk.cz, lx, ly, lz)
        const blockId = generatorFn(bx, by, bz, lx, ly, lz, chunk) ?? BLOCK.AIR
        setChunkOriginalBlock(chunk, lx, ly, lz, blockId)
        setChunkBlock(chunk, lx, ly, lz, blockId)
      }
    }
  }

  chunk.dirty = true
  return chunk
}

export function setChunkStorageMode(chunk, storageMode, generatorFn = null) {
  if (chunk.storageMode === storageMode) return chunk

  if (storageMode === 'dense') {
    chunk.storageMode = 'dense'
    chunk.blocks = new Uint8Array(CHUNK_VOLUME)
    chunk.originalBlocks = new Uint8Array(CHUNK_VOLUME)
    chunk.sparseBlocks = null
    chunk.sparseOriginalBlocks = null
    chunk.blocks.fill(BLOCK.AIR)
    chunk.originalBlocks.fill(BLOCK.AIR)
    if (generatorFn) {
      fillChunkFromGenerator(chunk, generatorFn)
    }
    chunk.dirty = true
    return chunk
  }

  chunk.storageMode = 'sparse'
  chunk.blocks = null
  chunk.originalBlocks = null
  chunk.sparseBlocks = new Map()
  chunk.sparseOriginalBlocks = new Map()
  if (generatorFn) {
    fillChunkFromGenerator(chunk, generatorFn)
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

  chunk.mesh.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose()
    }

    if (child === chunk.mesh) return

    if (Array.isArray(child.material)) {
      for (const material of child.material) {
        material?.dispose?.()
      }
    } else {
      child.material?.dispose?.()
    }
  })

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
