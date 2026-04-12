import * as THREE from 'three'
import { createRenderer } from '../renderer.js'
import { createInput } from '../input.js'
import { createPlayer } from '../player.js'
import { createUI } from '../ui.js'
import { createCombatSystem } from '../combat/combatSystem.js'
import { applySmoothPlayerKnockback } from '../combat/damageSystem.js'
import { createHeldItem } from '../heldItem.js'
import { createBeamVisualSystem } from '../beamVisual.js'
import { BlockWorld } from '../world/blockWorld.js'
import { createNavGrid } from '../navGrid.js'
import { createEntitySystem } from '../entities/entitySystem.js'
import { createSpawnSystem } from '../spawning/spawnSystem.js'
import { createFloatingTextSystem } from '../ui/floatingText.js'
import { createOverlaySystem } from '../ui/overlays.js'
import { createDropSystem } from '../loot/dropSystem.js'
import { createUpdateLoop } from './updateLoop.js'
import { getBlockHitPoints } from '../world/blocks.js'
import { createTreeSystem } from '../world/treeSystem.js'
import { getActiveWorldPreset } from '../world/worldPresets.js'
import { createTargetDummy } from '../entities/props/targetDummy.js'
import { createFireBombSystem } from '../combat/fireBombSystem.js'

// ============================================================
// GAME CONTAINER
// The new root runtime object. Owns references to all systems.
// Replaces the tangled wiring in the old main.js.
// ============================================================

