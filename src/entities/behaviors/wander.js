// ============================================================
// WANDER BEHAVIOR
// Entity picks random nearby targets and slowly roams
// ============================================================

const WANDER_RADIUS = 3.25
const WANDER_INTERVAL_MIN = 1.5
const WANDER_INTERVAL_MAX = 3.5
const WANDER_REACH_DISTANCE = 0.5

export function createWanderState() {
  return {
    target: null,
    timer: 0.8,
  }
}

/**
 * @param {Object} entity
 * @param {Object} wanderState - created by createWanderState()
 * @param {number} deltaTime
 * @param {Function} moveFn - (entity, deltaTime, target) => { moved, reached }
 * @param {Function} canMoveFn - (entity, candidate) => boolean
 * @returns {boolean} isMoving
 */
export function runWander(entity, wanderState, deltaTime, moveFn, canMoveFn) {
  wanderState.timer -= deltaTime

  if (!wanderState.target && wanderState.timer <= 0) {
    wanderState.target = pickWanderTarget(entity, canMoveFn)
    wanderState.timer = randomRange(WANDER_INTERVAL_MIN, WANDER_INTERVAL_MAX)
  }

  if (!wanderState.target) return false

  const result = moveFn(entity, deltaTime, wanderState.target)

  const dist = horizontalDist(entity.mesh.position, wanderState.target)
  if (result.reached || dist <= WANDER_REACH_DISTANCE) {
    wanderState.target = null
    wanderState.timer = randomRange(WANDER_INTERVAL_MIN, WANDER_INTERVAL_MAX)
  }

  if (!result.moved && !result.reached) {
    wanderState.target = null
    wanderState.timer = 0.75
  }

  return result.moved
}

function pickWanderTarget(entity, canMoveFn) {
  const home = entity.homePosition || entity.mesh.position
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 0.8 + Math.random() * (WANDER_RADIUS - 0.8)
    const candidate = {
      x: home.x + Math.cos(angle) * radius,
      y: entity.mesh.position.y,
      z: home.z + Math.sin(angle) * radius,
    }
    if (!canMoveFn || canMoveFn(entity, candidate)) return candidate
  }
  return null
}

function horizontalDist(a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dz * dz)
}

function randomRange(min, max) {
  return min + Math.random() * (max - min)
}
