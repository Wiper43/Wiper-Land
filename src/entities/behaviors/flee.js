// ============================================================
// FLEE BEHAVIOR
// Entity moves away from a threat
// ============================================================

/**
 * @param {Object} entity - has mesh.position
 * @param {Object} threat - has position
 * @param {number} deltaTime
 * @param {Function} moveFn - (entity, deltaTime, target) => { moved }
 * @returns {boolean} isMoving
 */
export function runFlee(entity, threat, deltaTime, moveFn) {
  if (!threat?.position) return false

  const dx = entity.mesh.position.x - threat.position.x
  const dz = entity.mesh.position.z - threat.position.z
  const len = Math.sqrt(dx * dx + dz * dz)

  if (len < 0.0001) return false

  const fleeTarget = {
    x: entity.mesh.position.x + (dx / len) * 8,
    y: entity.mesh.position.y,
    z: entity.mesh.position.z + (dz / len) * 8,
  }

  const result = moveFn(entity, deltaTime, fleeTarget)
  return result.moved
}
