export function createInput(canvas) {
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false
  }

  const mouse = {
    deltaX: 0,
    deltaY: 0,
    sensitivity: 0.002
  }

  let attack = false

  // ------------------------------------------------------------
  // Pointer lock
  // Click canvas to lock mouse for FPS camera control
  // ------------------------------------------------------------
  canvas.addEventListener('click', () => {
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock()
    }
  })

  // ------------------------------------------------------------
  // Keyboard input
  // ------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW':
        keys.forward = true
        break
      case 'KeyS':
        keys.backward = true
        break
      case 'KeyA':
        keys.left = true
        break
      case 'KeyD':
        keys.right = true
        break
      case 'Space':
        keys.jump = true
        break
    }
  })

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
        keys.forward = false
        break
      case 'KeyS':
        keys.backward = false
        break
      case 'KeyA':
        keys.left = false
        break
      case 'KeyD':
        keys.right = false
        break
      case 'Space':
        keys.jump = false
        break
    }
  })

  // ------------------------------------------------------------
  // Mouse look
  // Only record movement while pointer is locked
  // This avoids weird lag / drift / mismatch feeling
  // ------------------------------------------------------------
  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return

    mouse.deltaX += e.movementX
    mouse.deltaY += e.movementY
  })

  // ------------------------------------------------------------
  // Left click attack
  // Only attack while pointer is locked
  // ------------------------------------------------------------
  canvas.addEventListener('mousedown', (event) => {
    if (document.pointerLockElement !== canvas) return

    if (event.button === 0) {
      attack = true
    }
  })

  return {
    keys,
    mouse,

    get attack() {
      return attack
    },

    consumeAttack() {
      const current = attack
      attack = false
      return current
    },

    consumeMouseDelta() {
      const dx = mouse.deltaX
      const dy = mouse.deltaY

      mouse.deltaX = 0
      mouse.deltaY = 0

      return { dx, dy }
    }
  }
}