import * as THREE from 'three'

// ============================================================
// DAMAGE SYSTEM
// Owns: applying damage to entities, player knockback physics
// ============================================================

/**
 * Apply smooth knockback to the player each frame.
 * Call this in the update loop.
 */
export function applySmoothPlayerKnockback(deltaTime, player, colliders) {
  if (!player?.position) return
  if (!player.knockbackVelocity) {
    player.knockbackVelocity = new THREE.Vector3()
    return
  }
  if (player.knockbackVelocity.lengthSq() <= 0.00001) {
    player.knockbackVelocity.set(0, 0, 0)
    return
  }

  const colliderHalf = getPlayerKnockbackHalf(player)
  const ignoredColliders = getIgnoredColliders(player, colliderHalf, colliders)
  const move = player.knockbackVelocity.clone().multiplyScalar(deltaTime)
  let moved = false

  const fullTarget = player.position.clone().add(move)
  if (canOccupyPosition(fullTarget, colliderHalf, colliders, ignoredColliders)) {
    player.position.copy(fullTarget)
    moved = true
  } else {
    const xTarget = player.position.clone().add(new THREE.Vector3(move.x, 0, 0))
    const zTarget = player.position.clone().add(new THREE.Vector3(0, 0, move.z))
    const canX = Math.abs(move.x) > 0.0001 && canOccupyPosition(xTarget, colliderHalf, colliders, ignoredColliders)
    const canZ = Math.abs(move.z) > 0.0001 && canOccupyPosition(zTarget, colliderHalf, colliders, ignoredColliders)

    if (canX && canZ) {
      player.position.copy(Math.abs(move.x) >= Math.abs(move.z) ? xTarget : zTarget)
      moved = true
    } else if (canX) {
      player.position.copy(xTarget)
      moved = true
    } else if (canZ) {
      player.position.copy(zTarget)
      moved = true
    }
  }

  const damping = Math.max(0, 1 - 10.5 * deltaTime)
  player.knockbackVelocity.multiplyScalar(damping)

  if (!moved || player.knockbackVelocity.lengthSq() <= 0.0004) {
    player.knockbackVelocity.set(0, 0, 0)
  }
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function getPlayerKnockbackHalf(player) {
  if (player?.collider?.box) {
    const size = new THREE.Vector3()
    player.collider.box.getSize(size)
    return size.multiplyScalar(0.5)
  }
  return new THREE.Vector3(0.38, 0.9, 0.38)
}

function getIgnoredColliders(player, colliderHalf, colliders) {
  const ignored = new Set()
  if (player?.collider) ignored.add(player.collider)
  const support = findSupportingCollider(player.position, colliderHalf, colliders, player?.collider)
  if (support) ignored.add(support)
  return ignored
}

function findSupportingCollider(position, colliderHalf, colliders, ignoredCollider = null) {
  if (!position || !colliderHalf) return null

  const footY = position.y
  const epsilonY = 0.16
  const inset = 0.04
  const minX = position.x - colliderHalf.x + inset
  const maxX = position.x + colliderHalf.x - inset
  const minZ = position.z - colliderHalf.z + inset
  const maxZ = position.z + colliderHalf.z - inset

  for (const collider of colliders) {
    if (!collider || collider === ignoredCollider || !collider.box) continue
    const box = collider.box
    if (
      Math.abs(box.max.y - footY) <= epsilonY &&
      maxX > box.min.x && minX < box.max.x &&
      maxZ > box.min.z && minZ < box.max.z
    ) {
      return collider
    }
  }
  return null
}

function canOccupyPosition(position, colliderHalf, colliders, ignoredColliders = null) {
  const targetBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position.x, position.y + colliderHalf.y, position.z),
    new THREE.Vector3(colliderHalf.x * 2, colliderHalf.y * 2, colliderHalf.z * 2)
  )
  for (const collider of colliders) {
    if (!collider) continue
    if (ignoredColliders?.has?.(collider)) continue
    if (targetBox.intersectsBox(collider.box)) return false
  }
  return true
}
