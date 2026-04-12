// ============================================================
// SPAWN RULES
// Validation rules that must pass before a monster can spawn.
// Each rule is a function: (candidate, context) => boolean
// ============================================================

/**
 * Spawn candidate shape:
 * {
 *   position: THREE.Vector3,
 *   species: string,
 *   regionState: Object,
 * }
 *
 * Context shape:
 * {
 *   playerPosition: THREE.Vector3,
 *   blockWorld: BlockWorld,
 *   existingEntities: Object[],
 * }
 */

export const SPAWN_RULES = {
  // Must not spawn on top of the player
  notNearPlayer(minDistance = 8) {
    return (candidate, context) => {
      if (!context.playerPosition) return true
      const dx = candidate.position.x - context.playerPosition.x
      const dz = candidate.position.z - context.playerPosition.z
      return dx * dx + dz * dz >= minDistance * minDistance
    }
  },

  // Must spawn on solid ground
  requiresSolidGround() {
    return (candidate, context) => {
      if (!context.blockWorld) return true
      const bx = Math.floor(candidate.position.x)
      const by = Math.floor(candidate.position.y - 1)
      const bz = Math.floor(candidate.position.z)
      return context.blockWorld.isSolidBlock(bx, by, bz)
    }
  },

  // Must be in a valid biome
  requiresBiome(...allowedBiomes) {
    return (candidate) => {
      if (!candidate.regionState) return true
      return allowedBiomes.includes(candidate.regionState.biome)
    }
  },

  // Corruption threshold
  requiresCorruption(minCorruption) {
    return (candidate) => {
      if (!candidate.regionState) return false
      return candidate.regionState.corruption >= minCorruption
    }
  },

  // Global entity cap
  belowEntityCap(maxEntities) {
    return (candidate, context) => {
      return (context.existingEntities?.length ?? 0) < maxEntities
    }
  },
}

/**
 * Check all rules against a candidate.
 * Returns true if all pass.
 */
export function validateSpawnCandidate(candidate, context, rules = []) {
  return rules.every((rule) => rule(candidate, context))
}
