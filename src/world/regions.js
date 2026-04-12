// ============================================================
// REGION DEFINITIONS
// Each region describes a biome zone and its abstract state.
// Used by SpawnSystem and future ecosystem simulation.
// ============================================================

export const REGION_TAGS = {
  PLAINS: 'plains',
  FOREST: 'forest',
  CAVE: 'cave',
  SWAMP: 'swamp',
  CORRUPTED: 'corrupted',
  FROZEN: 'frozen',
  VOLCANIC: 'volcanic',
  ARENA: 'arena',
}

/**
 * Base region state shape.
 * Created per biome section; updated on a slow tick (every 10-60s).
 */
export function createRegionState(biome = REGION_TAGS.PLAINS) {
  return {
    biome,

    // Ecological pressures (0-100)
    herbivorePressure: 50,
    predatorPressure: 25,
    apexPressure: 5,

    // Resources (0-100)
    foodSupply: 70,
    waterSupply: 80,

    // Environment
    corruption: 0,
    danger: 20,

    // Migration tendencies (positive = moving in that direction)
    migrationBias: { north: 0, south: 0, east: 0, west: 0 },

    // Trait biases for spawned entities
    traitBias: {
      fast: 0,
      armored: 0,
      corrupted: 0,
      venomous: 0,
    },

    // Spawn budget: how many entities this region supports right now
    spawnBudget: 10,
  }
}

/**
 * Update a region's state based on ecological rules.
 * Call this on a slow tick (every 10-60 seconds), NOT every frame.
 */
export function tickRegionState(region) {
  // Food drives herbivore growth
  if (region.foodSupply > 60) {
    region.herbivorePressure = Math.min(100, region.herbivorePressure + 2)
  } else if (region.foodSupply < 30) {
    region.herbivorePressure = Math.max(0, region.herbivorePressure - 3)
  }

  // Herbivores drive predator growth
  if (region.herbivorePressure > 50) {
    region.predatorPressure = Math.min(100, region.predatorPressure + 1)
  } else if (region.herbivorePressure < 20) {
    region.predatorPressure = Math.max(0, region.predatorPressure - 2)
  }

  // Predators reduce herbivores
  if (region.predatorPressure > 40) {
    region.herbivorePressure = Math.max(0, region.herbivorePressure - 1)
    region.foodSupply = Math.min(100, region.foodSupply + 1)
  }

  // Corruption increases trait bias
  if (region.corruption > 50) {
    region.traitBias.corrupted = Math.min(1, region.traitBias.corrupted + 0.02)
  }

  // Spawn budget is derived from pressures
  region.spawnBudget = Math.round(
    (region.herbivorePressure + region.predatorPressure * 0.5) / 10
  )
}
