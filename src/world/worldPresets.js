import { BLOCK } from './blocks.js'

const DIRT_DEPTH = 3

const SHARED_FOREST_REGIONS = Object.freeze([
  { x: -104, z: 84, radius: 48, density: 1.15 },
  { x: -86, z: -76, radius: 58, density: 1.35 },
  { x: 106, z: -22, radius: 44, density: 1.05 },
  { x: 62, z: 102, radius: 26, density: 0.92 },
  { x: 32, z: 72, radius: 16, density: 0.72 },
  { x: 82, z: 24, radius: 18, density: 0.7 },
  { x: 48, z: -112, radius: 14, density: 0.62 },
  { x: 12, z: -134, radius: 18, density: 0.64 },
  { x: -156, z: -42, radius: 16, density: 0.6 },
  { x: -152, z: -132, radius: 18, density: 0.62 },
])

function world1Height(bx, bz) {
  const broad =
    Math.sin(bx * 0.055) * 4 +
    Math.cos(bz * 0.05) * 4 * 0.85

  const detail =
    Math.sin((bx + bz) * 0.12) * 2 +
    Math.cos((bx - bz) * 0.078) * 1

  const cliffBand = Math.tanh((bx - 18) * 0.45) * 7.5
  const ridgeShape = Math.exp(-((bz + 10) * (bz + 10)) / 520) * 4.5

  return -1 + broad + detail + cliffBand + ridgeShape
}

function world2Height(bx, bz) {
  const rolling =
    Math.sin(bz * 0.045) * 1.6 +
    Math.cos(bx * 0.028) * 1.1 +
    Math.sin((bx - bz) * 0.032) * 0.8

  const riverCut = -11.5 * Math.exp(-((bx + 4) * (bx + 4)) / 180)
  const eastHill =
    12.5 * Math.exp(-(((bx - 34) * (bx - 34)) / 580) - (((bz + 8) * (bz + 8)) / 900))
  const westHill =
    10.5 * Math.exp(-(((bx + 42) * (bx + 42)) / 700) - (((bz - 14) * (bz - 14)) / 840))
  const terrace = 2.5 * Math.exp(-((bx - 2) * (bx - 2)) / 1200)

  return -4 + rolling + riverCut + eastHill + westHill + terrace
}

function world3Height(_bx, _bz) {
  return -1
}

export const WORLD_PRESETS = Object.freeze({
  // Globe world — terrain and chunk loading handled entirely by SphereWorld.
  // This stub just registers the id so setActiveWorldPreset('globe') works
  // and game.js can detect isGlobe = activePreset.id === 'globe'.
  globe: {
    id: 'globe',
    label: 'Globe',
    description: 'Hollow spherical shell world',
    worldSize: 384,
    getSurfaceHeightExact: () => 0,
    getBlockId: () => BLOCK.AIR,
    colors: {
      grass: { r: 0.28, g: 0.62, b: 0.28 },
      dirt:  { r: 0.44, g: 0.30, b: 0.20 },
      stone: { r: 0.52, g: 0.52, b: 0.56 },
    },
    treeSettings: { forestRegions: [], treeCellSize: 8, foliageCellSize: 7 },
  },
  world1: {
    id: 'world1',
    label: 'World 1',
    description: 'Green ridge country',
    worldSize: 384,
    getSurfaceHeightExact: world1Height,
    getBlockId(bx, by, bz) {
      const surfaceY = Math.floor(world1Height(bx, bz))
      if (by > surfaceY) return BLOCK.AIR
      if (by === surfaceY) return BLOCK.GRASS
      if (by >= surfaceY - DIRT_DEPTH) return BLOCK.DIRT
      return BLOCK.STONE
    },
    colors: {
      grass: { r: 0.35, g: 0.7, b: 0.35 },
      dirt: { r: 0.45, g: 0.3, b: 0.2 },
      stone: { r: 0.55, g: 0.55, b: 0.6 },
    },
    treeSettings: {
      forestRegions: SHARED_FOREST_REGIONS,
      trunkColor: 0x5a3a22,
      leafColor: 0x4f8d44,
      foliageColor: 0x7aa25c,
      foliageOpacity: 0.52,
      treeCellSize: 8,
      foliageCellSize: 7,
    },
  },
  world2: {
    id: 'world2',
    label: 'World 2',
    description: 'Brown river valley',
    worldSize: 384,
    getSurfaceHeightExact: world2Height,
    getBlockId(bx, by, bz) {
      const exactHeight = world2Height(bx, bz)
      const surfaceY = Math.floor(exactHeight)
      const riverDepth = Math.exp(-((bx + 4) * (bx + 4)) / 150)

      if (by > surfaceY) return BLOCK.AIR
      if (by === surfaceY) {
        return riverDepth > 0.45 ? BLOCK.DIRT : BLOCK.GRASS
      }
      if (by >= surfaceY - DIRT_DEPTH) return BLOCK.DIRT
      return BLOCK.STONE
    },
    colors: {
      grass: { r: 0.57, g: 0.49, b: 0.33 },
      dirt: { r: 0.48, g: 0.34, b: 0.22 },
      stone: { r: 0.43, g: 0.39, b: 0.34 },
    },
    treeSettings: {
      forestRegions: SHARED_FOREST_REGIONS,
      avoidLowlandsBelow: -10,
      trunkColor: 0x66412a,
      leafColor: 0x6b7f3c,
      foliageColor: 0x8b9153,
      foliageOpacity: 0.46,
      treeCellSize: 8,
      foliageCellSize: 7,
    },
  },
  world3: {
    id: 'world3',
    label: 'World 3',
    description: 'Training Grounds',
    worldSize: 40,
    getSurfaceHeightExact: world3Height,
    getBlockId(bx, by, bz) {
      const surfaceY = Math.floor(world3Height(bx, bz))
      if (by > surfaceY) return BLOCK.AIR
      if (by === surfaceY) return BLOCK.GRASS
      if (by >= surfaceY - DIRT_DEPTH) return BLOCK.DIRT
      return BLOCK.STONE
    },
    colors: {
      grass: { r: 0.52, g: 0.64, b: 0.42 },
      dirt: { r: 0.46, g: 0.34, b: 0.24 },
      stone: { r: 0.58, g: 0.58, b: 0.6 },
    },
    treeSettings: {
      forestRegions: [],
      trunkColor: 0x5a3a22,
      leafColor: 0x4f8d44,
      foliageColor: 0x7aa25c,
      foliageOpacity: 0.42,
      treeCellSize: 8,
      foliageCellSize: 7,
    },
  },
})

let activeWorldId = 'globe'

export function setActiveWorldPreset(worldId) {
  if (!WORLD_PRESETS[worldId]) return
  activeWorldId = worldId
}

export function getActiveWorldPreset() {
  return WORLD_PRESETS[activeWorldId] ?? WORLD_PRESETS.globe
}