export function createGame(appElement) {
  const activePreset = getActiveWorldPreset()
  const navWorldSize = activePreset.worldSize ?? 384
  const navWorldOrigin = -navWorldSize / 2

  // --------------------------------------------------------
  // RENDERER + SCENE
  // --------------------------------------------------------
  const { scene, camera, renderer, updateSky } = createRenderer(appElement)
  const input = createInput(renderer.domElement)
  const ui = createUI()

  // --------------------------------------------------------
  // AUDIO
  // --------------------------------------------------------
  const audioListener = new THREE.AudioListener()
  camera.add(audioListener)
  const audioLoader = new THREE.AudioLoader()
  const audio = { listener: audioListener, mooBuffer: null }

  // --------------------------------------------------------
  // WORLD + NAV
  // --------------------------------------------------------
  const colliders = []
  const blockWorld = new BlockWorld(scene)
  const navGrid = createNavGrid({
    worldSize: navWorldSize,
    cellSize: 1,
    origin: new THREE.Vector3(navWorldOrigin, 0, navWorldOrigin),
    agentRadius: 0.95,
    maxClimbStep: 1.25,
  })

  // --------------------------------------------------------
  // PLAYER
  // --------------------------------------------------------
  // Player needs a minimal world-like object for old collider code
  const legacyWorldStub = { colliders, entities: [], markNavDirty: () => { game.navDirty = true } }
  const player = createPlayer(camera, input, legacyWorldStub, blockWorld)
  const heldItem = createHeldItem(camera)

  // --------------------------------------------------------
  // ENTITY SYSTEM
  // --------------------------------------------------------
  const entitySystem = createEntitySystem()
  const treeSystem = createTreeSystem(scene, blockWorld, colliders, entitySystem, () => {
    game.navDirty = true
  })

  // --------------------------------------------------------
  // UI SYSTEMS
  // --------------------------------------------------------
  const floatingText = createFloatingTextSystem(scene)
  const overlays = createOverlaySystem()
  overlays.ensurePlayerUI()

  // --------------------------------------------------------
  // ATTACK BEAMS (cow line-based beams, separate from spell beams)
  // --------------------------------------------------------
  const attackBeams = []
  const beamVisuals = createBeamVisualSystem(scene)

  // --------------------------------------------------------
  // GAME OBJECT (assembled before systems that reference it)
  // --------------------------------------------------------
  const game = {
    scene,
    camera,
    renderer,
    updateSky,
    input,
    ui,
    player,
    heldItem,
    blockWorld,
    treeSystem,
    colliders,
    navGrid,
    navDirty: true,
    navRebuildCooldown: 0,
    entitySystem,
    floatingText,
    overlays,
    beamVisuals,
    attackBeams,
    fireBombs: null,
    cowVolume: 0.8,
    audio,
    damageSystem: { applySmoothPlayerKnockback },

    // Convenience methods used by entity modules
    spawnFloatingDamage(position, amount, color = '#ffd36b') {
      floatingText.spawn(position, amount, color)
    },

    spawnAttackBeam(fromPosition, toPosition, color = 0xff4444, life = 0.18) {
      const material = new THREE.LineBasicMaterial({ color })
      const geometry = new THREE.BufferGeometry().setFromPoints([
        fromPosition.clone(),
        toPosition.clone(),
      ])
      const line = new THREE.Line(geometry, material)
      scene.add(line)
      attackBeams.push({ line, age: 0, life })
    },

    damagePlayer(player, amount, sourcePosition = null, pushStrength = 1.35) {
      overlays.damagePlayer(player, amount, sourcePosition, pushStrength)
    },
  }

  game.fireBombs = createFireBombSystem(game)

  // --------------------------------------------------------
  // COMBAT
  // --------------------------------------------------------
  const combat = createCombatSystem({
    camera,
    getEntities: () => entitySystem.getAttackable(),
  })

  game.combat = combat

  // --------------------------------------------------------
  // SPAWN SYSTEM
  // --------------------------------------------------------
  const spawning = createSpawnSystem(game, {
    audio,
    waveConfig: activePreset.id === 'world3' ? [] : undefined,
  })
  game.spawning = spawning

  if (activePreset.id === 'world3') {
    spawnTrainingDummies(game)
  }

  // --------------------------------------------------------
  // DROP SYSTEM
  // --------------------------------------------------------
  game.drops = createDropSystem(game)

  // --------------------------------------------------------
  // UPDATE LOOP
  // --------------------------------------------------------
  const updateLoop = createUpdateLoop(game)
  game.updateLoop = updateLoop

  // --------------------------------------------------------
  // VOXEL BLOCK SPELL ATTACK
  // --------------------------------------------------------
  game.applySpellToVoxelBlocks = function (attackData) {
    const origin = new THREE.Vector3()
    const direction = new THREE.Vector3()
    camera.getWorldPosition(origin)
    camera.getWorldDirection(direction)

    const hits = blockWorld.traceRayAllHits(origin, direction, attackData.range ?? 6)
    let remainingPower = attackData.basePower ?? 0
    let brokenCount = 0

    for (const hit of hits) {
      const hp = getBlockHitPoints(hit.blockId)
      if (remainingPower >= hp) {
        if (blockWorld.breakBlock(hit.bx, hit.by, hit.bz)) {
          remainingPower -= hp
          brokenCount++
        }
      } else {
        return { brokenCount, stoppedOn: hit, remainingPower }
      }
    }

    return { brokenCount, stoppedOn: null, remainingPower }
  }

  // --------------------------------------------------------
  // AUDIO LOAD
  // --------------------------------------------------------
  audioLoader.load(
    '/sounds/cow-moo.wav',
    (buffer) => {
      audio.mooBuffer = buffer
      spawning.setCowSoundBuffer(buffer)
    },
    undefined,
    (err) => console.error('Failed to load cow moo sound:', err)
  )

  window.addEventListener('pointerdown', () => {
    if (audioListener.context.state === 'suspended') {
      audioListener.context.resume().catch(() => {})
    }
  }, { passive: true })

  // --------------------------------------------------------
  // UI WIRING
  // --------------------------------------------------------
  ui.setCowVolume(0.8)
  ui.onCowVolumeChange((value) => {
    game.cowVolume = value
    spawning.setCowVolume(value)
  })

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

  // --------------------------------------------------------
  // INIT PLAYER STATE FOR OVERLAYS
  // --------------------------------------------------------
  overlays.initPlayerState(player)

  return game
}

function spawnTrainingDummies(game) {
  const dummyPositions = [
    new THREE.Vector3(-8, 0.02, -8),
    new THREE.Vector3(0, 0.02, -4),
    new THREE.Vector3(8, 0.02, -10),
  ]

  for (const position of dummyPositions) {
    const dummy = createTargetDummy(game, position)
    game.entitySystem.add(dummy)
  }
}
