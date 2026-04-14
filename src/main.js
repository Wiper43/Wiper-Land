import './style.css'
import * as THREE from 'three'
import { createGame } from './game/game.js'
import { setActiveWorldPreset } from './world/worldPresets.js'

const app = document.getElementById('app')

boot()

async function boot() {
  try {
    setActiveWorldPreset('globe')

    const game = createGame(app)
    const { input, combat, heldItem, beamVisuals, ui } = game
    const tempAimDirection = new THREE.Vector3()

    window.addEventListener('keydown', (event) => {
      if (event.repeat || event.code !== 'KeyG') return

      const origin = new THREE.Vector3()
      const direction = new THREE.Vector3()
      game.camera.getWorldPosition(origin)
      game.camera.getWorldDirection(direction)

      const hits = game.blockWorld.traceRayAllHits(origin, direction, 8)
      if (hits.length > 0) {
        game.blockWorld.breakBlock(hits[0].faceIdx, hits[0].bx, hits[0].by, hits[0].bz)
      }
    })

    let lastTime = performance.now()

    function animate(now) {
      requestAnimationFrame(animate)

      const deltaTime = Math.min((now - lastTime) / 1000, 0.033)
      lastTime = now

      try {
        game.updateLoop.update(deltaTime, now)

        if (input.consumeAltAttack()) {
          const result = combat.trySecondaryAttack(now)
          let blockSpellResult = null

          if (result.type === 'miss' && result.attack?.kind === 'spell') {
            blockSpellResult = game.applySpellToVoxelBlocks(result.attack)
          }

          if (result.type !== 'cooldown' && result.attack) {
            heldItem.cast()

            const beamStart = heldItem.getCastWorldPosition()
            game.camera.getWorldDirection(tempAimDirection)

            const beamLength =
              typeof result.hitDistance === 'number'
                ? result.hitDistance
                : (result.attack.range ?? 8)

            const lowered = `${result.attack.id || ''} ${result.attack.name || ''}`.toLowerCase()
            let beamColor = 0xff8a4a
            if (lowered.includes('water')) beamColor = 0x66ccff
            else if (lowered.includes('flame')) beamColor = 0xff6a3d

            if (lowered.includes('flame')) {
              beamVisuals.spawnFireball({
                start: beamStart,
                direction: tempAimDirection,
                length: beamLength,
                duration: 0.5,
              })
            } else {
              beamVisuals.spawnBeam({
                start: beamStart,
                direction: tempAimDirection,
                length: beamLength,
                color: beamColor,
                duration: 0.1,
                thickness: 0.045,
              })
            }
          }

          if (blockSpellResult?.brokenCount > 0) {
            console.log(
              `Right Click: ${result.attack?.name ?? 'Spell'} broke ${blockSpellResult.brokenCount} voxel block(s)`
            )
          } else {
            logCombatResult(result, 'Right Click')
          }
        }

        const selected = combat.attacks[combat.getSelectedRightClickAttack()]
        const movementHint = game.player.flyMode
          ? 'WASD fly | Space lift | Shift dive | X coreward | F toggle fly | M map'
          : 'WASD walk | Space jump | F toggle fly | G break block | M map'
        ui.setHint(`${movementHint} | Hold Left: Fire Bomb | Right: ${selected?.name ?? 'None'}`)
      } catch (err) {
        showError('FRAME ERROR', err)
        throw err
      }
    }

    animate(performance.now())
  } catch (err) {
    showError('STARTUP ERROR', err)
  }
}

function logCombatResult(result, label) {
  if (result.type === 'cooldown') {
    console.log(`${label}: cooldown ${Math.ceil(result.cooldownRemainingMs)}ms`)
  } else if (result.type === 'miss') {
    console.log(`${label}: ${result.attack?.name ?? 'Attack'} missed`)
  } else if (result.type === 'blocked') {
    console.log(`${label}: blocked by ${result.entity?.name ?? result.entity?.type}`)
  } else if (result.type === 'damage') {
    console.log(
      `${label}: ${result.attack?.name ?? 'Attack'} hit ${result.entity?.name ?? result.entity?.type} for ${result.damage}`
    )
  } else if (result.type === 'no-effect') {
    console.log(`${label}: no effect`)
  }
}

function showError(label, err) {
  console.error(label, err)
  const pre = document.createElement('pre')
  pre.style.cssText = `
    position: fixed; top: 10px; left: 10px; right: 10px; padding: 12px;
    background: rgba(0,0,0,0.85); color: #ff6b6b; font-size: 14px;
    white-space: pre-wrap; z-index: 99999;
  `
  pre.textContent = `${label}\n${err?.stack || err}`
  document.body.appendChild(pre)
}
