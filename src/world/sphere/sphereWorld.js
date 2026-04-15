import * as THREE from 'three'
import {
  BLOCK,
  doesBlockRegenerate,
  getBlockRegenDelay,
  isDestructibleBlockId,
  isSolidBlockId,
} from '../blocks.js'
import { CHUNK_SIZE, floorDiv } from '../worldMath.js'
import {
  createChunk,
  fillChunkFromGenerator,
  disposeChunkMesh,
  getChunkBlock,
  getChunkOriginalBlock,
  setChunkBlock,
  setChunkMesh,
  markChunkDirty,
  clearChunkDirty,
  isChunkDirty,
  queueChunkRegen,
  removeChunkRegenAt,
  setChunkStorageMode,
} from '../chunk.js'
import {
  SPHERE_RADIUS,
  LAYER_SCALE,
  SHELL_DEPTH,
  TERRAIN_MIN_BZ,
  NUM_FACES,
  blockToWorld,
  worldToBlock,
  getRadialUp,
  getGravityDir,
  getLocalFrame,
  wrapBlockCoords,
} from './cubeSphereCoords.js'
import {
  FACE_CHUNKS,
  DEP_CHUNKS,
  TERRAIN_MIN_CHUNK,
  blockToFaceChunk,
  blockToFaceLocal,
  getFaceChunkKey,
} from './cubeSphereChunkMath.js'
import { getColumnProfile, SPHERE_PRESET } from './spherePresets.js'
import { buildSphereChunkMesh, createSphereBlockMaterial } from './sphereMesher.js'
import { buildSurfaceTileMesh, getSurfaceTileKey } from './surfaceTileMesher.js'

export class SphereWorld {
  constructor(scene) {
    this.scene = scene

    this.group = new THREE.Group()
    this.group.name = 'SphereWorld'
    this.scene.add(this.group)

    this.chunks = new Map()
    this.surfaceTiles = new Map()
    this.pendingSurfaceLoads = []
    this.pendingPromotionLoads = []
    this.pendingChunkLoadMap = new Map()
    this.surfaceGlobeQueued = false
    this.material = createSphereBlockMaterial()

    this.loadWholeGlobe = true
    this.loadRadiusWorld = 400
    this.unloadRadiusWorld = 460
    this.fullSolidRadiusWorld = 100
    this.maxChunkLoadsPerFrame = 4
    this.maxSurfaceTileLoadsPerFrame = 24
    this.maxChunkRebuildsPerFrame = 8
    this.maxRegensPerFrame = 8
    this.regenRetryDelay = 1.0
    this.regenRetryJitter = 0.5
    this.regenSpawnJitter = 1.25
    this.regenPlayerBlockRadius = 10
    this.navDirty = false
    this.navRebuildCooldown = 0
    this.regenEnabled = false
  }

  getBlockId(faceIdx, bx, by, bz) {
    if (bz === undefined) {
      const worldPos = new THREE.Vector3(faceIdx, bx, by)
      const blockPos = worldToBlock(worldPos)
      return this.getBlockId(blockPos.faceIdx, blockPos.bx, blockPos.by, blockPos.bz)
    }

    if (!this.isSupportedBz(bz)) return BLOCK.AIR

    const { faceIdx: wFace, bx: wBx, by: wBy } = wrapBlockCoords(faceIdx, bx, by)
    if (wBx < 0 || wBx >= FACE_CHUNKS * CHUNK_SIZE) return BLOCK.AIR
    if (wBy < 0 || wBy >= FACE_CHUNKS * CHUNK_SIZE) return BLOCK.AIR

    const { cx, cy, cdep } = blockToFaceChunk(wFace, wBx, wBy, bz)
    const chunk = this.getChunk(wFace, cx, cy, cdep)
    if (!chunk) {
      if (bz >= TERRAIN_MIN_BZ && bz < SHELL_DEPTH) {
        return SPHERE_PRESET.getBlockId(wFace, wBx, wBy, bz)
      }
      return BLOCK.AIR
    }

    const { lx, ly, lz } = blockToFaceLocal(wBx, wBy, bz)
    return getChunkBlock(chunk, lx, ly, lz)
  }

