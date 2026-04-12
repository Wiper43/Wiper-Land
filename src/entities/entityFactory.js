import { createCow } from './monsters/cow.js'
import { createSpider } from './monsters/spider.js'
import { MONSTER_DEFS } from './monsters/monsterDefs.js'

// ============================================================
// ENTITY FACTORY
// Owns: constructing entity instances from species definitions
// ============================================================

let _nextId = 1

function nextId() {
  return `ent_${_nextId++}`
}

/**
 * Create a monster entity from a species ID.
 *
 * @param {string} speciesId - key from MONSTER_DEFS
 * @param {Object} options
 * @param {THREE.Vector3} options.position
 * @param {Object} options.game - game container
 * @param {Object} [options.audio]
 * @returns {Object} entity
 */
export function createMonster(speciesId, { position, game, audio = {} } = {}) {
  const def = MONSTER_DEFS[speciesId]
  if (!def) {
    console.warn(`[EntityFactory] Unknown species: "${speciesId}"`)
    return null
  }

  let entity = null

  switch (speciesId) {
    case 'cow':
    case 'zombieCow':
      entity = createCow(game, position, audio)
      break
    case 'spider':
      entity = createSpider(game, position)
      break
    default:
      console.warn(`[EntityFactory] No constructor for species: "${speciesId}"`)
      return null
  }

  if (entity) {
    entity.id = nextId()
    entity.species = speciesId
  }

  return entity
}
