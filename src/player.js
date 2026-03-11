import * as THREE from 'three'

export function createPlayer(camera, input) {
  const PLAYER_HEIGHT = 2
  const FLOOR_Y = 0
  const EYE_LEVEL = PLAYER_HEIGHT
  const GRAVITY = 20
  const JUMP_SPEED = 8
  const MOVE_SPEED = 6

  const position = new THREE.Vector3(0, PLAYER_HEIGHT, 8)
  const velocity = new THREE.Vector3(0, 0, 0)

  let yaw = 0
  let pitch = 0
  let isGrounded = true
  let jumpQueued = false

  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const moveDir = new THREE.Vector3()
  const yawEuler = new THREE.Euler(0, 0, 0, 'YXZ')

  function update(deltaTime) {
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
      velocity.x = moveDir.x * MOVE_SPEED
      velocity.z = moveDir.z * MOVE_SPEED
    } else {
      velocity.x = 0
      velocity.z = 0
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

    position.x += velocity.x * deltaTime
    position.z += velocity.z * deltaTime
    position.y += velocity.y * deltaTime

    const minY = FLOOR_Y + EYE_LEVEL

    if (position.y <= minY) {
      position.y = minY
      velocity.y = 0
      isGrounded = true
    }

    camera.position.copy(position)
  }

  return {
    update,
    position,
    velocity,
    get isGrounded() {
      return isGrounded
    },
  }
}