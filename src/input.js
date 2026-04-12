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
    descend: false,
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

  // Clamp huge one-frame spikes so the camera doesn't randomly whip.
  const MAX_MOUSE_DELTA = 40
  const DEBUG_MOUSE_SPIKES = true

  function resetMouseDelta() {
    mouse.deltaX = 0
    mouse.deltaY = 0
  }

  // ============================================================
  // ATTACK INPUT
  // ------------------------------------------------------------
  // leftAttack  = normal direct attack
  // rightAttack = spellbook / alternate attack
  // ============================================================
  let leftAttack = false
  let rightAttack = false
  let toggleFly = false
  let leftHeld = false
  let leftReleased = false

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

  // Reset stored mouse deltas when pointer lock changes so stale
  // movement does not get applied on the next frame.
  document.addEventListener('pointerlockchange', () => {
    resetMouseDelta()
  })

  // Also clear on blur in case the tab loses focus during mouse movement.
  window.addEventListener('blur', () => {
    resetMouseDelta()
    leftHeld = false
    leftReleased = false
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
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.descend = true
        break
      case 'KeyF':
        toggleFly = true
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
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.descend = false
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
      leftHeld = true
    }

    if (event.button === 2) {
      rightAttack = true
    }
  })

  canvas.addEventListener('mouseup', (event) => {
    if (document.pointerLockElement !== canvas) return

    if (event.button === 0) {
      if (leftHeld) leftReleased = true
      leftHeld = false
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

    isPrimaryHeld() {
      return leftHeld
    },

    consumePrimaryRelease() {
      const current = leftReleased
      leftReleased = false
      return current
    },

    consumeAltAttack() {
      const current = rightAttack
      rightAttack = false
      return current
    },

    consumeToggleFly() {
      const current = toggleFly
      toggleFly = false
      return current
    },

    consumeMouseDelta() {
      const rawDx = mouse.deltaX
      const rawDy = mouse.deltaY

      if (
        DEBUG_MOUSE_SPIKES &&
        (Math.abs(rawDx) > MAX_MOUSE_DELTA || Math.abs(rawDy) > MAX_MOUSE_DELTA)
      ) {
        console.log('Mouse spike detected', {
          rawDx,
          rawDy,
          clampedDx: Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, rawDx)),
          clampedDy: Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, rawDy)),
          pointerLocked: document.pointerLockElement === canvas,
        })
      }

      const dx = Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, rawDx))
      const dy = Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, rawDy))

      resetMouseDelta()

      return { dx, dy }
    },
  }
}
