import * as THREE from 'three'

import {
  BLOCK,
  doesBlockRegenerate,
  getBlockRegenDelay,
  isDestructibleBlockId,
  isSolidBlockId,
} from './blocks.js'
import {
  CHUNK_SIZE,
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
import { getActiveWorldPreset } from './worldPresets.js'

export class BlockWorld {
  constructor(scene) {
    this.scene = scene

    this.group = new THREE.Group()
    this.group.name = 'BlockWorld'
    this.scene.add(this.group)

    this.chunks = new Map()
    this.material = createWorldBlockMaterial()

    this.chunkSize = CHUNK_SIZE
    this.loadedRadius = 12
    this.unloadRadius = this.loadedRadius + 2
    this.worldHalfSize = Math.max(8, Math.floor((getActiveWorldPreset().worldSize ?? 384) / 2))
    this.skyLightMaxY = 48

    // Regen tuning
    this.regenRetryDelay = 1.0
    this.regenRetryJitter = 0.5
    this.regenSpawnJitter = 1.25
    this.maxRegensPerFrame = 8
    this.regenPlayerBlockRadius = 10

    // Mesh rebuild tuning
    this.maxChunkRebuildsPerFrame = 2

    this.navDirty = false
    this.navRebuildCooldown = 0
  }

  // Converts world coordinates to chunk + local block coordinates.
  worldToChunk(x, y, z) {
    const { cx, cy, cz } = blockToChunk(Math.floor(x), Math.floor(y), Math.floor(z))
    const { lx, ly, lz } = blockToLocal(Math.floor(x), Math.floor(y), Math.floor(z))
    return { cx, cy, cz, lx, ly, lz }
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

  isSolid(x, y, z) {
    return isSolidBlockId(this.getBlockId(x, y, z))
  }

  isSolidBlock(faceIdxOrBx, bxOrBy, byOrBz, bz) {
    // Accept either (bx, by, bz) or (faceIdx, bx, by, bz) — faceIdx is ignored here.
    if (bz !== undefined) return isSolidBlockId(this.getBlockId(bxOrBy, byOrBz, bz))
    return isSolidBlockId(this.getBlockId(faceIdxOrBx, bxOrBy, byOrBz))
  }

  getSkyLightAt(bx, by, bz) {
    const sampleY = Math.floor(by)
    let firstCoverY = null

    for (let y = sampleY; y <= this.skyLightMaxY; y++) {
      if (!this.isSolidBlock(bx, y, bz)) continue
      firstCoverY = y
      break
    }

    if (firstCoverY == null) return 1

    const roofDistance = firstCoverY - sampleY
    if (roofDistance <= 0) return 0.08

    return THREE.MathUtils.clamp(roofDistance / 12, 0.08, 1)
  }

  setBlock(x, y, z, type) {
    const { cx, cy, cz, lx, ly, lz } = this.worldToChunk(x, y, z)
    const chunk = this.getChunk(cx, cy, cz)
    if (!chunk) return false

    const changed = setChunkBlock(chunk, lx, ly, lz, type)
    if (!changed) return false

    this.markChunkAndNeighborsDirty(Math.floor(x), Math.floor(y), Math.floor(z))
    return true
  }

  update(deltaTime, player) {
    this.updateLoadedChunksAroundPlayer(player)
    this.updateRegeneration(deltaTime, player)
    this.rebuildDirtyChunks()
  }

  updateLoadedChunksAroundPlayer(player) {
    if (!player?.position) return

    const centerCx = Math.floor(player.position.x / CHUNK_SIZE)
    const centerCy = 0
    const centerCz = Math.floor(player.position.z / CHUNK_SIZE)

    for (let cz = centerCz - this.loadedRadius; cz <= centerCz + this.loadedRadius; cz++) {
      for (let cy = centerCy - 1; cy <= centerCy + 1; cy++) {
        for (let cx = centerCx - this.loadedRadius; cx <= centerCx + this.loadedRadius; cx++) {
          const worldX = cx * CHUNK_SIZE
          const worldZ = cz * CHUNK_SIZE

          if (
            worldX < -this.worldHalfSize ||
            worldX >= this.worldHalfSize ||
            worldZ < -this.worldHalfSize ||
            worldZ >= this.worldHalfSize
          ) {
            continue
          }

          this.ensureChunk(cx, cy, cz)
        }
      }
    }

    this.unloadFarChunks(centerCx, centerCy, centerCz)
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

  unloadFarChunks(centerCx, centerCy, centerCz) {
    for (const chunk of this.chunks.values()) {
      const dx = Math.abs(chunk.cx - centerCx)
      const dy = Math.abs(chunk.cy - centerCy)
      const dz = Math.abs(chunk.cz - centerCz)

      const outsideLoadedBand =
        dx > this.unloadRadius ||
        dy > 2 ||
        dz > this.unloadRadius

      const outsideWorldBounds =
        chunk.cx * CHUNK_SIZE < -this.worldHalfSize ||
        chunk.cx * CHUNK_SIZE >= this.worldHalfSize ||
        chunk.cz * CHUNK_SIZE < -this.worldHalfSize ||
        chunk.cz * CHUNK_SIZE >= this.worldHalfSize

      if (!outsideLoadedBand && !outsideWorldBounds) continue

      disposeChunkMesh(chunk)
      this.chunks.delete(chunk.key)
    }
  }

  breakBlock(faceIdxOrBx, bxOrBy, byOrBz, bz) {
    // Accept either (bx, by, bz) or (faceIdx, bx, by, bz) — faceIdx is ignored here.
    let bx, by
    if (bz !== undefined) { bx = bxOrBy;  by = byOrBz }
    else                  { bx = faceIdxOrBx; by = bxOrBy; bz = byOrBz }
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
      const restoreAt =
        performance.now() * 0.001 +
        getBlockRegenDelay(blockId) +
        Math.random() * this.regenSpawnJitter

      queueChunkRegen(chunk, {
        bx,
        by,
        bz,
        restoreAt,
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
    let restoredThisFrame = 0

    for (const chunk of this.chunks.values()) {
      if (restoredThisFrame >= this.maxRegensPerFrame) break

      for (let i = chunk.regenQueue.length - 1; i >= 0; i--) {
        if (restoredThisFrame >= this.maxRegensPerFrame) break

        const record = chunk.regenQueue[i]
        if (now < record.restoreAt) continue

        if (
          this.isBlockOccupied(record.bx, record.by, record.bz, player) ||
          this.isPlayerNearBlock(
            record.bx,
            record.by,
            record.bz,
            player,
            this.regenPlayerBlockRadius,
          )
        ) {
          record.restoreAt =
            now +
            this.regenRetryDelay +
            Math.random() * this.regenRetryJitter
          continue
        }

        if (this.restoreBlock(record.bx, record.by, record.bz)) {
          restoredThisFrame++
        }

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

  isPlayerNearBlock(bx, by, bz, player, radius = 10) {
    if (!player?.position) return false

    const centerX = bx + 0.5
    const centerY = by + 0.5
    const centerZ = bz + 0.5

    const dx = player.position.x - centerX
    const dy = player.position.y - centerY
    const dz = player.position.z - centerZ

    return (dx * dx + dy * dy + dz * dz) <= radius * radius
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
    let rebuiltCount = 0

    for (const chunk of this.chunks.values()) {
      if (!isChunkDirty(chunk)) continue
      if (rebuiltCount >= this.maxChunkRebuildsPerFrame) break

      disposeChunkMesh(chunk)

      const mesh = buildChunkMesh(chunk, this, this.material)
      setChunkMesh(chunk, mesh)
      this.group.add(mesh)

      clearChunkDirty(chunk)
      rebuiltCount++
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

  traceRayAllHits(origin, dir, maxDist = 6) {
    const hits = []

    let x = Math.floor(origin.x)
    let y = Math.floor(origin.y)
    let z = Math.floor(origin.z)

    const stepX = Math.sign(dir.x)
    const stepY = Math.sign(dir.y)
    const stepZ = Math.sign(dir.z)

    const tDeltaX = Math.abs(1 / (dir.x || 0.00001))
    const tDeltaY = Math.abs(1 / (dir.y || 0.00001))
    const tDeltaZ = Math.abs(1 / (dir.z || 0.00001))

    const frac0 = (v) => v - Math.floor(v)
    const frac1 = (v) => 1 - frac0(v)

    let tMaxX = stepX > 0 ? frac1(origin.x) * tDeltaX : frac0(origin.x) * tDeltaX
    let tMaxY = stepY > 0 ? frac1(origin.y) * tDeltaY : frac0(origin.y) * tDeltaY
    let tMaxZ = stepZ > 0 ? frac1(origin.z) * tDeltaZ : frac0(origin.z) * tDeltaZ

    if (dir.x === 0) tMaxX = Infinity
    if (dir.y === 0) tMaxY = Infinity
    if (dir.z === 0) tMaxZ = Infinity

    let dist = 0
    const seen = new Set()

    while (dist <= maxDist) {
      if (this.isSolidBlock(x, y, z)) {
        const key = `${x},${y},${z}`

        if (!seen.has(key)) {
          seen.add(key)
          hits.push({
            bx: x,
            by: y,
            bz: z,
            blockId: this.getBlockId(x, y, z),
            distance: dist,
          })
        }
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX
          dist = tMaxX
          tMaxX += tDeltaX
        } else {
          z += stepZ
          dist = tMaxZ
          tMaxZ += tDeltaZ
        }
      } else if (tMaxY < tMaxZ) {
        y += stepY
        dist = tMaxY
        tMaxY += tDeltaY
      } else {
        z += stepZ
        dist = tMaxZ
        tMaxZ += tDeltaZ
      }
    }

    return hits
  }
}
