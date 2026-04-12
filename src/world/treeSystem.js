import * as THREE from 'three'
import { getSurfaceHeightExact } from './terrain.js'
import { getActiveWorldPreset } from './worldPresets.js'

const WORLD_MARGIN = 10
const MIN_TREE_HEIGHT = 7.2
const MAX_TREE_HEIGHT = 36
const PLAYER_CLEAR_RADIUS = 4

export function createTreeSystem(scene, blockWorld, colliders = [], entitySystem = null, onNavDirty = null) {
  const preset = getActiveWorldPreset()
  const treeSettings = preset.treeSettings ?? {}
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: treeSettings.trunkColor ?? 0x5a3a22,
    roughness: 0.94,
    metalness: 0.0,
  })
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: treeSettings.leafColor ?? 0x4f8d44,
    roughness: 0.96,
    metalness: 0.0,
  })
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: treeSettings.foliageColor ?? 0x6f8d4f,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: treeSettings.foliageOpacity ?? 0.48,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const foliageGeometry = new THREE.PlaneGeometry(1, 1)

  const group = new THREE.Group()
  group.name = 'TreeSystem'
  scene.add(group)

  const treeGroup = new THREE.Group()
  treeGroup.name = 'ForestTrees'
  const foliageGroup = new THREE.Group()
  foliageGroup.name = 'ForestFoliage'
  group.add(treeGroup, foliageGroup)

  const treeColliders = []
  const treeEntities = []
  const treeRecords = generateTreeLayout(blockWorld.worldHalfSize, treeSettings)
  for (const tree of treeRecords) {
    const treeObject = buildTreeObject(tree, trunkMaterial, leafMaterial, colliders, onNavDirty)
    treeGroup.add(treeObject.group)

    for (const pieceCollider of treeObject.colliders) {
      treeColliders.push(pieceCollider)
      colliders.push(pieceCollider)
    }

    treeEntities.push(treeObject.entity)
    entitySystem?.add?.(treeObject.entity)
  }

  const foliageRecords = generateFoliageLayout(blockWorld.worldHalfSize, treeSettings, foliageGeometry, foliageMaterial)
  for (const patch of foliageRecords) {
    foliageGroup.add(patch.mesh)
  }

  return {
    group,
    treeCount: treeRecords.length,
    foliageCount: foliageRecords.length,
    update() {},
    destroyFromRay(origin, direction, maxDistance = 6) {
      let bestPatch = null
      let bestDistance = maxDistance

      for (const patch of foliageRecords) {
        if (!patch.alive) continue
        const hit = rayIntersectsBox(origin, direction, patch.box)
        if (hit == null || hit > bestDistance) continue
        bestPatch = patch
        bestDistance = hit
      }

      if (!bestPatch) return null

      destroyFoliagePatch(bestPatch)
      return { distance: bestDistance, type: 'foliage' }
    },
    dispose() {
      for (const collider of treeColliders) {
        const index = colliders.indexOf(collider)
        if (index !== -1) colliders.splice(index, 1)
      }

      for (const entity of treeEntities) {
        entitySystem?.remove?.(entity)
      }

      for (const child of treeGroup.children) {
        child.traverse?.((node) => {
          node.geometry?.dispose?.()
        })
      }

      for (const patch of foliageRecords) {
        patch.mesh.traverse?.((node) => {
          if (node !== patch.mesh) {
            node.geometry?.dispose?.()
          }
        })
      }

      trunkMaterial.dispose()
      leafMaterial.dispose()
      foliageGeometry.dispose()
      foliageMaterial.dispose()

      scene.remove(group)
    },
  }
}

