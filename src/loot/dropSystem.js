import { rollDrops } from './lootTables.js'

// ============================================================
// DROP SYSTEM
// Creates drops in the world when an entity dies.
// Currently a stub — items will be added later.
// ============================================================

export function createDropSystem(game) {
  const pendingDrops = []

  /**
   * Trigger drops for a dead entity.
   * @param {Object} entity
   */
  function onEntityDeath(entity) {
    if (!entity.species) return

    const drops = rollDrops(entity.species)
    if (drops.length === 0) return

    for (const drop of drops) {
      pendingDrops.push({
        id: drop.id,
        quantity: drop.quantity,
        position: entity.mesh?.position?.clone?.() ?? null,
      })
    }

    // TODO: Spawn physical pickup items in the world
    if (pendingDrops.length > 0) {
      console.log(`[DropSystem] Drops from ${entity.species}:`, pendingDrops.slice(-drops.length))
    }
  }

  return { onEntityDeath, pendingDrops }
}
