export function createInput(canvas) {
  // ============================================================
  // KEYBOARD STATE
  // ------------------------------------------------------------
  // Keep the exact structure player.js already expects.
  // ============================================================
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  }

  // ============================================================
  // MOUSE STATE
  // ------------------------------------------------------------
  // Keep the exact structure player.js already expects:
  // input.mouse.sensitivity
  // input.consumeMouseDelta() -> { dx, dy }
  // ============================================================
  const mouse = {
    deltaX: 0,
    deltaY: 0,
    sensitivity: 0.002,
  }

  // ============================================================
  // ATTACK INPUT
  // ------------------------------------------------------------
  // leftAttack  = normal direct attack
  // rightAttack = spellbook / alternate attack
  // ============================================================
  let leftAttack = false
  let rightAttack = false

  // ============================================================
  // POINTER LOCK
  // ------------------------------------------------------------
  // Click canvas to lock mouse for FPS camera control.
  // ============================================================
  canvas.addEventListener('click', () => {
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock()
    }
  })

  // ============================================================
  // KEYBOARD INPUT
  // ============================================================
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

  // ============================================================
  // MOUSE LOOK
  // ------------------------------------------------------------
  // Only record movement while pointer is locked.
  // ============================================================
  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return

    mouse.deltaX += e.movementX
    mouse.deltaY += e.movementY
  })

  // ============================================================
  // MOUSE ATTACKS
  // ------------------------------------------------------------
  // Left click  = direct attack
  // Right click = selected spellbook attack
  // Only works while pointer is locked.
  // ============================================================
  canvas.addEventListener('mousedown', (event) => {
    if (document.pointerLockElement !== canvas) return

    if (event.button === 0) {
      leftAttack = true
    }

    if (event.button === 2) {
      rightAttack = true
    }
  })

  // Prevent browser context menu on right click
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault()
  })

  // ============================================================
  // PUBLIC API
  // ------------------------------------------------------------
  // Keep compatibility with your existing player.js
  // while adding consumeAltAttack() for right click.
  // ============================================================
  return {
    keys,
    mouse,

    get attack() {
      return leftAttack
    },

    consumeAttack() {
      const current = leftAttack
      leftAttack = false
      return current
    },

    consumeAltAttack() {
      const current = rightAttack
      rightAttack = false
      return current
    },

    consumeMouseDelta() {
      const dx = mouse.deltaX
      const dy = mouse.deltaY

      mouse.deltaX = 0
      mouse.deltaY = 0

      return { dx, dy }
    },
  }
}