function buildTreeObject(tree, trunkMaterial, leafMaterial, colliders, onNavDirty) {
  const group = new THREE.Group()
  group.position.set(tree.x + 0.5, tree.baseY, tree.z + 0.5)
  group.userData.type = 'tree'

  const pieceColliders = []

  for (const piece of tree.pieces) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(piece.width, piece.height, piece.depth),
      piece.kind === 'trunk' ? trunkMaterial : leafMaterial
    )
    mesh.position.set(piece.x, piece.y, piece.z)
    group.add(mesh)

    pieceColliders.push({
      box: new THREE.Box3(
        new THREE.Vector3(
          tree.x + 0.5 + piece.x - piece.width * 0.5,
          tree.baseY + piece.y - piece.height * 0.5,
          tree.z + 0.5 + piece.z - piece.depth * 0.5
        ),
        new THREE.Vector3(
          tree.x + 0.5 + piece.x + piece.width * 0.5,
          tree.baseY + piece.y + piece.height * 0.5,
          tree.z + 0.5 + piece.z + piece.depth * 0.5
        )
      ),
      mesh,
      isDynamic: false,
    })
  }

  const maxHealth = Math.max(30, Math.round(tree.trunkHeight * 4))
  const entity = {
    type: 'tree',
    name: 'Tree',
    mesh: group,
    collider: pieceColliders[0] ?? null,
    health: maxHealth,
    maxHealth,
    isDead: false,
    blocksAttack: true,
    canTakeDamage: true,
    takeDamage(amount) {
      if (this.isDead) return

      this.health -= amount
      if (this.health > 0) return

      this.isDead = true
      group.traverse?.((node) => {
        node.geometry?.dispose?.()
      })
      if (group.parent) group.parent.remove(group)

      for (const pieceCollider of pieceColliders) {
        const colliderIndex = colliders.indexOf(pieceCollider)
        if (colliderIndex !== -1) {
          colliders.splice(colliderIndex, 1)
        }
      }

      onNavDirty?.()
    },
  }

  return { group, colliders: pieceColliders, entity }
}

function generateTreeLayout(worldHalfSize, treeSettings) {
  const trees = []

  for (const region of treeSettings.forestRegions ?? []) {
    const cellSize = region.treeCellSize ?? treeSettings.treeCellSize ?? 8
    const minX = Math.max(-worldHalfSize + WORLD_MARGIN, region.x - region.radius)
    const maxX = Math.min(worldHalfSize - WORLD_MARGIN, region.x + region.radius)
    const minZ = Math.max(-worldHalfSize + WORLD_MARGIN, region.z - region.radius)
    const maxZ = Math.min(worldHalfSize - WORLD_MARGIN, region.z + region.radius)

    for (let cellZ = minZ; cellZ <= maxZ; cellZ += cellSize) {
      for (let cellX = minX; cellX <= maxX; cellX += cellSize) {
        const dx = cellX - region.x
        const dz = cellZ - region.z
        const radialDistance = Math.sqrt(dx * dx + dz * dz)
        if (radialDistance > region.radius) continue

        const radialFalloff = 1 - radialDistance / region.radius
        const density = clamp((region.density ?? 0.9) * radialFalloff * radialFalloff, 0, 0.96)
        const spawnRoll = hash01(cellX * 0.173 + region.x, cellZ * 0.241 + region.z)
        if (spawnRoll > density) continue

        const offsetX = (hash01(cellX * 0.91, cellZ * 1.13) - 0.5) * cellSize * 0.72
        const offsetZ = (hash01(cellX * 1.41, cellZ * 0.77) - 0.5) * cellSize * 0.72
        const x = clamp(cellX + offsetX, -worldHalfSize + WORLD_MARGIN, worldHalfSize - WORLD_MARGIN)
        const z = clamp(cellZ + offsetZ, -worldHalfSize + WORLD_MARGIN, worldHalfSize - WORLD_MARGIN)

        const heightRoll = hash01(cellX * 0.51 + region.radius, cellZ * 0.67 + region.radius)
        const totalHeight = THREE.MathUtils.lerp(MIN_TREE_HEIGHT, MAX_TREE_HEIGHT, Math.pow(heightRoll, 1.35))
        const trunkHeight = Math.max(4, Math.floor(totalHeight * 0.56))
        const trunkWidth = totalHeight >= 24 ? 2 : 1
        if (!isTerrainSuitableForTree(x, z, treeSettings, trunkWidth)) continue
        if (isNearExistingTree(x, z, trees, 5.5)) continue
        const baseY = Math.floor(getSurfaceHeightExact(x, z)) + 1.02

        trees.push({
          x: Math.floor(x),
          z: Math.floor(z),
          baseY,
          trunkWidth,
          trunkHeight,
          pieces: createTreeTemplate(trunkHeight, trunkWidth, totalHeight),
        })
      }
    }
  }

  return trees
}

