import * as THREE from 'three'

export function createPlayer(camera, input, world) {
  const FLOOR_Y = 0

  // Capsule-ish player settings
  const PLAYER_HEIGHT = 1.8
  const PLAYER_RADIUS = 0.35
  const EYE_OFFSET = 1.7

  // Movement tuning
  const GRAVITY = 24
  const JUMP_SPEED = 10
  const MOVE_SPEED = 6.5
  const ACCELERATION = 45
  const AIR_ACCELERATION = 12
  const FRICTION = 14
  const AIR_CONTROL = 0.35

  // position = feet position
  const position = new THREE.Vector3(0, FLOOR_Y, 8)
  const previousPosition = new THREE.Vector3().copy(position)
  const velocity = new THREE.Vector3(0, 0, 0)

  let yaw = 0
  let pitch = 0
  let isGrounded = true
  let jumpQueued = false

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

    if (position.y <= FLOOR_Y) {
      position.y = FLOOR_Y
      velocity.y = 0
      isGrounded = true
    }
  }

  function resolveHorizontalCollisions() {
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
          dx = -1
          dz = 0
        } else if (minPen === rightPen) {
          position.x = box.max.x + PLAYER_RADIUS
          dx = 1
          dz = 0
        } else if (minPen === backPen) {
          position.z = box.min.z - PLAYER_RADIUS
          dx = 0
          dz = -1
        } else {
          position.z = box.max.z + PLAYER_RADIUS
          dx = 0
          dz = 1
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

  function update(deltaTime) {
    previousPosition.copy(position)

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
      accelerate(moveDir, MOVE_SPEED, ACCELERATION, deltaTime)
    } else {
      accelerate(moveDir, MOVE_SPEED * AIR_CONTROL, AIR_ACCELERATION, deltaTime)
    }

    if (input.keys.jump && isGrounded && !jumpQueued) {
      velocity.y = JUMP_SPEED
      isGrounded = false
      jumpQueued = true
    }

    if (!input.keys.jump) {
      jumpQueued = false
    }

    velocity.y -= GRAVITY * deltaTime

    position.y += velocity.y * deltaTime
    resolveVerticalCollisions()

    position.x += velocity.x * deltaTime
    position.z += velocity.z * deltaTime
    resolveHorizontalCollisions()

    camera.position.set(
      position.x,
      position.y + EYE_OFFSET,
      position.z
    )
  }

  return {
    update,
    position,
    velocity,
    get isGrounded() {
      return isGrounded
    }
  }
}