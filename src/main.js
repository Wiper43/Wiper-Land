import './style.css'
import * as THREE from 'three'
import { createRenderer } from './renderer.js'
import { createTestWorld } from './world.js'
import { createInput } from './input.js'
import { createPlayer } from './player.js'
import { createUI } from './ui.js'
import { createCombat } from './combat.js'
import { createHeldItem } from './heldItem.js'
import { createBeamVisualSystem } from './beamVisual.js'
import { updateCow } from "./cowAI.js"
import { createNavGrid } from "./navGrid.js"
import { BlockWorld } from './world/blockWorld.js'
import { worldToBlock } from './world/worldMath.js'
import { getBlockHitPoints } from './world/blocks.js'

const app = document.getElementById('app')

try {
  const game = createRenderer(app)
  const input = createInput(game.renderer.domElement)
  const ui = createUI()

  const audioListener = new THREE.AudioListener()
  game.camera.add(audioListener)

  const audioLoader = new THREE.AudioLoader()

  const worldAudio = {
    listener: audioListener,
    mooBuffer: null,
  }

  const world = createTestWorld(game.scene, worldAudio)
  const blockWorld = new BlockWorld(game.scene)

  //DEBUG LINE

  
//debug line
  const player = createPlayer(game.camera, input, world,blockWorld)
  const combat = createCombat({
    camera: game.camera,
    world,
  })
  const heldItem = createHeldItem(game.camera)
  const beamVisuals = createBeamVisualSystem(game.scene)
  const tempAimDirection = new THREE.Vector3()

  // ============================================================
  // LOAD COW AUDIO
  // ============================================================
  audioLoader.load(
    '/sounds/cow-moo.wav',
    (buffer) => {
      worldAudio.mooBuffer = buffer
      console.log('Loaded cow moo sound')

      if (typeof world.setCowSoundBuffer === 'function') {
        world.setCowSoundBuffer(buffer)
      }
    },
    undefined,
    (err) => {
      console.error('Failed to load cow moo sound:', err)
    }
  )

  function unlockAudio() {
    if (audioListener.context.state === 'suspended') {
      audioListener.context
        .resume()
        .then(() => {
          console.log('Audio context resumed')
        })
        .catch((err) => {
          console.error('Failed to resume audio context:', err)
        })
    }
  }

  window.addEventListener('pointerdown', unlockAudio, { passive: true })

  // ============================================================
  // OPTIONS UI -> AUDIO
  // ============================================================
  ui.setCowVolume(0.8)
  if (typeof world.setCowVolume === 'function') {
    world.setCowVolume(0.8)
  }

  ui.onCowVolumeChange((value) => {
    if (typeof world.setCowVolume === 'function') {
      world.setCowVolume(value)
    }
  })

  // ============================================================
  // SPELLBOOK UI -> COMBAT
  // ============================================================
  function refreshSpellbook() {
    ui.setSpellbookAttacks(
      combat.getAttackList(),
      combat.getSelectedRightClickAttack(),
      (attackId) => {
        combat.setSelectedRightClickAttack(attackId)
        refreshSpellbook()
      }
    )
  }

  refreshSpellbook()

  let lastTime = performance.now()
/////////////////////////////////////
/////////ATTACK/////////////////
//inserting trybreakvoxelblock()
function tryBreakVoxelBlock() {
  const origin = new THREE.Vector3()
  const direction = new THREE.Vector3()

  game.camera.getWorldPosition(origin)
  game.camera.getWorldDirection(direction)

  const maxDistance = 6
  const hits = blockWorld.traceRayAllHits(origin, direction, maxDistance)

if (hits.length > 0) {
  const hit = hits[0]

  const broke = blockWorld.breakBlock(hit.bx, hit.by, hit.bz)

  console.log('Break voxel block:', hit)

  return
}

  console.log('No voxel block found in range')
}
function applySpellToVoxelBlocks(attackData) {
  const origin = new THREE.Vector3()
  const direction = new THREE.Vector3()

  game.camera.getWorldPosition(origin)
  game.camera.getWorldDirection(direction)

  const hits = blockWorld.traceRayAllHits(origin, direction, attackData.range ?? 6)

  let remainingPower = attackData.basePower ?? 0
  let brokenCount = 0

  for (const hit of hits) {
    const hp = getBlockHitPoints(hit.blockId)

    if (remainingPower >= hp) {
      const broke = blockWorld.breakBlock(hit.bx, hit.by, hit.bz)

      if (broke) {
        remainingPower -= hp
        brokenCount++
      }
    } else {
      return {
        brokenCount,
        stoppedOn: hit,
        remainingPower,
      }
    }
  }

  return {
    brokenCount,
    stoppedOn: null,
    remainingPower,
  }
}
window.addEventListener('keydown', (event) => {
  if (event.repeat) return

  if (event.code === 'KeyF') {
    tryBreakVoxelBlock()
  }
})
//inserting trybreakvoxelblock()

  function animate(now) {
    requestAnimationFrame(animate)

    const deltaTime = Math.min((now - lastTime) / 1000, 0.033)
    lastTime = now

    try {
      player.update(deltaTime)
      heldItem.update(deltaTime)
      beamVisuals.update(deltaTime)
      world.update(deltaTime, game.camera, player)
      blockWorld.update(deltaTime, player)

      // --------------------------------------------------------
      // LEFT CLICK = DIRECT ATTACK
      // --------------------------------------------------------
      if (input.consumeAttack()) {
        const result = combat.tryPrimaryAttack(now)

        if (result.type !== 'cooldown') {
          ui.playAttackSlash()
        }

        logCombatResult(result, 'Left Click')
      }

      // --------------------a------------------------------------
      // RIGHT CLICK = SPELLBOOK ATTACK
      // --------------------------------------------------------
      if (input.consumeAltAttack()) {
  const result = combat.trySecondaryAttack(now)
  
  
  let blockSpellResult = null

if (result.type === 'miss' && result.attack?.kind === 'spell') {
  blockSpellResult = applySpellToVoxelBlocks(result.attack)

  if (blockSpellResult.brokenCount > 0) {
    console.log('Right Click: spell broke voxel blocks', blockSpellResult)
  }
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

    if (lowered.includes('water')) {
      beamColor = 0x66ccff
    } else if (lowered.includes('flame')) {
      beamColor = 0xff6a3d
    }

    beamVisuals.spawnBeam({
      start: beamStart,
      direction: tempAimDirection,
      length: beamLength,
      color: beamColor,
      duration: 0.10,
      thickness: 0.045,
    })
  }
  //debug
const testDir = { x: 1, y: -1, z: 0 };

console.log(
  "Ray hits:",
  blockWorld.traceRayAllHits(
    {
      x: Math.floor(player.position.x),
      y: Math.floor(player.position.y),
      z: Math.floor(player.position.z)
    },
    testDir,
    12
  )
);
//debug
// console.log("Player pos:", player.position);
// console.log(
//   "Block at player feet:",
//   blockWorld.getBlockId(
//     Math.floor(player.position.x),
//     Math.floor(player.position.y - 1),
//     Math.floor(player.position.z)
//   )
// );
// console.log(
//   "Is solid at feet:",
//   blockWorld.isSolidBlock(
//     Math.floor(player.position.x),
//     Math.floor(player.position.y - 1),
//     Math.floor(player.position.z)
//   )
// );
//debg
  if (blockSpellResult?.brokenCount > 0) {
  console.log(`Right Click: ${result.attack?.name ?? 'Spell'} broke ${blockSpellResult.brokenCount} voxel block(s)`)
} else {
  logCombatResult(result, 'Right Click')
}
}

      const selected = combat.attacks[combat.getSelectedRightClickAttack()]
      ui.setHint(
        `WASD move • Space jump • Left: Direct Attack • Right: ${selected?.name ?? 'None'}`
      )

      game.renderer.render(game.scene, game.camera)
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
  pre.style.position = 'fixed'
  pre.style.top = '10px'
  pre.style.left = '10px'
  pre.style.right = '10px'
  pre.style.padding = '12px'
  pre.style.background = 'rgba(0, 0, 0, 0.85)'
  pre.style.color = '#ff6b6b'
  pre.style.fontSize = '14px'
  pre.style.whiteSpace = 'pre-wrap'
  pre.style.zIndex = '99999'
  pre.textContent = `${label}\n${err?.stack || err}`
  document.body.appendChild(pre)
}