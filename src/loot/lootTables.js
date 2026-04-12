// ============================================================
// LOOT TABLES
// Data-driven drop definitions per species.
// ============================================================

export const LOOT_TABLES = {
  cow: [],
  zombieCow: [],
  spider: [
    { id: 'silk', chance: 0.5, quantity: [1, 2] },
  ],
  wolf: [
    { id: 'fur', chance: 0.6, quantity: [1, 3] },
    { id: 'fang', chance: 0.2, quantity: [1, 1] },
  ],
}

/**
 * Roll drops for a given species.
 * @param {string} species
 * @returns {Object[]} array of { id, quantity }
 */
export function rollDrops(species) {
  const table = LOOT_TABLES[species] ?? []
  const drops = []

  for (const entry of table) {
    if (Math.random() < entry.chance) {
      const [min, max] = entry.quantity ?? [1, 1]
      const quantity = min + Math.floor(Math.random() * (max - min + 1))
      drops.push({ id: entry.id, quantity })
    }
  }

  return drops
}
