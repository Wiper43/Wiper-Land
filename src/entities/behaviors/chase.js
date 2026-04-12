// ============================================================
// CHASE BEHAVIOR
// Entity pursues a target using line-of-sight or A* pathfinding
// ============================================================

const PATH_RECALC_INTERVAL = 1.0
const WAYPOINT_REACH_DISTANCE = 1.1
const STUCK_TIME = 0.85
const STUCK_MOVE_EPSILON = 0.12
const PATH_COOLDOWN_AFTER_STUCK = 0.45

export function createChaseState() {
  return {
    path: [],
    pathIndex: 0,
    pathRecalcTimer: 0,
    lastTargetNavPos: { x: 0, y: 0, z: 0 },
    stuckTimer: 0,
    repathCooldown: 0,
    lastPosition: null,
  }
}

/**
 * Run chase behavior. Returns { isMoving, attemptedMove, isStuck }.
 *
 * @param {Object} entity
 * @param {Object} chaseState - from createChaseState()
 * @param {Object} targetPosition - { x, y, z }
 * @param {number} deltaTime
 * @param {Object} navGrid - { findPath, hasLineOfSight }
 * @param {Function} moveFn - (entity, deltaTime, target) => { moved, reached }
 * @param {number} stopDistance - stop when this close to target
 */
export function runChase(entity, chaseState, targetPosition, deltaTime, navGrid, moveFn, stopDistance = 4.5) {
  if (!chaseState.lastPosition) chaseState.lastPosition = { ...entity.mesh.position }

  chaseState.pathRecalcTimer -= deltaTime
  chaseState.repathCooldown -= deltaTime

  const meshPos = entity.mesh.position
  const dx = targetPosition.x - meshPos.x
  const dz = targetPosition.z - meshPos.z
  const distToTarget = Math.sqrt(dx * dx + dz * dz)

  if (distToTarget <= stopDistance) {
    return { isMoving: false, attemptedMove: false, reachedTarget: true }
  }

  const directClear = navGrid.hasLineOfSight(meshPos, targetPosition)
  const targetMovedEnough = distSq(chaseState.lastTargetNavPos, targetPosition) > 1.5 * 1.5

  if (directClear) {
    chaseState.path = []
    chaseState.pathIndex = 0
    const result = moveFn(entity, deltaTime, targetPosition)
    return { isMoving: result.moved, attemptedMove: true, reachedTarget: false }
  }

  const shouldRepath =
    chaseState.repathCooldown <= 0 &&
    (
      chaseState.path.length === 0 ||
      chaseState.pathIndex >= chaseState.path.length ||
      chaseState.pathRecalcTimer <= 0 ||
      targetMovedEnough
    )

  if (shouldRepath) {
    chaseState.path = navGrid.findPath(meshPos, targetPosition, { maxSearch: 2500 })
    chaseState.pathIndex = 0

    while (
      chaseState.pathIndex < chaseState.path.length &&
      horizDist(meshPos, chaseState.path[chaseState.pathIndex]) <= WAYPOINT_REACH_DISTANCE
    ) {
      chaseState.pathIndex++
    }

    chaseState.pathRecalcTimer = PATH_RECALC_INTERVAL
    chaseState.lastTargetNavPos = { ...targetPosition }
  }

  let isMoving = false
  let attemptedMove = false

  while (chaseState.pathIndex < chaseState.path.length) {
    const waypoint = chaseState.path[chaseState.pathIndex]
    const flatDist = horizDist(meshPos, waypoint)

    if (flatDist <= WAYPOINT_REACH_DISTANCE) {
      chaseState.pathIndex++
      continue
    }

    attemptedMove = true
    const result = moveFn(entity, deltaTime, waypoint)
    isMoving = result.moved
    if (result.reached) chaseState.pathIndex++
    break
  }

  const movedDistance = horizDist(meshPos, chaseState.lastPosition)
  if (isMoving || movedDistance > STUCK_MOVE_EPSILON) {
    chaseState.stuckTimer = 0
  } else if (attemptedMove) {
    chaseState.stuckTimer += deltaTime
  }
  chaseState.lastPosition = { ...meshPos }

  const isStuck = chaseState.stuckTimer >= STUCK_TIME

  if (isStuck) {
    chaseState.stuckTimer = 0
    chaseState.repathCooldown = PATH_COOLDOWN_AFTER_STUCK
    chaseState.path = navGrid.findPath(meshPos, targetPosition, { maxSearch: 2500 })
    chaseState.pathIndex = 0
    chaseState.pathRecalcTimer = PATH_RECALC_INTERVAL
    chaseState.lastTargetNavPos = { ...targetPosition }
  }

  return { isMoving, attemptedMove, reachedTarget: false, isStuck, path: chaseState.path, pathIndex: chaseState.pathIndex }
}

function horizDist(a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dz * dz)
}

function distSq(a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return dx * dx + dz * dz
}