function createTreeTemplate(trunkHeight, trunkWidth, totalHeight) {
  const canopyBase = trunkHeight - 1
  const canopyHeight = Math.max(4, Math.round(totalHeight * 0.35))
  const wideRadius = totalHeight >= 22 ? 3.5 : 2.5
  const midRadius = Math.max(2, wideRadius - 0.8)
  const topRadius = Math.max(1.25, wideRadius - 1.5)

  return [
    {
      kind: 'trunk',
      x: 0,
      y: trunkHeight * 0.5,
      z: 0,
      width: trunkWidth,
      height: trunkHeight,
      depth: trunkWidth,
    },
    {
      kind: 'leaves',
      x: 0,
      y: canopyBase + 1,
      z: 0,
      width: wideRadius * 2 + 1,
      height: Math.max(2, Math.round(canopyHeight * 0.34)),
      depth: wideRadius * 2 + 1,
    },
    {
      kind: 'leaves',
      x: 0,
      y: canopyBase + Math.max(3, canopyHeight * 0.34),
      z: 0,
      width: midRadius * 2 + 1,
      height: Math.max(2, Math.round(canopyHeight * 0.28)),
      depth: midRadius * 2 + 1,
    },
    {
      kind: 'leaves',
      x: 0,
      y: canopyBase + Math.max(5, canopyHeight * 0.68),
      z: 0,
      width: topRadius * 2 + 1,
      height: Math.max(2, Math.round(canopyHeight * 0.22)),
      depth: topRadius * 2 + 1,
    },
  ]
}

function generateFoliageLayout(worldHalfSize, treeSettings, foliageGeometry, foliageMaterial) {
  const foliage = []

  for (const region of treeSettings.forestRegions ?? []) {
    const cellSize = region.foliageCellSize ?? treeSettings.foliageCellSize ?? 9
    const expandedRadius = region.radius + (region.foliageRadiusBoost ?? 12)
    const minX = Math.max(-worldHalfSize + WORLD_MARGIN, region.x - expandedRadius)
    const maxX = Math.min(worldHalfSize - WORLD_MARGIN, region.x + expandedRadius)
    const minZ = Math.max(-worldHalfSize + WORLD_MARGIN, region.z - expandedRadius)
    const maxZ = Math.min(worldHalfSize - WORLD_MARGIN, region.z + expandedRadius)

    for (let cellZ = minZ; cellZ <= maxZ; cellZ += cellSize) {
      for (let cellX = minX; cellX <= maxX; cellX += cellSize) {
        const dx = cellX - region.x
        const dz = cellZ - region.z
        const distance = Math.sqrt(dx * dx + dz * dz)
        if (distance > expandedRadius) continue

        const falloff = 1 - distance / expandedRadius
        const density = clamp((region.foliageDensity ?? 0.85) * falloff * falloff, 0, 0.96)
        const spawnRoll = hash01(cellX * 0.28 + region.x, cellZ * 0.19 + region.z)
        if (spawnRoll > density) continue

        const offsetX = (hash01(cellX * 1.19, cellZ * 0.63) - 0.5) * cellSize * 0.9
        const offsetZ = (hash01(cellX * 0.87, cellZ * 1.51) - 0.5) * cellSize * 0.9
        const x = clamp(cellX + offsetX, -worldHalfSize + WORLD_MARGIN, worldHalfSize - WORLD_MARGIN)
        const z = clamp(cellZ + offsetZ, -worldHalfSize + WORLD_MARGIN, worldHalfSize - WORLD_MARGIN)
        const baseHeight = Math.floor(getSurfaceHeightExact(x, z))

        if (!isTerrainSuitableForFoliage(x, z, treeSettings)) continue
        if (isInsidePlayerSpawnClear(x, z)) continue

        const tallRoll = hash01(cellX * 0.31, cellZ * 0.83)
        const width = tallRoll > 0.7 ? 2 : 1
        const depth = tallRoll > 0.84 ? 2 : 1
        const height = tallRoll > 0.82 ? 5 : (tallRoll > 0.45 ? 3 : 2)

        const centerX = Math.floor(x) + 0.5
        const centerY = baseHeight + height * 0.5 + 0.5
        const centerZ = Math.floor(z) + 0.5
        const mesh = createGrassClumpMesh(centerX, centerY, centerZ, width, depth, height, foliageGeometry, foliageMaterial)
        mesh.renderOrder = 3

        foliage.push({
          alive: true,
          mesh,
          box: new THREE.Box3(
            new THREE.Vector3(centerX - width * 0.5, baseHeight + 0.5, centerZ - depth * 0.5),
            new THREE.Vector3(centerX + width * 0.5, baseHeight + height + 0.5, centerZ + depth * 0.5)
          ),
        })
      }
    }
  }

  return foliage
}

function destroyFoliagePatch(patch) {
  if (!patch.alive) return
  patch.alive = false
  if (patch.mesh.parent) patch.mesh.parent.remove(patch.mesh)
}

