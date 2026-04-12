// ============================================================
// SPAWN BUDGET
// Population limits per region/species to prevent overcrowding.
// ============================================================

export const SPAWN_BUDGET = {
  // Max total entities in the active simulation zone
  globalCap: 40,

  // Max per biome zone
  perBiome: {
    arena: 15,
    plains: 12,
    forest: 10,
    cave: 8,
    swamp: 8,
  },

  // Max per species globally
  perSpecies: {
    cow: 20,
    zombieCow: 15,
    spider: 12,
    wolf: 8,
  },

  // Minimum distance between spawns of the same species
  minSpawnSpacing: 3.0,
}

/**
 * Check whether a spawn is within budget.
 *
 * @param {string} species
 * @param {string} biome
 * @param {Object[]} existingEntities
 * @returns {boolean}
 */
export function isWithinBudget(species, biome, existingEntities) {
  const alive = existingEntities.filter((e) => e && !e.isDead)

  if (alive.length >= SPAWN_BUDGET.globalCap) return false

  const biomeCap = SPAWN_BUDGET.perBiome[biome] ?? 10
  const biomeCount = alive.filter((e) => e.biome === biome).length
  if (biomeCount >= biomeCap) return false

  const speciesCap = SPAWN_BUDGET.perSpecies[species] ?? 10
  const speciesCount = alive.filter((e) => e.species === species).length
  if (speciesCount >= speciesCap) return false

  return true
}
