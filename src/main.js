import './style.css'
import * as THREE from 'three'
import { createRenderer } from './renderer.js'
import { createTestWorld } from './world.js'
import { createInput } from './input.js'
import { createPlayer } from './player.js'
import { createUI } from './ui.js'

const app = document.getElementById('app')

try {
  // ------------------------------------------------------------
  // Core game setup
  // ------------------------------------------------------------
  const game = createRenderer(app)
  const world = createTestWorld(game.scene)

  const input = createInput(game.renderer.domElement)
  const player = createPlayer(game.camera, input, world)
  const ui = createUI()

  // Raycaster used for combat hitscan attacks
  const raycaster = new THREE.Raycaster()

  // Attack can only hit within this distance
  const ATTACK_RANGE = 3

  let lastTime = performance.now()

  function animate(now) {
    requestAnimationFrame(animate)

    const deltaTime = Math.min((now - lastTime) / 1000, 0.033)
    lastTime = now

    try {
      // --------------------------------------------------------
      // Update player movement / camera
      // --------------------------------------------------------
      player.update(deltaTime)

      // Update player movement / camera
      for (const enemy of world.enemies) {
  if (!enemy.isDead && enemy.update) {
    enemy.update(deltaTime)
  }
}

      // --------------------------------------------------------
      // Combat: left click basic attack
      // --------------------------------------------------------
      if (input.consumeAttack()) {
        performBasicAttack(raycaster, game.camera, world, ATTACK_RANGE)
      }

      // --------------------------------------------------------
      // Render frame
      // --------------------------------------------------------
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

// --------------------------------------------------------------
// Performs a simple short-range hitscan / raycast basic attack
// Rules:
// 1. Attack only reaches ATTACK_RANGE units
// 2. If a wall/block is hit before the enemy, the enemy does not get hit
// --------------------------------------------------------------
function performBasicAttack(raycaster, camera, world, attackRange) {
  // Cast from center of screen
  raycaster.setFromCamera({ x: 0, y: 0 }, camera)

  // Limit total ray distance
  raycaster.near = 0
  raycaster.far = attackRange

  // ------------------------------------------------------------
  // Gather enemy meshes
  // ------------------------------------------------------------
  const enemyMeshes = []

  for (const enemy of world.enemies) {
    if (enemy.isDead) continue

    enemy.mesh.traverse((child) => {
      if (child.isMesh) {
        enemyMeshes.push(child)
      }
    })
  }

  // ------------------------------------------------------------
  // Gather world blocker meshes
  // These are the boxes/walls that can stop the attack
  // ------------------------------------------------------------
  const blockerMeshes = world.colliders.map(collider => collider.mesh)

  // ------------------------------------------------------------
  // Raycast against enemies and blockers separately
  // ------------------------------------------------------------
  const enemyHits = raycaster.intersectObjects(enemyMeshes, false)
  const blockerHits = raycaster.intersectObjects(blockerMeshes, false)

  const nearestEnemyHit = enemyHits.length > 0 ? enemyHits[0] : null
  const nearestBlockerHit = blockerHits.length > 0 ? blockerHits[0] : null

  // No enemy in range at all
  if (!nearestEnemyHit) {
    console.log('Attack missed')
    return
  }

  // If a wall/block is closer than the enemy, the attack is blocked
  if (nearestBlockerHit && nearestBlockerHit.distance < nearestEnemyHit.distance) {
    console.log('Attack blocked by wall')
    return
  }

  // ------------------------------------------------------------
  // Find which enemy owns the hit mesh
  // ------------------------------------------------------------
  const hitObject = nearestEnemyHit.object

  const enemy = world.enemies.find((e) => {
    let found = false

    e.mesh.traverse((child) => {
      if (child === hitObject) {
        found = true
      }
    })

    return found
  })

  if (!enemy || enemy.isDead) return

  enemy.takeDamage(10)
}

// --------------------------------------------------------------
// Debug overlay for startup / runtime errors
// Helps prevent white screen with no clue why
// --------------------------------------------------------------
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