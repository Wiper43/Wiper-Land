import * as THREE from 'three'

import { BLOCK, doesBlockRegenerate, getBlockRegenDelay, isDestructibleBlockId, isSolidBlockId } from './blocks.js'
import {
  blockToChunk,
  blockToLocal,
  getChunkKey,
} from './worldMath.js'
import {
  clearChunkDirty,
  createChunk,
  disposeChunkMesh,
  fillChunkFromGenerator,
  getChunkBlock,
  getChunkOriginalBlock,
  isChunkDirty,
  markChunkDirty,
  queueChunkRegen,
  removeChunkRegenAt,
  setChunkBlock,
  setChunkMesh,
} from './chunk.js'
import { generateBlock } from './terrain.js'
import { buildChunkMesh, createWorldBlockMaterial } from './mesher.js'

export class BlockWorld {
  constructor(scene) {
    this.scene = scene

    this.group = new THREE.Group()
    this.group.name = 'BlockWorld'
    this.scene.add(this.group)

    this.chunks = new Map()
    this.material = createWorldBlockMaterial()

    this.loadedRadius = 2
    this.regenRetryDelay = 0.5

    this.navDirty = false
    this.navRebuildCooldown = 0
  }

  update(deltaTime, player) {
    this.updateLoadedChunksAroundPlayer(player)
    this.updateRegeneration(deltaTime, player)
    this.rebuildDirtyChunks()
  }

  updateLoadedChunksAroundPlayer(player) {
    

    if (!player?.position) return

    const centerCx = Math.floor(player.position.x / 16)
    const centerCy = 0
    const centerCz = Math.floor(player.position.z / 16)
   const ARENA_LIMIT = 20
    for (let cz = centerCz - this.loadedRadius; cz <= centerCz + this.loadedRadius; cz++) {
      for (let cy = centerCy - 1; cy <= centerCy + 1; cy++) {
        for (let cx = centerCx - this.loadedRadius; cx <= centerCx + this.loadedRadius; cx++) {
          const worldX = cx * 16
      const worldZ = cz * 16

      if (
        worldX < -ARENA_LIMIT ||
        worldX > ARENA_LIMIT ||
        worldZ < -ARENA_LIMIT ||
        worldZ > ARENA_LIMIT
      ) {
        continue
      }
          
            this.ensureChunk(cx, cy, cz)
        }
      }
    }
  }

  ensureChunk(cx, cy, cz) {
    
    const key = getChunkKey(cx, cy, cz)

    
    let chunk = this.chunks.get(key)

    if (chunk) return chunk

    chunk = createChunk(cx, cy, cz)
    fillChunkFromGenerator(chunk, generateBlock)
    this.chunks.set(key, chunk)

    return chunk
  }

  getChunk(cx, cy, cz) {
    return this.chunks.get(getChunkKey(cx, cy, cz)) ?? null
  }

  getChunkAtBlock(bx, by, bz) {
    const { cx, cy, cz } = blockToChunk(bx, by, bz)
    return this.getChunk(cx, cy, cz)
  }

  getBlockId(bx, by, bz) {
    const { cx, cy, cz } = blockToChunk(bx, by, bz)
    const chunk = this.getChunk(cx, cy, cz)
    if (!chunk) return BLOCK.AIR

    const { lx, ly, lz } = blockToLocal(bx, by, bz)
    return getChunkBlock(chunk, lx, ly, lz)
  }

  getBlock(bx, by, bz) {
    const blockId = this.getBlockId(bx, by, bz)

    return {
      bx,
      by,
      bz,
      blockId,
      solid: isSolidBlockId(blockId),
    }
  }

  isSolidBlock(bx, by, bz) {
    return isSolidBlockId(this.getBlockId(bx, by, bz))
  }

