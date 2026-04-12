import { createTextSprite, updateTextSprite, disposeTextSprite } from './floatingText.js'

// ============================================================
// HEALTH BAR CREATION
// ============================================================

export function createHealthBar(entity, label, options = {}) {
  const text = `${label}: ${entity.health} / ${entity.maxHealth}`
  return createTextSprite(text, {
    fontSize: 38,
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    defaultBorderColor: 'rgba(255,255,255,0.2)',
    defaultBorderWidth: 2,
    minWorldWidth: 1.7,
    worldHeight: 0.34,
    ...options,
  })
}

// ============================================================
// HEALTH BAR UPDATES
// ============================================================

export function updateHealthBarText(entity, prefix = null) {
  if (!entity.healthText) return

  const label = prefix
    ? `${prefix}: ${entity.health} / ${entity.maxHealth}`
    : `${entity.health} / ${entity.maxHealth}`

  updateTextSprite(entity.healthText, label)
}

export function updateHealthBarBorder(entity, borderColor = null) {
  if (!entity?.healthText) return

  const options = { ...(entity.healthText.userData?.textOptions || {}) }
  const fallback = options.defaultBorderColor || 'rgba(255,255,255,0.2)'
  options.borderColor = borderColor || fallback
  options.borderWidth = borderColor
    ? (options.defaultBorderWidth || 2) * 4
    : (options.defaultBorderWidth || 2)

  const label =
    entity.healthText.userData?.currentText ||
    (entity.maxHealth !== undefined ? `${entity.health} / ${entity.maxHealth}` : '')

  const oldMaterial = entity.healthText.material
  const oldTexture = oldMaterial?.map

  const newSprite = createTextSprite(label, options)

  entity.healthText.material = newSprite.material
  entity.healthText.scale.copy(newSprite.scale)
  entity.healthText.userData = newSprite.userData

  if (oldTexture) oldTexture.dispose()
  if (oldMaterial) oldMaterial.dispose()
}

// ============================================================
// SYNC HEALTH BARS TO FACE CAMERA
// ============================================================

export function syncEntityHealthBar(entity, camera) {
  if (!entity.healthText || entity.isDead) return

  const anchor = entity.getAnchorPosition
    ? entity.getAnchorPosition()
    : entity.mesh.position.clone()

  entity.healthText.position.copy(anchor)

  if (camera) {
    entity.healthText.quaternion.copy(camera.quaternion)
  }
}

export function syncAllHealthBars(entities, camera) {
  for (const entity of entities) {
    if (!entity || entity.isDead) continue
    syncEntityHealthBar(entity, camera)
  }
}

// ============================================================
// HIT FLASH
// ============================================================

export function flashMeshes(root) {
  const touched = []

  root.traverse((child) => {
    if (!child.isMesh || !child.material || !child.material.color) return

    const material = child.material
    touched.push({
      material,
      original: material.color.clone(),
      emissive: material.emissive ? material.emissive.clone() : null,
    })

    material.color.offsetHSL(0, 0, 0.18)

    if (material.emissive) {
      material.emissive.setRGB(0.25, 0.18, 0.08)
    }
  })

  setTimeout(() => {
    for (const item of touched) {
      item.material.color.copy(item.original)
      if (item.material.emissive && item.emissive) {
        item.material.emissive.copy(item.emissive)
      }
    }
  }, 90)
}

export { disposeTextSprite }