  getLocalBlock(chunk, lx, ly, lz) {
    return getChunkBlock(chunk, lx, ly, lz)
  }

  isSolidBlock(faceIdx, bx, by, bz) {
    if (bz === undefined) {
      return isSolidBlockId(this.getBlockId(faceIdx, bx, by))
    }
    return isSolidBlockId(this.getBlockId(faceIdx, bx, by, bz))
  }

  isSolid(x, y, z) {
    const { faceIdx, bx, by, bz } = worldToBlock(new THREE.Vector3(x, y, z))
    return isSolidBlockId(this.getBlockId(faceIdx, bx, by, bz))
  }

  getRadialUp(worldPos) {
    return getRadialUp(worldPos)
  }

  getGravityDir(worldPos) {
    return getGravityDir(worldPos)
  }

  worldToBlock(worldPos) {
    return worldToBlock(worldPos)
  }

  blockToWorld(faceIdx, bx, by, bz) {
    const wrapped = wrapBlockCoords(faceIdx, bx, by)
    return blockToWorld(wrapped.faceIdx, wrapped.bx, wrapped.by, bz)
  }

  getLocalFrame(worldPos) {
    return getLocalFrame(worldPos)
  }

  getSurfaceRadiusAt(worldPos) {
    const r0 = worldPos.length()
    const startBz = Math.max(TERRAIN_MIN_BZ, Math.floor((SPHERE_RADIUS - r0) / LAYER_SCALE) - 2)
    const { faceIdx, bx, by } = worldToBlock(worldPos)

    for (let bz = startBz; bz < SHELL_DEPTH; bz++) {
      if (this.isSolidBlock(faceIdx, bx, by, bz)) {
        return SPHERE_RADIUS - bz * LAYER_SCALE
      }
    }
    return SPHERE_RADIUS
  }

  getSkyLightAt(faceIdx, bx, by, bz) {
    const sampleBz = Math.floor(bz)
    if (sampleBz <= 0) return 1

    let firstClearBz = null
    for (let z = sampleBz - 1; z >= 0; z--) {
      if (!this.isSolidBlock(faceIdx, bx, by, z)) {
        firstClearBz = z
        break
      }
    }

    if (firstClearBz === null) return 0.08
    const openDist = sampleBz - firstClearBz
    if (openDist <= 0) return 1
    return THREE.MathUtils.clamp(openDist / 8, 0.08, 1)
  }

  ensureChunk(faceIdx, cx, cy, cdep, generationMode = 'surface') {
    if (cx < 0 || cx >= FACE_CHUNKS) return null
    if (cy < 0 || cy >= FACE_CHUNKS) return null
    if (!this.isSupportedChunkDepth(cdep)) return null

    const key = getFaceChunkKey(faceIdx, cx, cy, cdep)
    let chunk = this.chunks.get(key)
    const targetStorageMode = generationMode === 'full' ? 'dense' : 'sparse'
    if (chunk) {
      if (chunk.generationMode === 'full' && generationMode === 'surface') return chunk
      if (chunk.generationMode === generationMode && chunk.storageMode === targetStorageMode) return chunk

      setChunkStorageMode(
        chunk,
        targetStorageMode,
        (bx, by, bz) => this.getGeneratedBlockId(faceIdx, bx, by, bz, generationMode),
      )
      chunk.generationMode = generationMode
      return chunk
    }

    chunk = createChunk(cx, cy, cdep, targetStorageMode)
    chunk.faceIdx = faceIdx
    chunk.generationMode = generationMode

    fillChunkFromGenerator(
      chunk,
      (bx, by, bz) => this.getGeneratedBlockId(faceIdx, bx, by, bz, generationMode),
    )

    this.chunks.set(key, chunk)
    return chunk
  }

  getChunk(faceIdx, cx, cy, cdep) {
    return this.chunks.get(getFaceChunkKey(faceIdx, cx, cy, cdep)) ?? null
  }

  update(deltaTime, player) {
    this.updateLoadedChunksAroundPlayer(player)
    this.processPendingChunkLoads()
    this.updateRegeneration(deltaTime, player)
    this.rebuildDirtyChunks()
  }

