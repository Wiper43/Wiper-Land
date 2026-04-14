import * as THREE from 'three'
import { createRenderer } from '../renderer.js'
import { createInput } from '../input.js'
import { createPlayer } from '../player.js'
import { createUI } from '../ui.js'
import { createCombatSystem } from '../combat/combatSystem.js'
import { applySmoothPlayerKnockback } from '../combat/damageSystem.js'
import { createHeldItem } from '../heldItem.js'
import { createBeamVisualSystem } from '../beamVisual.js'
import { SphereWorld } from '../world/sphere/sphereWorld.js'
import { SPHERE_RADIUS } from '../world/sphere/cubeSphereCoords.js'
import { createEntitySystem } from '../entities/entitySystem.js'
import { createFloatingTextSystem } from '../ui/floatingText.js'
import { createOverlaySystem } from '../ui/overlays.js'
import { createUpdateLoop } from './updateLoop.js'
import { getBlockHitPoints } from '../world/blocks.js'
import { createFireBombSystem } from '../combat/fireBombSystem.js'

export function createGame(appElement) {
  const { scene, camera, renderer, updateSky } = createRenderer(appElement)
  const input = createInput(renderer.domElement)
  const ui = createUI()

  const colliders = []
  const blockWorld = new SphereWorld(scene)
  const entitySystem = createEntitySystem()
  const heldItem = createHeldItem(camera)
  const floatingText = createFloatingTextSystem(scene)
  const overlays = createOverlaySystem()
  const attackBeams = []
  const beamVisuals = createBeamVisualSystem(scene)

  createPoleTower(scene, new THREE.Vector3(0, 1, 0), 0xb63a32, 'NORTH POLE')
  createPoleTower(scene, new THREE.Vector3(0, -1, 0), 0xe8edf6, 'SOUTH POLE')
  createPoleBeacon(scene, new THREE.Vector3(0, 1, 0), 0xff4242, 520)
  createPoleBeacon(scene, new THREE.Vector3(0, -1, 0), 0xf8fbff, 520)

  const legacyWorldStub = { colliders, entities: [], markNavDirty: () => {} }
  const player = createPlayer(camera, input, legacyWorldStub, blockWorld)
  player.position.set(0, -(SPHERE_RADIUS + 2), 0)

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
    colliders,
    entitySystem,
    floatingText,
    overlays,
    beamVisuals,
    attackBeams,
    fireBombs: null,
    damageSystem: { applySmoothPlayerKnockback },
    navDirty: false,
    navRebuildCooldown: 0,
    treeSystem: null,
    spawning: createIdleSpawningState(),

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

    damagePlayer(playerRef, amount, sourcePosition = null, pushStrength = 1.35) {
      overlays.damagePlayer(playerRef, amount, sourcePosition, pushStrength)
    },
  }

  game.fireBombs = createFireBombSystem(game)

  const combat = createCombatSystem({
    camera,
    getEntities: () => entitySystem.getAttackable(),
  })
  game.combat = combat

  const updateLoop = createUpdateLoop(game)
  game.updateLoop = updateLoop

  game.applySpellToVoxelBlocks = function applySpellToVoxelBlocks(attackData) {
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
        if (blockWorld.breakBlock(hit.faceIdx, hit.bx, hit.by, hit.bz)) {
          remainingPower -= hp
          brokenCount++
        }
      } else {
        return { brokenCount, stoppedOn: hit, remainingPower }
      }
    }

    return { brokenCount, stoppedOn: null, remainingPower }
  }

  ui.setCowVolume(0)
  ui.onCowVolumeChange(() => {})

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

  overlays.initPlayerState(player)

  return game
}

function createIdleSpawningState() {
  return {
    currentWaveIndex: 0,
    waveCount: 0,
    update() {},
    setCowVolume() {},
    setCowSoundBuffer() {},
    getAliveCowCount() { return 0 },
  }
}

function createPoleBeacon(scene, direction, color, height) {
  const dir = direction.clone().normalize()
  const group = new THREE.Group()
  group.position.copy(dir).multiplyScalar(SPHERE_RADIUS + height * 0.5 + 28)
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 14, height, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  )
  group.add(beam)

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, height, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  )
  group.add(core)

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(24, 18, 18),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )
  cap.position.y = height * 0.5
  group.add(cap)

  scene.add(group)
  return group
}

function createPoleTower(scene, direction, color, labelText) {
  const dir = direction.clone().normalize()
  const localUp = new THREE.Vector3(0, 1, 0)
  const towerSize = 20
  const towerHeight = 20

  const group = new THREE.Group()
  group.position.copy(dir).multiplyScalar(SPHERE_RADIUS + towerHeight * 0.5)
  group.quaternion.setFromUnitVectors(localUp, dir)

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(towerSize, towerHeight, towerSize),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      metalness: 0.02,
    })
  )
  group.add(tower)

  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(towerSize + 2, 2, towerSize + 2),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).clone().lerp(new THREE.Color(0xffffff), 0.2),
      roughness: 0.85,
      metalness: 0.02,
    })
  )
  cap.position.y = towerHeight * 0.5 + 1
  group.add(cap)

  const label = createPoleLabel(labelText, color)
  label.position.y = towerHeight * 0.5 + 16
  group.add(label)

  scene.add(group)
  return group
}

function createPoleLabel(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)'
  ctx.fillRect(24, 20, canvas.width - 48, canvas.height - 40)
  ctx.strokeStyle = `#${new THREE.Color(color).getHexString()}`
  ctx.lineWidth = 6
  ctx.strokeRect(24, 20, canvas.width - 48, canvas.height - 40)
  ctx.fillStyle = '#f6f8ff'
  ctx.font = 'bold 48px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(70, 17.5, 1)
  return sprite
}
