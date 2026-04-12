import { syncEntityHealthBar } from '../ui/healthBars.js'
import { separateEntities } from './entityMovement.js'

// ============================================================
// ENTITY SYSTEM
// Owns: master entity registry, add/remove/update iteration
// Does NOT own: terrain, player input, attack ray origin
// ============================================================

export function createEntitySystem() {
  const entities = []

  function add(entity) {
    entities.push(entity)
  }

  function remove(entity) {
    const i = entities.indexOf(entity)
    if (i !== -1) entities.splice(i, 1)
  }

  function removeById(id) {
    const i = entities.findIndex((e) => e.id === id)
    if (i !== -1) entities.splice(i, 1)
  }

  function update(deltaTime, camera, player) {
    for (const entity of entities) {
      if (!entity || entity.isDead) continue
      if (typeof entity.update === 'function') {
        entity.update(deltaTime, camera, player)
      }
    }
    separateEntities(entities)
  }

  function syncHealthBars(camera) {
    for (const entity of entities) {
      if (!entity) continue
      syncEntityHealthBar(entity, camera)
    }
  }

  function cleanupDead() {
    for (let i = entities.length - 1; i >= 0; i--) {
      if (entities[i]?.isDead) entities.splice(i, 1)
    }
  }

  function getAttackable() {
    return entities.filter((e) => e && !e.isDead && (e.canTakeDamage || e.blocksAttack))
  }

  function getAlive() {
    return entities.filter((e) => e && !e.isDead)
  }

  function getByType(type) {
    return entities.filter((e) => e && e.type === type)
  }

  function getNearby(position, radius) {
    const rSq = radius * radius
    return entities.filter((e) => {
      if (!e || e.isDead || !e.mesh) return false
      const dx = e.mesh.position.x - position.x
      const dz = e.mesh.position.z - position.z
      return dx * dx + dz * dz <= rSq
    })
  }

  return {
    entities,
    add,
    remove,
    removeById,
    update,
    syncHealthBars,
    cleanupDead,
    getAttackable,
    getAlive,
    getByType,
    getNearby,
  }
}