  breakBlock(bx, by, bz) {
    const { cx, cy, cz } = blockToChunk(bx, by, bz)
    const chunk = this.getChunk(cx, cy, cz)
    if (!chunk) return false

    const { lx, ly, lz } = blockToLocal(bx, by, bz)
    const blockId = getChunkBlock(chunk, lx, ly, lz)

    if (blockId === BLOCK.AIR) return false
    if (!isDestructibleBlockId(blockId)) return false

    const changed = setChunkBlock(chunk, lx, ly, lz, BLOCK.AIR)
    if (!changed) return false

    this.markChunkAndNeighborsDirty(bx, by, bz)
    this.markNavDirty()

    if (doesBlockRegenerate(blockId)) {
      queueChunkRegen(chunk, {
        bx,
        by,
        bz,
        restoreAt: performance.now() * 0.001 + getBlockRegenDelay(blockId),
      })
    }

    return true
  }

  restoreBlock(bx, by, bz) {
    const { cx, cy, cz } = blockToChunk(bx, by, bz)
    const chunk = this.getChunk(cx, cy, cz)
    if (!chunk) return false

    const { lx, ly, lz } = blockToLocal(bx, by, bz)
    const originalId = getChunkOriginalBlock(chunk, lx, ly, lz)
    if (originalId === BLOCK.AIR) return false

    const changed = setChunkBlock(chunk, lx, ly, lz, originalId)
    if (!changed) return false

    this.markChunkAndNeighborsDirty(bx, by, bz)
    this.markNavDirty()
    return true
  }

  updateRegeneration(_deltaTime, player) {
    const now = performance.now() * 0.001

    for (const chunk of this.chunks.values()) {
      for (let i = chunk.regenQueue.length - 1; i >= 0; i--) {
        const record = chunk.regenQueue[i]
        if (now < record.restoreAt) continue

        if (this.isBlockOccupied(record.bx, record.by, record.bz, player)) {
          record.restoreAt = now + this.regenRetryDelay
          continue
        }

        this.restoreBlock(record.bx, record.by, record.bz)
        removeChunkRegenAt(chunk, i)
      }
    }
  }

  isBlockOccupied(bx, by, bz, player) {
    if (!player?.position) return false

    const minX = bx
    const maxX = bx + 1
    const minY = by
    const maxY = by + 1
    const minZ = bz
    const maxZ = bz + 1

    const radius = player.radius ?? 0.35
    const height = player.height ?? 1.8

    const pMinX = player.position.x - radius
    const pMaxX = player.position.x + radius
    const pMinY = player.position.y
    const pMaxY = player.position.y + height
    const pMinZ = player.position.z - radius
    const pMaxZ = player.position.z + radius

    return (
      pMinX < maxX && pMaxX > minX &&
      pMinY < maxY && pMaxY > minY &&
      pMinZ < maxZ && pMaxZ > minZ
    )
  }

  markChunkDirty(cx, cy, cz) {
    const chunk = this.getChunk(cx, cy, cz)
    if (!chunk) return
    markChunkDirty(chunk)
  }

  markChunkAndNeighborsDirty(bx, by, bz) {
    const touched = new Set()

    const offsets = [
      [0, 0, 0],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]

    for (const [ox, oy, oz] of offsets) {
      const { cx, cy, cz } = blockToChunk(bx + ox, by + oy, bz + oz)
      const key = getChunkKey(cx, cy, cz)
      if (touched.has(key)) continue
      touched.add(key)
      this.markChunkDirty(cx, cy, cz)
    }
  }

  rebuildDirtyChunks() {
    for (const chunk of this.chunks.values()) {
      if (!isChunkDirty(chunk)) continue

      disposeChunkMesh(chunk)

      const mesh = buildChunkMesh(chunk, this, this.material)
      setChunkMesh(chunk, mesh)
      this.group.add(mesh)

      clearChunkDirty(chunk)
    }
  }

  markNavDirty() {
    this.navDirty = true
    this.navRebuildCooldown = 0.15
  }

  dispose() {
    for (const chunk of this.chunks.values()) {
      disposeChunkMesh(chunk)
    }

    this.chunks.clear()

    if (this.group.parent) {
      this.group.parent.remove(this.group)
    }

    this.material?.dispose?.()
  }
}