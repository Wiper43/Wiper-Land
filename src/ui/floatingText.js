import * as THREE from 'three'

// ============================================================
// TEXT SPRITE HELPERS
// Used by health bars, floating damage numbers, etc.
// ============================================================

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export function createTextSprite(
  text,
  {
    fontSize = 36,
    textColor = '#ffffff',
    backgroundColor = 'rgba(0, 0, 0, 0.6)',
    borderColor = 'rgba(255,255,255,0.2)',
    borderWidth = 2,
    defaultBorderWidth = 2,
    defaultBorderColor,
    minWorldWidth = 1.0,
    worldHeight = 0.35,
    paddingX = 18,
    paddingY = 12,
  } = {}
) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  const font = `bold ${fontSize}px Arial`
  context.font = font

  const metrics = context.measureText(text)
  const textWidth = Math.ceil(metrics.width)
  const borderPad = Math.max(0, Math.ceil(borderWidth))
  const width = textWidth + paddingX * 2 + borderPad * 2
  const height = fontSize + paddingY * 2 + borderPad * 2

  canvas.width = width
  canvas.height = height

  context.font = font
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  roundRect(context, 0, 0, width, height, 12)
  context.fillStyle = backgroundColor
  context.fill()

  context.lineWidth = borderWidth
  context.strokeStyle = borderColor
  context.stroke()

  context.fillStyle = textColor
  context.fillText(text, width / 2, height / 2 + 1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const aspect = width / height
  const worldWidth = Math.max(minWorldWidth, worldHeight * aspect)

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })

  const sprite = new THREE.Sprite(material)
  sprite.scale.set(worldWidth, worldHeight, 1)
  sprite.userData.textCanvas = canvas
  sprite.userData.textContext = context
  sprite.userData.textOptions = {
    fontSize,
    textColor,
    backgroundColor,
    borderColor,
    borderWidth,
    defaultBorderColor: defaultBorderColor || borderColor,
    defaultBorderWidth: defaultBorderWidth || borderWidth,
    minWorldWidth,
    worldHeight,
    paddingX,
    paddingY,
  }
  sprite.userData.currentText = text

  return sprite
}

export function updateTextSprite(sprite, text) {
  if (!sprite) return

  const options = sprite.userData.textOptions || {}
  const oldMaterial = sprite.material
  const oldTexture = oldMaterial.map

  const newSprite = createTextSprite(text, options)

  sprite.material = newSprite.material
  sprite.scale.copy(newSprite.scale)
  sprite.userData = newSprite.userData

  if (oldTexture) oldTexture.dispose()
  if (oldMaterial) oldMaterial.dispose()
}

export function disposeTextSprite(sprite) {
  if (!sprite) return
  if (sprite.material) {
    if (sprite.material.map) sprite.material.map.dispose()
    sprite.material.dispose()
  }
}

// ============================================================
// FLOATING DAMAGE TEXT SYSTEM
// ============================================================

export function createFloatingTextSystem(scene) {
  const activeTexts = []

  function spawn(position, amount, color = '#ffd36b') {
    const sprite = createTextSprite(`-${amount}`, {
      fontSize: 42,
      textColor: color,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      borderColor: 'rgba(255, 211, 107, 0.35)',
      minWorldWidth: 0.9,
      worldHeight: 0.42,
    })

    sprite.position.copy(position)
    sprite.renderOrder = 1001
    scene.add(sprite)

    activeTexts.push({ sprite, age: 0, life: 0.75, riseSpeed: 1.15 })
  }

  function update(deltaTime) {
    for (let i = activeTexts.length - 1; i >= 0; i--) {
      const item = activeTexts[i]
      item.age += deltaTime

      const t = item.age / item.life
      item.sprite.position.y += item.riseSpeed * deltaTime

      const material = item.sprite.material
      if (material) {
        material.opacity = Math.max(0, 1 - t)
        material.transparent = true
      }

      if (item.age >= item.life) {
        scene.remove(item.sprite)
        disposeTextSprite(item.sprite)
        activeTexts.splice(i, 1)
      }
    }
  }

  return { spawn, update, activeTexts }
}
