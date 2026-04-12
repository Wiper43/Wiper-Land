import * as THREE from 'three'

// ============================================================
// UPDATE LOOP
// Owns the strict, ordered update sequence.
// Order matters — change with care.
// ============================================================

export function createUpdateLoop(game) {
  const mapFacingDirection = new THREE.Vector3()

  function update(deltaTime, now) {
    // 1. Player intent + movement
    game.player.update(deltaTime)

    // 2. Held item animation
    game.heldItem.update(deltaTime)

    // 2b. Left-click Fire Bomb charge + projectile
    game.fireBombs?.update?.(deltaTime)

    // 3. Entity AI + movement (includes cows, spiders, etc.)
    game.entitySystem.update(deltaTime, game.camera, game.player)

    // 4. Block world (regen, chunk updates)
    game.blockWorld.update(deltaTime, game.player)

    // 4b. Trees + foliage
    game.treeSystem?.update?.(deltaTime, game.player)

    // 5. Spawn system (wave management)
    game.spawning.update(deltaTime)

    // 6. Player knockback (after movement systems)
    if (game.colliders && game.player.knockbackVelocity) {
      game.damageSystem.applySmoothPlayerKnockback(deltaTime, game.player, game.colliders)
    }

    // 7. Beam visuals
    game.beamVisuals.update(deltaTime)

    // 8. Attack beams (cow attack lines)
    updateAttackBeams(deltaTime, game.attackBeams, game.scene)

    // 9. Floating text
    game.floatingText.update(deltaTime)

    // 10. Sync health bars to camera
    game.entitySystem.syncHealthBars(game.camera)

    // 11. Nav grid rebuild if dirty
    if (game.navDirty || game.navRebuildCooldown <= 0) {
      game.navGrid.rebuild(game.colliders)
      game.navDirty = false
      game.navRebuildCooldown = 0.5
    } else {
      game.navRebuildCooldown -= deltaTime
    }

    // 12. Overlay / HUD update
    game.overlays.tickSurvivalTime(deltaTime)
    game.overlays.updatePlayerUI(
      game.spawning.currentWaveIndex,
      game.spawning.waveCount,
      game.spawning.getAliveCowCount()
    )
    game.camera.getWorldDirection(mapFacingDirection)
    game.ui.updateMapPlayerPosition(game.player.position, mapFacingDirection)
    game.updateSky?.(deltaTime)

    // 13. Legacy world update (blocks, nav debug)
    if (game.legacyWorld) {
      game.legacyWorld.update(deltaTime, game.camera, game.player)
    }

    // 14. Render
    game.renderer.render(game.scene, game.camera)
  }

  return { update }
}

function updateAttackBeams(deltaTime, attackBeams, scene) {
  if (!attackBeams) return
  for (let i = attackBeams.length - 1; i >= 0; i--) {
    const item = attackBeams[i]
    item.age += deltaTime
    const t = item.age / item.life
    item.updateVisual?.(t)
    if (item.line?.material) {
      item.line.material.transparent = true
      item.line.material.opacity = Math.max(0, 1 - t)
    }
    if (item.age >= item.life) {
      if (item.cleanup) {
        item.cleanup()
      }
      if (item.line) {
        scene.remove(item.line)
        item.line.geometry?.dispose?.()
        item.line.material?.dispose?.()
      }
      attackBeams.splice(i, 1)
    }
  }
}