  async generateAllChunks(onProgress) {
    const total = NUM_FACES * FACE_CHUNKS * FACE_CHUNKS
    let done = 0
    const batch = 32

    for (let f = 0; f < NUM_FACES; f++) {
      for (let cx = 0; cx < FACE_CHUNKS; cx++) {
        for (let cy = 0; cy < FACE_CHUNKS; cy++) {
          this.ensureSurfaceTile(f, cx, cy)
          done++
          if (done % batch === 0) {
            onProgress?.(done / total)
            await new Promise((resolve) => setTimeout(resolve, 0))
          }
        }
      }
    }

    onProgress?.(1)
  }

  async rebuildAllDirtyChunks(onProgress) {
    const dirtyList = [...this.chunks.values()].filter((chunk) => isChunkDirty(chunk))
    const total = dirtyList.length
    if (total === 0) {
      onProgress?.(1)
      return
    }

    const batch = 48
    let done = 0

    for (const chunk of dirtyList) {
      if (!isChunkDirty(chunk)) continue
      disposeChunkMesh(chunk)
      const mesh = buildSphereChunkMesh(chunk, this, this.material)
      if (mesh) {
        setChunkMesh(chunk, mesh)
        this.group.add(mesh)
      }
      clearChunkDirty(chunk)
      done++
      if (done % batch === 0) {
        onProgress?.(done / total)
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }

    onProgress?.(1)
  }

  updateLoadedChunksAroundPlayer(player) {
    if (!player?.position) return

    const depths = this.getChunkDepths()

    if (this.loadWholeGlobe) {
      if (!this.surfaceGlobeQueued) {
        const surfaceRecords = []
        for (let faceIdx = 0; faceIdx < NUM_FACES; faceIdx++) {
          for (let cx = 0; cx < FACE_CHUNKS; cx++) {
            for (let cy = 0; cy < FACE_CHUNKS; cy++) {
              const centerBx = cx * CHUNK_SIZE + Math.floor(CHUNK_SIZE * 0.5)
              const centerBy = cy * CHUNK_SIZE + Math.floor(CHUNK_SIZE * 0.5)
              const chunkCenter = blockToWorld(faceIdx, centerBx, centerBy, 0)
              surfaceRecords.push({
                faceIdx,
                cx,
                cy,
                distanceSq: chunkCenter.distanceToSquared(player.position),
              })
            }
          }
        }

        surfaceRecords.sort((a, b) => a.distanceSq - b.distanceSq)
        for (const record of surfaceRecords) {
          this.queueSurfaceTileLoad(record.faceIdx, record.cx, record.cy, player.position, record.distanceSq)
        }
        this.surfaceGlobeQueued = true
      }
    } else {
      for (let faceIdx = 0; faceIdx < NUM_FACES; faceIdx++) {
        for (let cx = 0; cx < FACE_CHUNKS; cx++) {
          for (let cy = 0; cy < FACE_CHUNKS; cy++) {
            if (!this.isSurfaceChunkWithinRadius(player.position, faceIdx, cx, cy, this.loadRadiusWorld)) {
              continue
            }

            this.queueSurfaceTileLoad(faceIdx, cx, cy, player.position)
          }
        }
      }

      this.unloadFarChunks(player.position)
    }

    for (let faceIdx = 0; faceIdx < NUM_FACES; faceIdx++) {
      for (let cx = 0; cx < FACE_CHUNKS; cx++) {
        for (let cy = 0; cy < FACE_CHUNKS; cy++) {
          if (!this.isSurfaceChunkWithinRadius(player.position, faceIdx, cx, cy, this.fullSolidRadiusWorld)) {
            continue
          }

          for (const cdep of depths) {
            this.queueChunkLoad(faceIdx, cx, cy, cdep, player.position, 'full')
          }
        }
      }
    }
  }

  unloadFarChunks(playerPosition) {
    if (this.loadWholeGlobe) return

    for (const [key, chunk] of this.chunks) {
      if (!this.isSurfaceChunkWithinRadius(playerPosition, chunk.faceIdx, chunk.cx, chunk.cy, this.unloadRadiusWorld)) {
        disposeChunkMesh(chunk)
        this.chunks.delete(key)
      }
    }

    for (let i = this.pendingSurfaceLoads.length - 1; i >= 0; i--) {
      const pending = this.pendingSurfaceLoads[i]
      if (this.isSurfaceChunkWithinRadius(playerPosition, pending.faceIdx, pending.cx, pending.cy, this.unloadRadiusWorld)) {
        continue
      }

      this.pendingChunkLoadMap.delete(pending.key)
      this.pendingSurfaceLoads.splice(i, 1)
    }
  }

  isSurfaceChunkWithinRadius(playerPosition, faceIdx, cx, cy, radius) {
    const centerBx = cx * CHUNK_SIZE + Math.floor(CHUNK_SIZE * 0.5)
    const centerBy = cy * CHUNK_SIZE + Math.floor(CHUNK_SIZE * 0.5)
    const chunkCenter = blockToWorld(faceIdx, centerBx, centerBy, 0)
    const distance = chunkCenter.distanceTo(playerPosition)
    return distance <= radius
  }

  queueSurfaceTileLoad(faceIdx, cx, cy, playerPosition, knownDistanceSq = null) {
    const key = `surface:${getSurfaceTileKey(faceIdx, cx, cy)}`
    if (this.surfaceTiles.has(key)) return

    const pending = this.pendingChunkLoadMap.get(key)
    if (pending) return

    let distanceSq = knownDistanceSq
    if (distanceSq == null) {
      const centerBx = cx * CHUNK_SIZE + Math.floor(CHUNK_SIZE * 0.5)
      const centerBy = cy * CHUNK_SIZE + Math.floor(CHUNK_SIZE * 0.5)
      const chunkCenter = blockToWorld(faceIdx, centerBx, centerBy, 0)
      distanceSq = chunkCenter.distanceToSquared(playerPosition)
    }

    const record = { faceIdx, cx, cy, key, distanceSq, queueType: 'surfaceTile' }
    this.pendingSurfaceLoads.push(record)
    this.pendingChunkLoadMap.set(key, record)
  }

  queueChunkLoad(faceIdx, cx, cy, cdep, playerPosition, generationMode) {
    const key = getFaceChunkKey(faceIdx, cx, cy, cdep)
    const existing = this.chunks.get(key)
    if (existing) {
      if (existing.generationMode === 'full') return
      if (existing.generationMode === generationMode) return
    }

    const pending = this.pendingChunkLoadMap.get(key)
    if (pending) {
      if (generationMode === 'full' && pending.generationMode !== 'full') {
        pending.generationMode = 'full'
        pending.queueType = 'promotion'
        this.pendingPromotionLoads.push(pending)
      }
      return
    }

    const centerBx = cx * CHUNK_SIZE + Math.floor(CHUNK_SIZE * 0.5)
    const centerBy = cy * CHUNK_SIZE + Math.floor(CHUNK_SIZE * 0.5)
    const chunkCenter = blockToWorld(faceIdx, centerBx, centerBy, 0)
    const distanceSq = chunkCenter.distanceToSquared(playerPosition)

    const record = { faceIdx, cx, cy, cdep, key, distanceSq, generationMode, queueType: 'promotion' }
    this.pendingPromotionLoads.push(record)
    this.pendingChunkLoadMap.set(key, record)
  }

  processPendingChunkLoads() {
    if (this.pendingPromotionLoads.length === 0 && this.pendingSurfaceLoads.length === 0) return

    let promotionLoads = 0
    while (promotionLoads < this.maxChunkLoadsPerFrame) {
      let next = null

      while (this.pendingPromotionLoads.length > 0 && !next) {
        const candidate = this.pendingPromotionLoads.shift()
        if (this.pendingChunkLoadMap.get(candidate.key) !== candidate) continue
        next = candidate
      }

      if (!next) break

      this.pendingChunkLoadMap.delete(next.key)
      this.ensureChunk(next.faceIdx, next.cx, next.cy, next.cdep, next.generationMode)
      promotionLoads++
    }

    let surfaceLoads = 0
    while (surfaceLoads < this.maxSurfaceTileLoadsPerFrame) {
      let next = null
      while (this.pendingSurfaceLoads.length > 0 && !next) {
        const candidate = this.pendingSurfaceLoads.shift()
        if (this.pendingChunkLoadMap.get(candidate.key) !== candidate) continue
        if (candidate.queueType !== 'surfaceTile') continue
        next = candidate
      }

      if (!next) break

      this.pendingChunkLoadMap.delete(next.key)
      this.ensureSurfaceTile(next.faceIdx, next.cx, next.cy)
      surfaceLoads++
    }
  }

  ensureSurfaceTile(faceIdx, cx, cy) {
    const key = `surface:${getSurfaceTileKey(faceIdx, cx, cy)}`
    if (this.surfaceTiles.has(key)) return this.surfaceTiles.get(key)

    const mesh = buildSurfaceTileMesh(faceIdx, cx, cy, this.material)
    const tile = { faceIdx, cx, cy, key, mesh, hiddenByFullChunks: 0 }
    if (mesh) this.group.add(mesh)
    this.surfaceTiles.set(key, tile)
    return tile
  }

  rebuildDirtyChunks() {
    let rebuilt = 0

    for (const chunk of this.chunks.values()) {
      if (!isChunkDirty(chunk)) continue
      if (rebuilt >= this.maxChunkRebuildsPerFrame) break

      const previousMesh = chunk.mesh
      const mesh = buildSphereChunkMesh(chunk, this, this.material)
      if (mesh) {
        setChunkMesh(chunk, mesh)
        this.group.add(mesh)
        if (previousMesh) {
          if (previousMesh.parent) previousMesh.parent.remove(previousMesh)
          previousMesh.traverse((child) => {
            child.geometry?.dispose?.()
            if (child === previousMesh) return
            if (Array.isArray(child.material)) {
              for (const material of child.material) material?.dispose?.()
            } else {
              child.material?.dispose?.()
            }
          })
        }
        if (chunk.generationMode === 'full') {
          this.hideSurfaceTile(chunk.faceIdx, chunk.cx, chunk.cy)
        }
      } else if (previousMesh) {
        setChunkMesh(chunk, previousMesh)
      }
      clearChunkDirty(chunk)
      rebuilt++
    }
  }

  setBlock(faceIdx, bx, by, bz, blockId) {
    if (blockId === undefined) {
      const worldPos = new THREE.Vector3(faceIdx, bx, by)
      const blockPos = worldToBlock(worldPos)
      return this.setBlock(blockPos.faceIdx, blockPos.bx, blockPos.by, blockPos.bz, bz)
    }

    if (!this.isSupportedBz(bz)) return false

    const { faceIdx: wFace, bx: wBx, by: wBy } = wrapBlockCoords(faceIdx, bx, by)
    const { cx, cy, cdep } = blockToFaceChunk(wFace, wBx, wBy, bz)
    const chunk = this.ensureChunk(wFace, cx, cy, cdep, 'full')
    if (!chunk) return false

    const { lx, ly, lz } = blockToFaceLocal(wBx, wBy, bz)
    const changed = setChunkBlock(chunk, lx, ly, lz, blockId)
    if (!changed) return false

    this.markChunkAndNeighborsDirty(wFace, wBx, wBy, bz)
    return true
  }

  breakBlock(faceIdx, bx, by, bz) {
    if (bz === undefined) {
      const worldPos = new THREE.Vector3(faceIdx, bx, by)
      const blockPos = worldToBlock(worldPos)
      return this.breakBlock(blockPos.faceIdx, blockPos.bx, blockPos.by, blockPos.bz)
    }

    if (!this.isSupportedBz(bz)) return false

    const { faceIdx: wFace, bx: wBx, by: wBy } = wrapBlockCoords(faceIdx, bx, by)
    const { cx, cy, cdep } = blockToFaceChunk(wFace, wBx, wBy, bz)
    const chunk = this.ensureChunk(wFace, cx, cy, cdep, 'full')
    if (!chunk) return false

    const { lx, ly, lz } = blockToFaceLocal(wBx, wBy, bz)
    const blockId = getChunkBlock(chunk, lx, ly, lz)
    if (blockId === BLOCK.AIR || !isDestructibleBlockId(blockId)) return false

    const changed = setChunkBlock(chunk, lx, ly, lz, BLOCK.AIR)
    if (!changed) return false

    this.markChunkAndNeighborsDirty(wFace, wBx, wBy, bz)
    this.markNavDirty()

    if (this.regenEnabled && doesBlockRegenerate(blockId)) {
      const restoreAt =
        performance.now() * 0.001 +
        getBlockRegenDelay(blockId) +
        Math.random() * this.regenSpawnJitter
      queueChunkRegen(chunk, { faceIdx: wFace, bx: wBx, by: wBy, bz, restoreAt })
    }

    return true
  }

  restoreBlock(faceIdx, bx, by, bz) {
    if (bz === undefined) {
      const worldPos = new THREE.Vector3(faceIdx, bx, by)
      const blockPos = worldToBlock(worldPos)
      return this.restoreBlock(blockPos.faceIdx, blockPos.bx, blockPos.by, blockPos.bz)
    }

    if (!this.isSupportedBz(bz)) return false

    const { faceIdx: wFace, bx: wBx, by: wBy } = wrapBlockCoords(faceIdx, bx, by)
    const { cx, cy, cdep } = blockToFaceChunk(wFace, wBx, wBy, bz)
    const chunk = this.ensureChunk(wFace, cx, cy, cdep, 'full')
    if (!chunk) return false

    const { lx, ly, lz } = blockToFaceLocal(wBx, wBy, bz)
    const originalId = getChunkOriginalBlock(chunk, lx, ly, lz)
    if (originalId === BLOCK.AIR) return false

    const changed = setChunkBlock(chunk, lx, ly, lz, originalId)
    if (!changed) return false

    this.markChunkAndNeighborsDirty(wFace, wBx, wBy, bz)
    return true
  }

  updateRegeneration(_deltaTime, player) {
    const now = performance.now() * 0.001
    let restored = 0

    for (const chunk of this.chunks.values()) {
      if (restored >= this.maxRegensPerFrame) break

      for (let i = chunk.regenQueue.length - 1; i >= 0; i--) {
        if (restored >= this.maxRegensPerFrame) break
        const rec = chunk.regenQueue[i]
        if (now < rec.restoreAt) continue

        if (this.isPlayerNearBlock(rec.faceIdx, rec.bx, rec.by, rec.bz, player, this.regenPlayerBlockRadius)) {
          rec.restoreAt = now + this.regenRetryDelay + Math.random() * this.regenRetryJitter
          continue
        }

        if (this.restoreBlock(rec.faceIdx, rec.bx, rec.by, rec.bz)) restored++
        removeChunkRegenAt(chunk, i)
      }
    }
  }

  isPlayerNearBlock(faceIdx, bx, by, bz, player, radius = 10) {
    if (!player?.position) return false
    const blockWorldPos = blockToWorld(faceIdx, bx, by, bz)
    const dx = player.position.x - blockWorldPos.x
    const dy = player.position.y - blockWorldPos.y
    const dz = player.position.z - blockWorldPos.z
    return (dx * dx + dy * dy + dz * dz) <= radius * radius * 16
  }

  markChunkDirtyAt(faceIdx, cx, cy, cdep) {
    const chunk = this.getChunk(faceIdx, cx, cy, cdep)
    if (!chunk) return
    markChunkDirty(chunk)
  }

  markChunkAndNeighborsDirty(faceIdx, bx, by, bz) {
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
      const targetBz = bz + oz
      if (!this.isSupportedBz(targetBz)) continue

      const { faceIdx: wFace, bx: wBx, by: wBy } = wrapBlockCoords(faceIdx, bx + ox, by + oy)
      const { cx, cy, cdep } = blockToFaceChunk(wFace, wBx, wBy, targetBz)
      if (!this.isSupportedChunkDepth(cdep)) continue

      const key = getFaceChunkKey(wFace, cx, cy, cdep)
      if (touched.has(key)) continue
      touched.add(key)
      this.markChunkDirtyAt(wFace, cx, cy, cdep)
    }
  }

