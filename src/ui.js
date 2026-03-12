export function createUI() {
  // ------------------------------------------------------------
  // Root UI container
  // ------------------------------------------------------------
  const root = document.createElement('div')
  root.style.position = 'fixed'
  root.style.inset = '0'
  root.style.pointerEvents = 'none'
  root.style.zIndex = '1000'

  // ------------------------------------------------------------
  // Crosshair
  // ------------------------------------------------------------
  const crosshair = document.createElement('div')
  crosshair.style.position = 'absolute'
  crosshair.style.left = '50%'
  crosshair.style.top = '50%'
  crosshair.style.transform = 'translate(-50%, -50%)'
  crosshair.style.width = '14px'
  crosshair.style.height = '14px'
  crosshair.style.display = 'flex'
  crosshair.style.alignItems = 'center'
  crosshair.style.justifyContent = 'center'
  crosshair.style.color = 'white'
  crosshair.style.fontSize = '18px'
  crosshair.style.fontFamily = 'monospace'
  crosshair.style.textShadow = '0 0 4px rgba(0,0,0,0.9)'
  crosshair.textContent = '+'

  // ------------------------------------------------------------
  // Optional hint text
  // ------------------------------------------------------------
  const hint = document.createElement('div')
  hint.style.position = 'absolute'
  hint.style.left = '50%'
  hint.style.bottom = '24px'
  hint.style.transform = 'translateX(-50%)'
  hint.style.color = 'white'
  hint.style.fontFamily = 'sans-serif'
  hint.style.fontSize = '14px'
  hint.style.textShadow = '0 0 4px rgba(0,0,0,0.9)'
  hint.textContent = 'WASD to move • Space to jump • Left Click to attack'

  root.appendChild(crosshair)
  root.appendChild(hint)
  document.body.appendChild(root)

  return {
    root,
    crosshair,
    hint,

    setHint(text) {
      hint.textContent = text
    },

    remove() {
      root.remove()
    }
  }
}