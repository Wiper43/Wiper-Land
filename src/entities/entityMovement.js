import * as THREE from 'three'

// ============================================================
// ENTITY MOVEMENT HELPERS
// Shared locomotion and math utilities for all entities
// ============================================================

export function horizontalDistance(a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function rotateTowardsAngle(current, target, maxStep) {
  let delta = target - current
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  if (Math.abs(delta) <= maxStep) return target
  return current + Math.sign(delta) * maxStep
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min)
}

/**
 * Check whether an entity can move to targetPosition without overlapping other colliders.
 * Skips the entity's own collider.
 *
 * @param {Object[]} colliders - world collider list
 * @param {Object} entityCollider - the entity's own collider (skipped)
 * @param {THREE.Vector3} targetPosition - desired XZ position (Y is entity feet Y)
 * @param {THREE.Vector3} halfSize - half extents of the entity's collision box
 * @param {number} yOffset - vertical center offset from feet (default 1.1)
 */
export function canMoveTo(colliders, entityCollider, targetPosition, halfSize, yOffset = 1.1) {
  const targetBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(targetPosition.x, targetPosition.y + yOffset, targetPosition.z),
    new THREE.Vector3(halfSize.x * 2, halfSize.y * 2, halfSize.z * 2)
  )

  for (const collider of colliders) {
    if (!collider || collider === entityCollider) continue
    if (targetBox.intersectsBox(collider.box)) return false
  }

  return true
}

/**
 * Shared update function to apply gravity and vertical voxel collision for an entity.
 * Checks the full entity footprint (4 corners) for reliable grounding.
 * Mutates entity.velocity.y, entity.mesh.position.y, and entity.grounded.
 *
 * @param {Object} entity - must have mesh, velocity, grounded
 * @param {number} deltaTime
 * @param {Object} blockWorld - must expose isSolidBlock(bx, by, bz)
 * @param {number} halfX - half-width of footprint in X (default 0.4)
 * @param {number} halfZ - half-width of footprint in Z (default 0.4)
 */
export function applyGravityAndGrounding(entity, deltaTime, blockWorld, halfX = 0.4, halfZ = 0.4) {
  const GRAVITY = 20

  // ── Sphere world: radial gravity ────────────────────────────
  if (blockWorld?.getLocalFrame) {
    const pos = entity.mesh.position
    const up = blockWorld.getRadialUp(pos)

    // Apply gravity toward core
    entity.velocity.x -= up.x * GRAVITY * deltaTime
    entity.velocity.y -= up.y * GRAVITY * deltaTime
    entity.velocity.z -= up.z * GRAVITY * deltaTime

    const nextPos = pos.clone().addScaledVector(entity.velocity, deltaTime)
    const feetSample = nextPos.clone().addScaledVector(up.negate(), 0.3)
    const gBlock = blockWorld.worldToBlock(feetSample)

    if (blockWorld.isSolidBlock(gBlock.faceIdx, gBlock.bx, gBlock.by, gBlock.bz)) {
      const surfR = blockWorld.getSurfaceRadiusAt(feetSample)
      const snapUp = blockWorld.getRadialUp(nextPos)
      pos.copy(snapUp).multiplyScalar(surfR)
      entity.velocity.set(0, 0, 0)
      entity.grounded = true
    } else {
      pos.copy(nextPos)
      entity.grounded = false
    }
    return
  }

  // ── Flat world: Y-axis gravity ───────────────────────────────
  entity.velocity.y -= GRAVITY * deltaTime

  const nextY = entity.mesh.position.y + entity.velocity.y * deltaTime
  // Block just below the feet at the new position
  const byCheck = Math.floor(nextY - 0.001)

  const cx = entity.mesh.position.x
  const cz = entity.mesh.position.z
  // Inset corners slightly to avoid false positives at exact block edges
  const rx = halfX * 0.8
  const rz = halfZ * 0.8

  const corners = [
    [cx - rx, cz - rz],
    [cx + rx, cz - rz],
    [cx - rx, cz + rz],
    [cx + rx, cz + rz],
  ]

  let grounded = false
  for (const [fx, fz] of corners) {
    if (blockWorld.isSolidBlock(Math.floor(fx), byCheck, Math.floor(fz))) {
      grounded = true
      break
    }
  }

  if (grounded) {
    entity.velocity.y = 0
    entity.grounded = true
    // Snap feet to top surface of the block
    entity.mesh.position.y = byCheck + 1
  } else {
    entity.mesh.position.y = nextY
    entity.grounded = false
  }
}

/**
 * Check whether an entity footprint overlaps any solid voxel block at the given position.
 * Used for horizontal movement checks against terrain.
 *
 * @param {Object} blockWorld
 * @param {THREE.Vector3} position - entity feet position (world space)
 * @param {number} halfX - half-width in X
 * @param {number} halfZ - half-width in Z
 * @param {number} heightBlocks - number of blocks to check upward (default 3)
 * @returns {boolean} true if the position is clear
 */
