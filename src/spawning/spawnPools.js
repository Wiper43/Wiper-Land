// ============================================================
// SPAWN POOLS
// Which species belong to which region, with weights.
// Higher weight = more likely to be chosen.
// ============================================================

export const SPAWN_POOLS = {
  arena: [
    { species: 'zombieCow', weight: 100 },
  ],

  plains: [
    { species: 'cow', weight: 40 },
    { species: 'wolf', weight: 15 },
  ],

  forest: [
    { species: 'spider', weight: 25 },
    { species: 'wolf', weight: 20 },
  ],

  cave: [
    { species: 'spider', weight: 50 },
  ],

  swamp: [
    { species: 'spider', weight: 30 },
  ],
}

/**
 * Pick a random species from a pool using weighted selection.
 * @param {string} biome
 * @returns {string|null} species id
 */
export function pickSpeciesFromPool(biome) {
  const pool = SPAWN_POOLS[biome] || SPAWN_POOLS.plains
  if (!pool || pool.length === 0) return null

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = Math.random() * totalWeight

  for (const entry of pool) {
    roll -= entry.weight
    if (roll <= 0) return entry.species
  }

  return pool[pool.length - 1].species
}
