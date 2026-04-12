// ============================================================
// IDLE BEHAVIOR
// Entity does nothing, plays a subtle sway animation
// ============================================================

export function runIdle(entity, deltaTime) {
  if (!entity.moveTime) entity.moveTime = 0
  entity.moveTime += deltaTime

  const SWAY_SPEED = 2.0
  const SWAY_AMOUNT = 0.02
  const sway = Math.sin(entity.moveTime * SWAY_SPEED) * SWAY_AMOUNT
  if (entity.mesh) entity.mesh.rotation.y += sway * deltaTime * 6
}
