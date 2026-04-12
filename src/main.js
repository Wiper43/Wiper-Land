import './style.css'
import * as THREE from 'three'
import { createGame } from './game/game.js'
// ============================================================
// ENTRY POINT
// Creates the game and runs the main loop.
// All system wiring lives in game/game.js.
// All update ordering lives in game/updateLoop.js.
// ============================================================

const app = document.getElementById('app')

try {
  const game = createGame(app)
  const { input, combat, heldItem, beamVisuals, ui } = game

  const tempAimDirection = new THREE.Vector3()

  // F-key voxel break (debug / legacy)
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return
    if (event.code === 'KeyF') {
      const origin = new THREE.Vector3()
      const direction = new THREE.Vector3()
      game.camera.getWorldPosition(origin)
      game.camera.getWorldDirection(direction)
      const hits = game.blockWorld.traceRayAllHits(origin, direction, 6)
      if (hits.length > 0) {
        game.blockWorld.breakBlock(hits[0].bx, hits[0].by, hits[0].bz)
      }
    }
  })

  let lastTime = performance.now()

  function animate(now) {
    requestAnimationFrame(animate)

    const deltaTime = Math.min((now - lastTime) / 1000, 0.033)
    lastTime = now

    try {
      // Run all ordered system updates
      game.updateLoop.update(deltaTime, now)

      // --------------------------------------------------------
      // LEFT CLICK = DIRECT ATTACK
      // --------------------------------------------------------
      if (input.consumeAttack()) {
        const result = combat.tryPrimaryAttack(now)
        if (result.type !== 'cooldown') ui.playAttackSlash()
        logCombatResult(result, 'Left Click')
      }

      // --------------------------------------------------------
      // RIGHT CLICK = SPELL ATTACK
      // --------------------------------------------------------
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

          beamVisuals.spawnBeam({
            start: beamStart,
            direction: tempAimDirection,
            length: beamLength,
            color: beamColor,
            duration: 0.10,
            thickness: 0.045,
          })
        }

        if (blockSpellResult?.brokenCount > 0) {
          console.log(`Right Click: ${result.attack?.name ?? 'Spell'} broke ${blockSpellResult.brokenCount} voxel block(s)`)
        } else {
          logCombatResult(result, 'Right Click')
        }
      }

      // Hint text
      const selected = combat.attacks[combat.getSelectedRightClickAttack()]
      ui.setHint(`WASD move • Space jump • Left: Direct Attack • Right: ${selected?.name ?? 'None'}`)

    } catch (err) {
      showError('FRAME ERROR', err)
      throw err
    }
  }

  animate(performance.now())

} catch (err) {
  showError('STARTUP ERROR', err)
}

function logCombatResult(result, label) {
  if (result.type === 'cooldown') {
    console.log(`${label}: cooldown ${Math.ceil(result.cooldownRemainingMs)}ms`)
  } else if (result.type === 'miss') {
    console.log(`${label}: ${result.attack?.name ?? 'Attack'} missed`)
  } else if (result.type === 'blocked') {
    console.log(`${label}: blocked by ${result.entity?.name ?? result.entity?.type}`)
  } else if (result.type === 'damage') {
    console.log(`${label}: ${result.attack?.name ?? 'Attack'} hit ${result.entity?.name ?? result.entity?.type} for ${result.damage}`)
  } else if (result.type === 'no-effect') {
    console.log(`${label}: no effect`)
  }
}

function showError(label, err) {
  console.error(label, err)
  const pre = document.createElement('pre')
  pre.style.cssText = `
    position:fixed; top:10px; left:10px; right:10px; padding:12px;
    background:rgba(0,0,0,0.85); color:#ff6b6b; font-size:14px;
    white-space:pre-wrap; z-index:99999;
  `
  pre.textContent = `${label}\n${err?.stack || err}`
  document.body.appendChild(pre)
}