export function canMoveToVoxel(blockWorld, position, halfX, halfZ, heightBlocks = 3) {
  const minBX = Math.floor(position.x - halfX + 0.1)
  const maxBX = Math.floor(position.x + halfX - 0.1)
  const minBZ = Math.floor(position.z - halfZ + 0.1)
  const maxBZ = Math.floor(position.z + halfZ - 0.1)
  const minBY = Math.floor(position.y + 0.1)
  const maxBY = minBY + heightBlocks - 1

  for (let bx = minBX; bx <= maxBX; bx++) {
    for (let bz = minBZ; bz <= maxBZ; bz++) {
      for (let by = minBY; by <= maxBY; by++) {
        if (blockWorld.isSolidBlock(bx, by, bz)) return false
      }
    }
  }
  return true
}

export function tryStepMoveOnVoxelGrid(
  entity,
  blockWorld,
  targetPosition,
  {
    halfX = 0.4,
    halfZ = 0.4,
    heightBlocks = 3,
    stepHeight = 1.0,
    maxFallSpeed = 0.1,
    groundedGraceTime = 0.08,
  } = {}
) {
  if (!entity?.mesh || !blockWorld) {
    return { moved: false, stepped: false, position: null, stepGroundedGraceTime: 0 }
  }

  if (canMoveToVoxel(blockWorld, targetPosition, halfX, halfZ, heightBlocks)) {
    return {
      moved: true,
      stepped: false,
      position: targetPosition,
      stepGroundedGraceTime: groundedGraceTime,
    }
  }

  const groundedGrace = entity.stepGroundedGraceTimer ?? 0
  const canStep =
    entity.grounded === true ||
    entity.groundedAtFrameStart === true ||
    groundedGrace > 0

  if (!canStep) {
    return { moved: false, stepped: false, position: null, stepGroundedGraceTime: 0 }
  }

  if ((entity.velocity?.y ?? 0) < -maxFallSpeed) {
    return { moved: false, stepped: false, position: null, stepGroundedGraceTime: 0 }
  }

  const baseFootY = entity.mesh.position.y
  const minBX = Math.floor(targetPosition.x - halfX + 0.1)
  const maxBX = Math.floor(targetPosition.x + halfX - 0.1)
  const minBZ = Math.floor(targetPosition.z - halfZ + 0.1)
  const maxBZ = Math.floor(targetPosition.z + halfZ - 0.1)
  const minBY = Math.floor(baseFootY + 0.1)
  const maxBY = Math.floor(baseFootY + stepHeight + 0.001)

  let bestStepTop = null

  for (let bx = minBX; bx <= maxBX; bx++) {
    for (let bz = minBZ; bz <= maxBZ; bz++) {
      for (let by = minBY; by <= maxBY; by++) {
        if (!blockWorld.isSolidBlock(bx, by, bz)) continue

        const blockTop = by + 1
        const stepAmount = blockTop - baseFootY
        if (stepAmount <= 0.001 || stepAmount > stepHeight + 0.05) continue

        const steppedTarget = targetPosition.clone()
        steppedTarget.y = blockTop

        if (!canMoveToVoxel(blockWorld, steppedTarget, halfX, halfZ, heightBlocks)) continue

        if (bestStepTop == null || blockTop < bestStepTop) {
          bestStepTop = blockTop
        }
      }
    }
  }

  if (bestStepTop == null) {
    return { moved: false, stepped: false, position: null, stepGroundedGraceTime: 0 }
  }

  const steppedPosition = targetPosition.clone()
  steppedPosition.y = bestStepTop

  return { moved: true, stepped: true, position: steppedPosition, stepGroundedGraceTime: groundedGraceTime }
}

/**
 * Push overlapping entities apart based on horizontal distance.
 * Call once per frame after all entity updates.
 *
 * @param {Object[]} entities - entity list from entitySystem
 * @param {number} minSeparation - minimum horizontal distance between entity centers
 * @param {number} pushStrength - fraction of overlap to correct per frame (0..1)
 */
export function separateEntities(entities, minSeparation = 1.4, pushStrength = 0.3) {
  for (let i = 0; i < entities.length; i++) {
    const a = entities[i]
    if (!a || a.isDead || !a.mesh) continue
    for (let j = i + 1; j < entities.length; j++) {
      const b = entities[j]
      if (!b || b.isDead || !b.mesh) continue
      const dx = b.mesh.position.x - a.mesh.position.x
      const dz = b.mesh.position.z - a.mesh.position.z
      const distSq = dx * dx + dz * dz
      if (distSq >= minSeparation * minSeparation || distSq < 0.0001) continue
      const dist = Math.sqrt(distSq)
      const push = (minSeparation - dist) * pushStrength
      const nx = dx / dist
      const nz = dz / dist
      a.mesh.position.x -= nx * push
      a.mesh.position.z -= nz * push
      b.mesh.position.x += nx * push
      b.mesh.position.z += nz * push
    }
  }
}
