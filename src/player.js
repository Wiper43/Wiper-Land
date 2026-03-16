import * as THREE from 'three'

export function createPlayer(camera, input, world, terrain = null) {
  const FLOOR_Y = -100

  // Capsule-ish player settings
  const PLAYER_HEIGHT = 3.6
  const PLAYER_RADIUS = 0.7
  const EYE_OFFSET = 3.4
  const STEP_HEIGHT = 1.0
  const STEP_MAX_FALL_SPEED = 0.1
  const STEP_CAMERA_SMOOTH_SPEED = 14.0

  // Movement tuning
  const GRAVITY = 24
  const JUMP_SPEED = 10
  const MOVE_SPEED = 6.5
  const ACCELERATION = 45
  const AIR_ACCELERATION = 12
  const FRICTION = 14
  const AIR_CONTROL = 0.35

  // Step slowdown tuning
  const STEP_SLOW_TIME = 0.18
  const STEP_MOVE_MULTIPLIER = 0.55

  // position = feet position
  const position = new THREE.Vector3(0, 2, 8)
  const previousPosition = new THREE.Vector3().copy(position)
  const velocity = new THREE.Vector3(0, 0, 0)

  let yaw = 0
  let pitch = 0
  let isGrounded = false
  let jumpQueued = false
  let groundedAtFrameStart = false
  let steppedThisFrame = false
  let visualStepOffset = 0
  let stepSlowTimer = 0

  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const moveDir = new THREE.Vector3()
  const yawEuler = new THREE.Euler(0, 0, 0, 'YXZ')

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
  }

  function applyFriction(deltaTime) {
    if (!isGrounded) return

    const horizontalSpeed = Math.hypot(velocity.x, velocity.z)
    if (horizontalSpeed <= 0.0001) return

    const drop = horizontalSpeed * FRICTION * deltaTime
    const newSpeed = Math.max(0, horizontalSpeed - drop)
    const scale = newSpeed / horizontalSpeed

    velocity.x *= scale
    velocity.z *= scale
  }

  function accelerate(wishDir, wishSpeed, accel, deltaTime) {
    if (wishDir.lengthSq() === 0) return

    const currentSpeed = velocity.x * wishDir.x + velocity.z * wishDir.z
    const addSpeed = wishSpeed - currentSpeed

    if (addSpeed <= 0) return

    const accelSpeed = Math.min(addSpeed, accel * deltaTime * wishSpeed)

    velocity.x += wishDir.x * accelSpeed
    velocity.z += wishDir.z * accelSpeed
  }

  function getBottom() {
    return position.y
  }

  function getTop() {
    return position.y + PLAYER_HEIGHT
  }

  function isSolidVoxelAt(bx, by, bz) {
    if (!terrain || typeof terrain.isSolidBlock !== 'function') return false
    return terrain.isSolidBlock(bx, by, bz)
  }

  function canOccupyVoxelSpaceAt(testX, testY, testZ) {
    if (!terrain) return true

    const minBX = Math.floor(testX - PLAYER_RADIUS)
    const maxBX = Math.floor(testX + PLAYER_RADIUS)
    const minBY = Math.floor(testY)
    const maxBY = Math.floor(testY + PLAYER_HEIGHT - 0.001)
    const minBZ = Math.floor(testZ - PLAYER_RADIUS)
    const maxBZ = Math.floor(testZ + PLAYER_RADIUS)

    for (let by = minBY; by <= maxBY; by++) {
      for (let bz = minBZ; bz <= maxBZ; bz++) {
        for (let bx = minBX; bx <= maxBX; bx++) {
          if (!isSolidVoxelAt(bx, by, bz)) continue

          const overlapsX = testX + PLAYER_RADIUS > bx && testX - PLAYER_RADIUS < bx + 1
          const overlapsY = testY + PLAYER_HEIGHT > by && testY < by + 1
          const overlapsZ = testZ + PLAYER_RADIUS > bz && testZ - PLAYER_RADIUS < bz + 1

          if (overlapsX && overlapsY && overlapsZ) {
            return false
          }
        }
      }
    }

    return true
  }

  function resolveVoxelVerticalCollisions() {
    if (!terrain) return

    const minBX = Math.floor(position.x - PLAYER_RADIUS)
    const maxBX = Math.floor(position.x + PLAYER_RADIUS)
    const minBZ = Math.floor(position.z - PLAYER_RADIUS)
    const maxBZ = Math.floor(position.z + PLAYER_RADIUS)

    if (velocity.y <= 0) {
      const footY = position.y
      const checkBy = Math.floor(footY)

      for (let bz = minBZ; bz <= maxBZ; bz++) {
        for (let bx = minBX; bx <= maxBX; bx++) {
          if (!isSolidVoxelAt(bx, checkBy, bz)) continue

          const blockTop = checkBy + 1
          const wasAbove = previousPosition.y >= blockTop - 0.001
          const crossedTop = position.y <= blockTop && previousPosition.y >= blockTop
          const nearTop = position.y >= blockTop - STEP_HEIGHT

          const xOverlap =
            position.x + PLAYER_RADIUS > bx &&
            position.x - PLAYER_RADIUS < bx + 1

          const zOverlap =
            position.z + PLAYER_RADIUS > bz &&
            position.z - PLAYER_RADIUS < bz + 1

          if (xOverlap && zOverlap && wasAbove && crossedTop && nearTop) {
            position.y = blockTop
            velocity.y = 0
            isGrounded = true
            return
          }
        }
      }
    }

    if (velocity.y > 0) {
      const headY = getTop()
      const checkBy = Math.floor(headY)

      for (let bz = minBZ; bz <= maxBZ; bz++) {
        for (let bx = minBX; bx <= maxBX; bx++) {
          if (!isSolidVoxelAt(bx, checkBy, bz)) continue

          const blockBottom = checkBy
          const previousTop = previousPosition.y + PLAYER_HEIGHT
          const crossedBottom = headY >= blockBottom && previousTop <= blockBottom

          const xOverlap =
            position.x + PLAYER_RADIUS > bx &&
            position.x - PLAYER_RADIUS < bx + 1

          const zOverlap =
            position.z + PLAYER_RADIUS > bz &&
            position.z - PLAYER_RADIUS < bz + 1

          if (xOverlap && zOverlap && crossedBottom) {
            position.y = blockBottom - PLAYER_HEIGHT
            velocity.y = 0
            return
          }
        }
      }
    }
  }

  function resolveVerticalCollisions() {
    isGrounded = false

    const previousBottom = previousPosition.y
    const previousTop = previousPosition.y + PLAYER_HEIGHT

    for (const collider of world.colliders) {
      const box = collider.box

      const xzOverlap =
        position.x + PLAYER_RADIUS > box.min.x &&
        position.x - PLAYER_RADIUS < box.max.x &&
        position.z + PLAYER_RADIUS > box.min.z &&
        position.z - PLAYER_RADIUS < box.max.z

      if (!xzOverlap) continue

      const bottom = getBottom()
      const top = getTop()

      const wasAbove = previousBottom >= box.max.y - 0.001
      const crossedTop = bottom <= box.max.y && previousBottom >= box.max.y
      const nearTop = bottom >= box.max.y - 0.75

      if (velocity.y <= 0 && wasAbove && crossedTop && nearTop) {
        position.y = box.max.y
        velocity.y = 0
        isGrounded = true
        continue
      }

      const wasBelow = previousTop <= box.min.y + 0.001
      const crossedBottom = top >= box.min.y && previousTop <= box.min.y

      if (velocity.y > 0 && wasBelow && crossedBottom) {
        position.y = box.min.y - PLAYER_HEIGHT
        velocity.y = 0
      }
    }

    resolveVoxelVerticalCollisions()

    if (position.y <= FLOOR_Y) {
      position.y = FLOOR_Y
      velocity.y = 0
      isGrounded = true
    }
  }

  function resolveOldWorldHorizontalCollisions() {
    const bottom = getBottom()
    const top = getTop()

    for (const collider of world.colliders) {
      const box = collider.box

      const verticalOverlap = top > box.min.y && bottom < box.max.y
      if (!verticalOverlap) continue

      const closestX = clamp(position.x, box.min.x, box.max.x)
      const closestZ = clamp(position.z, box.min.z, box.max.z)

      let dx = position.x - closestX
      let dz = position.z - closestZ
      const distSq = dx * dx + dz * dz

      if (distSq >= PLAYER_RADIUS * PLAYER_RADIUS) continue

      if (distSq === 0) {
        const leftPen = Math.abs(position.x - box.min.x)
        const rightPen = Math.abs(box.max.x - position.x)
        const backPen = Math.abs(position.z - box.min.z)
        const frontPen = Math.abs(box.max.z - position.z)

        const minPen = Math.min(leftPen, rightPen, backPen, frontPen)

        if (minPen === leftPen) {
          position.x = box.min.x - PLAYER_RADIUS
        } else if (minPen === rightPen) {
          position.x = box.max.x + PLAYER_RADIUS
        } else if (minPen === backPen) {
          position.z = box.min.z - PLAYER_RADIUS
        } else {
          position.z = box.max.z + PLAYER_RADIUS
        }
      } else {
        const dist = Math.sqrt(distSq)
        const nx = dx / dist
        const nz = dz / dist
        const push = PLAYER_RADIUS - dist

        position.x += nx * push
        position.z += nz * push

        const vn = velocity.x * nx + velocity.z * nz
        if (vn < 0) {
          velocity.x -= nx * vn
          velocity.z -= nz * vn
        }
      }
    }
  }

  function tryStepUp(overlapBX, overlapBY, overlapBZ) {
    if (!terrain) return false
    if (steppedThisFrame) return false
    if (!groundedAtFrameStart) return false
    if (velocity.y < -STEP_MAX_FALL_SPEED) return false

    const blockTop = overlapBY + 1
    const stepAmount = blockTop - position.y

    if (stepAmount <= 0.001 || stepAmount > STEP_HEIGHT) {
      return false
    }

    if (!canOccupyVoxelSpaceAt(position.x, blockTop, position.z)) {
      return false
    }

    position.y = blockTop
    velocity.y = 0
    isGrounded = true
    steppedThisFrame = true
    visualStepOffset += stepAmount
    stepSlowTimer = STEP_SLOW_TIME
    return true
  }

  function resolveVoxelHorizontalAxis(axis) {
    if (!terrain) return

    const minBX = Math.floor(position.x - PLAYER_RADIUS)
    const maxBX = Math.floor(position.x + PLAYER_RADIUS)
    const minBY = Math.floor(getBottom())
    const maxBY = Math.floor(getTop() - 0.001)
    const minBZ = Math.floor(position.z - PLAYER_RADIUS)
    const maxBZ = Math.floor(position.z + PLAYER_RADIUS)

    for (let by = minBY; by <= maxBY; by++) {
      for (let bz = minBZ; bz <= maxBZ; bz++) {
        for (let bx = minBX; bx <= maxBX; bx++) {
          if (!isSolidVoxelAt(bx, by, bz)) continue

          const voxelMinX = bx
          const voxelMaxX = bx + 1
          const voxelMinZ = bz
          const voxelMaxZ = bz + 1

          const pMinX = position.x - PLAYER_RADIUS
          const pMaxX = position.x + PLAYER_RADIUS
          const pMinZ = position.z - PLAYER_RADIUS
          const pMaxZ = position.z + PLAYER_RADIUS

          const xOverlap = pMinX < voxelMaxX && pMaxX > voxelMinX
          const zOverlap = pMinZ < voxelMaxZ && pMaxZ > voxelMinZ

          if (!xOverlap || !zOverlap) continue

          if (tryStepUp(bx, by, bz)) {
            return
          }

          if (axis === 'x') {
            if (velocity.x > 0) {
              position.x = voxelMinX - PLAYER_RADIUS
            } else if (velocity.x < 0) {
              position.x = voxelMaxX + PLAYER_RADIUS
            } else {
              const pushLeft = pMaxX - voxelMinX
              const pushRight = voxelMaxX - pMinX
              if (pushLeft < pushRight) {
                position.x -= pushLeft
              } else {
                position.x += pushRight
              }
            }
            velocity.x = 0
          } else if (axis === 'z') {
            if (velocity.z > 0) {
              position.z = voxelMinZ - PLAYER_RADIUS
            } else if (velocity.z < 0) {
              position.z = voxelMaxZ + PLAYER_RADIUS
            } else {
              const pushBack = pMaxZ - voxelMinZ
              const pushFront = voxelMaxZ - pMinZ
              if (pushBack < pushFront) {
                position.z -= pushBack
              } else {
                position.z += pushFront
              }
            }
            velocity.z = 0
          }
        }
      }
    }
  }

  function resolveHorizontalCollisions() {
    position.x += velocity.x * deltaTimeForAxis
    resolveOldWorldHorizontalCollisions()
    resolveVoxelHorizontalAxis('x')

    position.z += velocity.z * deltaTimeForAxis
    resolveOldWorldHorizontalCollisions()
    resolveVoxelHorizontalAxis('z')
  }

  let deltaTimeForAxis = 0

  function update(deltaTime) {
    deltaTimeForAxis = deltaTime
    previousPosition.copy(position)
    groundedAtFrameStart = isGrounded
    steppedThisFrame = false

    if (stepSlowTimer > 0) {
      stepSlowTimer = Math.max(0, stepSlowTimer - deltaTime)
    }

    const { dx, dy } = input.consumeMouseDelta()

    yaw -= dx * input.mouse.sensitivity
    pitch -= dy * input.mouse.sensitivity

    const maxPitch = Math.PI / 2 - 0.01
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch))

    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw
    camera.rotation.x = pitch

    yawEuler.set(0, yaw, 0)

    forward.set(0, 0, -1).applyEuler(yawEuler).normalize()
    right.set(1, 0, 0).applyEuler(yawEuler).normalize()

    moveDir.set(0, 0, 0)

    if (input.keys.forward) moveDir.add(forward)
    if (input.keys.backward) moveDir.sub(forward)
    if (input.keys.left) moveDir.sub(right)
    if (input.keys.right) moveDir.add(right)

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize()
    }

    if (isGrounded) {
      applyFriction(deltaTime)

      const targetMoveSpeed =
        stepSlowTimer > 0 ? MOVE_SPEED * STEP_MOVE_MULTIPLIER : MOVE_SPEED

      accelerate(moveDir, targetMoveSpeed, ACCELERATION, deltaTime)
    } else {
      accelerate(moveDir, MOVE_SPEED * AIR_CONTROL, AIR_ACCELERATION, deltaTime)
    }

    if (input.keys.jump && isGrounded && !jumpQueued) {
      velocity.y = JUMP_SPEED
      isGrounded = false
      jumpQueued = true
      visualStepOffset = 0
      stepSlowTimer = 0
    }

    if (!input.keys.jump) {
      jumpQueued = false
    }

    velocity.y -= GRAVITY * deltaTime

    position.y += velocity.y * deltaTime
    resolveVerticalCollisions()

    resolveHorizontalCollisions()

    const smoothFactor = Math.min(1, STEP_CAMERA_SMOOTH_SPEED * deltaTime)
    visualStepOffset += (0 - visualStepOffset) * smoothFactor
    if (Math.abs(visualStepOffset) < 0.001) {
      visualStepOffset = 0
    }

    camera.position.set(
      position.x,
      position.y + EYE_OFFSET - visualStepOffset,
      position.z
    )
  }

  return {
    update,
    position,
    velocity,
    radius: PLAYER_RADIUS,
    height: PLAYER_HEIGHT,
    get isGrounded() {
      return isGrounded
    }
  }
}
