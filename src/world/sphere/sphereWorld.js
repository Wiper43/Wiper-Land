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
} from '../chunk.js'
import {
  SPHERE_RADIUS,
  LAYER_SCALE,
  SHELL_DEPTH,
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
  blockToFaceChunk,
  blockToFaceLocal,
  getFaceChunkKey,
} from './cubeSphereChunkMath.js'
import { SPHERE_PRESET } from './spherePresets.js'
import { buildSphereChunkMesh, createSphereBlockMaterial } from './sphereMesher.js'

const CLOUD_BZ_MIN = -60
const CLOUD_BZ_MAX = -40
const CLOUD_CDEP_MIN = floorDiv(CLOUD_BZ_MIN, CHUNK_SIZE)
const CLOUD_CDEP_MAX = floorDiv(CLOUD_BZ_MAX, CHUNK_SIZE)

export class SphereWorld {
  constructor(scene) {
    this.scene = scene

    this.group = new THREE.Group()
    this.group.name = 'SphereWorld'
    this.scene.add(this.group)

    this.chunks = new Map()
    this.material = createSphereBlockMaterial()

    this.loadWholeGlobe = true
    this.loadedRadius = 8
    this.unloadRadius = this.loadedRadius + 2
    this.maxChunkRebuildsPerFrame = 64
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
    if (!chunk) return BLOCK.AIR

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

  getLocalFrame(worldPos) {
    return getLocalFrame(worldPos)
  }

  getSurfaceRadiusAt(worldPos) {
    const r0 = worldPos.length()
    const startBz = Math.max(0, Math.floor((SPHERE_RADIUS - r0) / LAYER_SCALE) - 2)
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

  ensureChunk(faceIdx, cx, cy, cdep) {
    if (cx < 0 || cx >= FACE_CHUNKS) return null
    if (cy < 0 || cy >= FACE_CHUNKS) return null
    if (!this.isSupportedChunkDepth(cdep)) return null

    const key = getFaceChunkKey(faceIdx, cx, cy, cdep)
    let chunk = this.chunks.get(key)
    if (chunk) return chunk

    chunk = createChunk(cx, cy, cdep)
    chunk.faceIdx = faceIdx

    fillChunkFromGenerator(chunk, (bx, by, bz) => this.getGeneratedBlockId(faceIdx, bx, by, bz))

    this.chunks.set(key, chunk)
    return chunk
  }

  getChunk(faceIdx, cx, cy, cdep) {
    return this.chunks.get(getFaceChunkKey(faceIdx, cx, cy, cdep)) ?? null
  }

  update(deltaTime, player) {
    this.updateLoadedChunksAroundPlayer(player)
    this.updateRegeneration(deltaTime, player)
    this.rebuildDirtyChunks()
  }

  async generateAllChunks(onProgress) {
    const depths = this.getChunkDepths()
    const total = NUM_FACES * FACE_CHUNKS * FACE_CHUNKS * depths.length
    let done = 0
    const batch = 32

    for (let f = 0; f < NUM_FACES; f++) {
      for (let cx = 0; cx < FACE_CHUNKS; cx++) {
        for (let cy = 0; cy < FACE_CHUNKS; cy++) {
          for (const cdep of depths) {
            this.ensureChunk(f, cx, cy, cdep)
            done++
            if (done % batch === 0) {
              onProgress?.(done / total)
              await new Promise((resolve) => setTimeout(resolve, 0))
            }
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
      for (let faceIdx = 0; faceIdx < NUM_FACES; faceIdx++) {
        for (let cx = 0; cx < FACE_CHUNKS; cx++) {
          for (let cy = 0; cy < FACE_CHUNKS; cy++) {
            for (const cdep of depths) {
              this.ensureChunk(faceIdx, cx, cy, cdep)
            }
          }
        }
      }
      return
    }

    const { faceIdx, bx, by } = worldToBlock(player.position)
    const { cx: centerCx, cy: centerCy } = blockToFaceChunk(faceIdx, bx, by, 0)
    const radius = this.loadedRadius

    for (let dcx = -radius; dcx <= radius; dcx++) {
      for (let dcy = -radius; dcy <= radius; dcy++) {
        const rawCx = centerCx + dcx
        const rawCy = centerCy + dcy

        let targetFace = faceIdx
        let tcx = rawCx
        let tcy = rawCy

        if (rawCx < 0 || rawCx >= FACE_CHUNKS || rawCy < 0 || rawCy >= FACE_CHUNKS) {
          const originBx = rawCx * CHUNK_SIZE
          const originBy = rawCy * CHUNK_SIZE
          const wrapped = wrapBlockCoords(faceIdx, originBx, originBy)
          const fc = blockToFaceChunk(wrapped.faceIdx, wrapped.bx, wrapped.by, 0)
          targetFace = wrapped.faceIdx
          tcx = fc.cx
          tcy = fc.cy
        }

        for (const cdep of depths) {
          this.ensureChunk(targetFace, tcx, tcy, cdep)
        }
      }
    }

    this.unloadFarChunks(faceIdx, centerCx, centerCy)
  }

  unloadFarChunks(centerFace, centerCx, centerCy) {
    if (this.loadWholeGlobe) return

    for (const [key, chunk] of this.chunks) {
      const sameFace = chunk.faceIdx === centerFace
      const dCx = Math.abs(chunk.cx - centerCx)
      const dCy = Math.abs(chunk.cy - centerCy)
      const tooFar = sameFace
        ? (dCx > this.unloadRadius || dCy > this.unloadRadius)
        : (dCx > this.unloadRadius && dCy > this.unloadRadius)

      if (tooFar) {
        disposeChunkMesh(chunk)
        this.chunks.delete(key)
      }
    }
  }

  rebuildDirtyChunks() {
    let rebuilt = 0

    for (const chunk of this.chunks.values()) {
      if (!isChunkDirty(chunk)) continue
      if (rebuilt >= this.maxChunkRebuildsPerFrame) break

      disposeChunkMesh(chunk)
      const mesh = buildSphereChunkMesh(chunk, this, this.material)
      if (mesh) {
        setChunkMesh(chunk, mesh)
        this.group.add(mesh)
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
    const chunk = this.ensureChunk(wFace, cx, cy, cdep)
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
    const chunk = this.getChunk(wFace, cx, cy, cdep)
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
    const chunk = this.getChunk(wFace, cx, cy, cdep)
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

    if (this.group.parent) {
      this.group.parent.remove(this.group)
    }

    this.material?.dispose?.()
  }

  isSupportedBz(bz) {
    return (bz >= 0 && bz < SHELL_DEPTH) || (bz >= CLOUD_BZ_MIN && bz <= CLOUD_BZ_MAX)
  }

  isSupportedChunkDepth(cdep) {
    return (cdep >= 0 && cdep < DEP_CHUNKS) || (cdep >= CLOUD_CDEP_MIN && cdep <= CLOUD_CDEP_MAX)
  }

  getChunkDepths() {
    const depths = []
    for (let cdep = CLOUD_CDEP_MIN; cdep <= CLOUD_CDEP_MAX; cdep++) {
      depths.push(cdep)
    }
    for (let cdep = 0; cdep < DEP_CHUNKS; cdep++) {
      depths.push(cdep)
    }
    return depths
  }

  getGeneratedBlockId(faceIdx, bx, by, bz) {
    if (bz >= 0 && bz < SHELL_DEPTH) {
      return SPHERE_PRESET.getBlockId(faceIdx, bx, by, bz)
    }
    return this.getCloudBlockId(faceIdx, bx, by, bz)
  }

  getCloudBlockId(faceIdx, bx, by, bz) {
    if (bz < CLOUD_BZ_MIN || bz > CLOUD_BZ_MAX) return BLOCK.AIR

    const worldPos = blockToWorld(faceIdx, bx, by, bz)
    const radialLen = Math.max(0.0001, worldPos.length())
    const hemisphere = worldPos.y / radialLen
    const absLat = Math.abs(hemisphere)

    const wetEquator = 1.0 - Math.min(1, absLat / 0.22)
    const stormTrack = 1.0 - Math.min(1, Math.abs(absLat - 0.58) / 0.16)
    const drySubtropics = 1.0 - Math.min(1, Math.abs(absLat - 0.30) / 0.11)
    const polarBand = Math.max(0, (absLat - 0.78) / 0.18)
    const regionalWeather =
      wetEquator * 0.28 +
      stormTrack * 0.40 +
      polarBand * 0.14 -
      drySubtropics * 0.26

    const climateNoise =
      this.hash01(faceIdx, floorDiv(bx, 48), floorDiv(by, 48), 17) * 0.45 +
      this.hash01(faceIdx, floorDiv(bx, 96), floorDiv(by, 96), 23) * 0.35 +
      this.hash01(faceIdx, floorDiv(bx, 20), floorDiv(by, 20), 31) * 0.20
    const coverage = regionalWeather + climateNoise * 0.68
    if (coverage < 0.42) return BLOCK.AIR

    const regionX = floorDiv(bx, 16)
    const regionY = floorDiv(by, 14)
    const regionSeed = this.hash01(faceIdx, regionX, regionY, 59)
    const threshold = 0.54 + Math.max(0, 0.68 - coverage) * 0.4
    if (regionSeed < threshold) return BLOCK.AIR

    const cellMinX = regionX * 16
    const cellMinY = regionY * 14
    const boxStartX = cellMinX + 1 + Math.floor(this.hash01(faceIdx, regionX, regionY, 61) * 4)
    const boxStartY = cellMinY + 1 + Math.floor(this.hash01(faceIdx, regionX, regionY, 67) * 3)
    const boxWidth = 5 + Math.floor(this.hash01(faceIdx, regionX, regionY, 71) * 5)
    const boxHeight = 4 + Math.floor(this.hash01(faceIdx, regionX, regionY, 73) * 4)

    const cloudTopAltitude = 40 + Math.floor(this.hash01(faceIdx, regionX, regionY, 79) * 14)
    const cloudDepth = 3 + Math.floor(this.hash01(faceIdx, regionX, regionY, 83) * 4)
    const cloudBottomAltitude = Math.min(60, cloudTopAltitude + cloudDepth)

    const boxEndX = boxStartX + boxWidth - 1
    const boxEndY = boxStartY + boxHeight - 1
    const altitude = -bz

    if (bx < boxStartX || bx > boxEndX) return BLOCK.AIR
    if (by < boxStartY || by > boxEndY) return BLOCK.AIR
    if (altitude < cloudTopAltitude || altitude > cloudBottomAltitude) return BLOCK.AIR

    const onOuterWall =
      bx === boxStartX ||
      bx === boxEndX ||
      by === boxStartY ||
      by === boxEndY ||
      altitude === cloudTopAltitude ||
      altitude === cloudBottomAltitude

    if (!onOuterWall) return BLOCK.AIR

    const carveNoise = this.hash01(faceIdx, bx, by, altitude, 97)
    const largeGap = this.hash01(faceIdx, floorDiv(bx, 6), floorDiv(by, 6), floorDiv(altitude, 4), 101)
    if (carveNoise < 0.12 || largeGap < 0.08) return BLOCK.AIR

    return BLOCK.CLOUD
  }

  hash01(...values) {
    let hash = 2166136261
    for (const value of values) {
      hash ^= (value | 0)
      hash = Math.imul(hash, 16777619)
    }
    return ((hash >>> 0) % 1000000) / 1000000
  }
}
