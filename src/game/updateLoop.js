import * as THREE from 'three'

export function createUpdateLoop(game) {
  const mapFacingDirection = new THREE.Vector3()
  let fpsSampleTimer = 0
  let fpsFrameCount = 0
  let smoothedFPS = 0

  function update(deltaTime, _now) {
    fpsSampleTimer += deltaTime
    fpsFrameCount += 1
    if (fpsSampleTimer >= 0.25) {
      const instantFPS = fpsFrameCount / Math.max(0.0001, fpsSampleTimer)
      smoothedFPS = smoothedFPS <= 0
        ? instantFPS
        : THREE.MathUtils.lerp(smoothedFPS, instantFPS, 0.35)
      game.ui?.setFPS?.(Math.round(smoothedFPS))
      fpsSampleTimer = 0
      fpsFrameCount = 0
    }

    game.player.update(deltaTime)
    game.heldItem.update(deltaTime)
    game.fireBombs?.update?.(deltaTime)
    game.entitySystem?.update?.(deltaTime, game.camera, game.player)
    game.blockWorld?.update?.(deltaTime, game.player)
    game.treeSystem?.update?.(deltaTime, game.player)
    game.spawning?.update?.(deltaTime)

    if (game.colliders && game.player.knockbackVelocity) {
      game.damageSystem.applySmoothPlayerKnockback(deltaTime, game.player, game.colliders)
    }

    game.beamVisuals?.update?.(deltaTime)
    updateAttackBeams(deltaTime, game.attackBeams, game.scene)
    game.floatingText?.update?.(deltaTime)
    game.entitySystem?.syncHealthBars?.(game.camera)

    game.overlays?.tickSurvivalTime?.(deltaTime)
    game.overlays?.updatePlayerUI?.(
      game.spawning?.currentWaveIndex ?? 0,
      game.spawning?.waveCount ?? 0,
      game.spawning?.getAliveCowCount?.() ?? 0,
    )

    game.camera.getWorldDirection(mapFacingDirection)
    game.ui?.updateCompass?.(game.player.position, mapFacingDirection)
    game.ui?.updateMapPlayerPosition?.(game.player.position, mapFacingDirection)
    game.updateSky?.(deltaTime)
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
      if (item.cleanup) item.cleanup()
      if (item.line) {
        scene.remove(item.line)
        item.line.geometry?.dispose?.()
        item.line.material?.dispose?.()
      }
      attackBeams.splice(i, 1)
    }
  }
}
