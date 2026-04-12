// ============================================================
// ENTITY COMBAT
// Helpers for entity-side combat: applying damage, responding to hits
// ============================================================

import * as THREE from 'three'

/**
 * Apply knockback impulse to a living entity.
 * Entity must have .velocity (THREE.Vector3) and .isLiving flag.
 */
export function applyKnockbackToEntity(entity, sourcePosition, strength = 5) {
  if (!entity || !entity.isLiving) return
  if (!entity.velocity) entity.velocity = new THREE.Vector3()

  const dir = new THREE.Vector3(
    entity.mesh.position.x - sourcePosition.x,
    0,
    entity.mesh.position.z - sourcePosition.z
  )

  if (dir.lengthSq() < 0.0001) return

  dir.normalize().multiplyScalar(strength)
  entity.velocity.add(dir)
}

/**
 * Standard takeDamage wrapper that entities can delegate to.
 * Handles: HP reduction, isDead flag, death callback.
 *
 * @param {Object} entity
 * @param {number} amount
 * @param {Object} context - { hitPoint, attackData, sourcePosition }
 * @param {Function} [onDamage] - called after damage: (entity, amount, context)
 * @param {Function} [onDeath] - called when entity dies: (entity)
 */
export function takeDamageStandard(entity, amount, context = {}, onDamage, onDeath) {
  if (entity.isDead || !entity.canTakeDamage) return

  entity.health -= amount
  if (entity.health < 0) entity.health = 0

  if (onDamage) onDamage(entity, amount, context)

  if (entity.health <= 0) {
    entity.isDead = true
    if (onDeath) onDeath(entity)
  }
}
