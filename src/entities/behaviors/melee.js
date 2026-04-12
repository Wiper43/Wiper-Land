// ============================================================
// MELEE ATTACK BEHAVIOR
// Entity attacks when close enough and cooldown has elapsed
// ============================================================

/**
 * @param {Object} entity - must have attackCooldown field
 * @param {Object} target - must have position
 * @param {number} deltaTime
 * @param {Object} options
 * @param {number} options.range - attack range
 * @param {number} options.cooldown - cooldown in seconds
 * @param {Function} options.onAttack - called when attack fires: (entity, target) => void
 * @returns {boolean} attacked
 */
export function runMelee(entity, target, deltaTime, { range = 4.5, cooldown = 1.1, onAttack } = {}) {
  if (!entity.attackCooldown) entity.attackCooldown = 0
  entity.attackCooldown -= deltaTime

  if (!target || !target.position) return false

  const dx = target.position.x - entity.mesh.position.x
  const dz = target.position.z - entity.mesh.position.z
  const dist = Math.sqrt(dx * dx + dz * dz)

  if (dist > range) return false
  if (entity.attackCooldown > 0) return false
  if (target.isDead) return false

  entity.attackCooldown = cooldown
  if (onAttack) onAttack(entity, target)
  return true
}