  markNavDirty() {
    this.navDirty = true
    this.navRebuildCooldown = 0.15
  }

  traceRayAllHits(origin, dir, maxDist = 6) {
    const hits = []
    const seen = new Set()
    const step = 0.4
    const normDir = dir.clone().normalize()

    for (let t = 0; t <= maxDist; t += step) {
      const pos = new THREE.Vector3(
        origin.x + normDir.x * t,
        origin.y + normDir.y * t,
        origin.z + normDir.z * t,
      )
      const { faceIdx, bx, by, bz } = worldToBlock(pos)
      const blockId = this.getBlockId(faceIdx, bx, by, bz)
      if (!isSolidBlockId(blockId)) continue

      const key = `${faceIdx},${bx},${by},${bz}`
      if (seen.has(key)) continue
      seen.add(key)

      hits.push({ faceIdx, bx, by, bz, blockId, distance: t })
    }

    return hits
  }

  dispose() {
    for (const chunk of this.chunks.values()) {
      disposeChunkMesh(chunk)
    }
    this.chunks.clear()

    for (const tile of this.surfaceTiles.values()) {
      tile.mesh?.removeFromParent?.()
      tile.mesh?.traverse?.((child) => {
        child.geometry?.dispose?.()
        if (child === tile.mesh) return
        if (Array.isArray(child.material)) {
          for (const material of child.material) material?.dispose?.()
        } else {
          child.material?.dispose?.()
        }
      })
    }
    this.surfaceTiles.clear()

    if (this.group.parent) {
      this.group.parent.remove(this.group)
    }

    this.material?.dispose?.()
  }

