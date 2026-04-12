// ============================================================
// ENTITY UI
// Re-exports shared UI helpers for entity use.
// Thin layer so entity files import from one place.
// ============================================================

export {
  createHealthBar,
  updateHealthBarText,
  updateHealthBarBorder,
  syncEntityHealthBar,
  flashMeshes,
  disposeTextSprite,
} from '../ui/healthBars.js'

export { createTextSprite, updateTextSprite } from '../ui/floatingText.js'
