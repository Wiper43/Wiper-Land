export function createInput(canvas) {
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  }

  const mouse = {
    deltaX: 0,
    deltaY: 0,
    sensitivity: 0.0025,
    locked: false,
  }

  function onKeyDown(event) {
    switch (event.code) {
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
  }

  function onKeyUp(event) {
    switch (event.code) {
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
  }

  function onMouseMove(event) {
    if (!mouse.locked) return
    mouse.deltaX += event.movementX
    mouse.deltaY += event.movementY
  }

  function lockPointer() {
    canvas.requestPointerLock()
  }

  document.addEventListener('pointerlockchange', () => {
    mouse.locked = document.pointerLockElement === canvas
  })

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('click', lockPointer)

  return {
    keys,
    mouse,
    consumeMouseDelta() {
      const dx = mouse.deltaX
      const dy = mouse.deltaY
      mouse.deltaX = 0
      mouse.deltaY = 0
      return { dx, dy }
    },
  }
}