function createGrassClumpMesh(centerX, centerY, centerZ, width, depth, height, sharedGeometry, material) {
  const group = new THREE.Group()
  group.position.set(centerX, centerY, centerZ)

  const planeCount = Math.min(4, Math.max(2, Math.round((Math.max(width, depth) + height * 0.2))))
  const spreadX = Math.max(0.2, width * 0.28)
  const spreadZ = Math.max(0.2, depth * 0.28)

  for (let i = 0; i < planeCount; i++) {
    const blade = new THREE.Mesh(sharedGeometry, material)
    const planeWidth = Math.max(0.8, width * (0.8 + hash01(centerX * 0.23 + i, centerZ * 0.51 - i) * 0.5))
    const planeHeight = height * (0.85 + hash01(centerX * 0.73 - i, centerZ * 0.17 + i) * 0.3)
    const localX = (hash01(centerX * 0.41 + i, centerZ * 0.27 - i) - 0.5) * spreadX
    const localZ = (hash01(centerX * 0.73 - i, centerZ * 0.64 + i) - 0.5) * spreadZ

    blade.position.set(localX, (planeHeight - height) * 0.5, localZ)
    blade.rotation.y = (Math.PI / planeCount) * i + hash01(centerX * 0.31 + i, centerZ * 0.57 - i) * 0.2
    blade.scale.set(planeWidth, planeHeight, 1)
    group.add(blade)
  }

  return group
}

function isTerrainSuitableForTree(x, z, treeSettings, trunkWidth = 1) {
  const centerHeight = getSurfaceHeightExact(x, z)
  const eastHeight = getSurfaceHeightExact(x + 2, z)
  const westHeight = getSurfaceHeightExact(x - 2, z)
  const northHeight = getSurfaceHeightExact(x, z - 2)
  const southHeight = getSurfaceHeightExact(x, z + 2)
  const slope = Math.abs(eastHeight - westHeight) + Math.abs(northHeight - southHeight)

  if (slope > 7.5) return false
  if (treeSettings.avoidLowlandsBelow != null && centerHeight < treeSettings.avoidLowlandsBelow) return false

  const footprintRadius = Math.max(1, trunkWidth * 0.5)
  const trunkBaseY = Math.floor(centerHeight) + 1.02
  const sampleOffsets = [-footprintRadius, footprintRadius]

  for (const ox of sampleOffsets) {
    for (const oz of sampleOffsets) {
      const sampleHeight = getSurfaceHeightExact(x + ox, z + oz)
      if (sampleHeight > trunkBaseY - 0.12) {
        return false
      }
    }
  }

  return true
}

function isTerrainSuitableForFoliage(x, z, treeSettings) {
  const centerHeight = getSurfaceHeightExact(x, z)
  const eastHeight = getSurfaceHeightExact(x + 1, z)
  const westHeight = getSurfaceHeightExact(x - 1, z)
  const northHeight = getSurfaceHeightExact(x, z - 1)
  const southHeight = getSurfaceHeightExact(x, z + 1)
  const slope = Math.abs(eastHeight - westHeight) + Math.abs(northHeight - southHeight)

  if (slope > 5.5) return false
  if (treeSettings.avoidLowlandsBelow != null && centerHeight < treeSettings.avoidLowlandsBelow) return false
  return true
}

function isNearExistingTree(x, z, trees, minDistance) {
  for (const tree of trees) {
    const dx = x - tree.x
    const dz = z - tree.z
    if ((dx * dx + dz * dz) < minDistance * minDistance) return true
  }
  return false
}

function isInsidePlayerSpawnClear(x, z) {
  return (x * x + (z - 8) * (z - 8)) < PLAYER_CLEAR_RADIUS * PLAYER_CLEAR_RADIUS
}

function rayIntersectsBox(origin, direction, box) {
  let tMin = 0
  let tMax = Infinity

  for (const axis of ['x', 'y', 'z']) {
    const invDir = 1 / (Math.abs(direction[axis]) < 0.00001 ? 0.00001 : direction[axis])
    let t1 = (box.min[axis] - origin[axis]) * invDir
    let t2 = (box.max[axis] - origin[axis]) * invDir

    if (t1 > t2) {
      const tmp = t1
      t1 = t2
      t2 = tmp
    }

    tMin = Math.max(tMin, t1)
    tMax = Math.min(tMax, t2)

    if (tMin > tMax) return null
  }

  return tMin
}

function hash01(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return value - Math.floor(value)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