  isSupportedBz(bz) {
    return bz >= TERRAIN_MIN_BZ && bz < SHELL_DEPTH
  }

  isSupportedChunkDepth(cdep) {
    return cdep >= TERRAIN_MIN_CHUNK && cdep < DEP_CHUNKS
  }

  getChunkDepths() {
    const depths = []
    for (let cdep = TERRAIN_MIN_CHUNK; cdep < DEP_CHUNKS; cdep++) {
      depths.push(cdep)
    }
    return depths
  }

  getGeneratedBlockId(faceIdx, bx, by, bz, generationMode = 'full') {
    if (bz >= TERRAIN_MIN_BZ && bz < SHELL_DEPTH) {
      const blockId = SPHERE_PRESET.getBlockId(faceIdx, bx, by, bz)
      if (generationMode === 'full' || blockId === BLOCK.AIR) return blockId
      return this.isTerrainBlockExposed(faceIdx, bx, by, bz) ? blockId : BLOCK.AIR
    }
    return BLOCK.AIR
  }

  isTerrainBlockExposed(faceIdx, bx, by, bz) {
    const profile = getColumnProfile(faceIdx, bx, by)
    if (profile.landMask <= 0.33) return bz === 0
    if (bz < profile.topBz || bz > 0) return false

    if (bz === profile.topBz || bz === 0) return true

    const lateralOffsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]

    for (const [ox, oy] of lateralOffsets) {
      const wrapped = wrapBlockCoords(faceIdx, bx + ox, by + oy)
      const neighborProfile = getColumnProfile(wrapped.faceIdx, wrapped.bx, wrapped.by)
      const neighborHasSolidAtBz =
        bz >= neighborProfile.topBz &&
        bz <= 0 &&
        (neighborProfile.landMask > 0.33 || bz === 0)

      if (!neighborHasSolidAtBz) return true
    }

    return false
  }

  hash01(...values) {
    let hash = 2166136261
    for (const value of values) {
      hash ^= (value | 0)
      hash = Math.imul(hash, 16777619)
    }
    return ((hash >>> 0) % 1000000) / 1000000
  }

  hideSurfaceTile(faceIdx, cx, cy) {
    const key = `surface:${getSurfaceTileKey(faceIdx, cx, cy)}`
    const tile = this.surfaceTiles.get(key)
    if (!tile) return
    tile.hiddenByFullChunks++
    if (tile.mesh) tile.mesh.visible = false
  }
}
