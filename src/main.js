import './style.css'
import * as THREE from 'three'
import { createRenderer } from './renderer.js'
import { createTestWorld } from './world.js'
import { createInput } from './input.js'
import { createPlayer } from './player.js'
import { createUI } from './ui.js'

const app = document.getElementById('app')

try {
  const game = createRenderer(app)
  const input = createInput(game.renderer.domElement)
  createUI()

  const audioListener = new THREE.AudioListener()
  game.camera.add(audioListener)

  const audioLoader = new THREE.AudioLoader()

  const worldAudio = {
    listener: audioListener,
    mooBuffer: null,
  }
/*
fetch('/sounds/cow-moo')
  .then((r) => {
    console.log('sound fetch status:', r.status, r.headers.get('content-type'))
    return r.arrayBuffer()
  })
  .then((buf) => {
    console.log('sound byte length:', buf.byteLength)
  })
  .catch((err) => {
    console.error('sound fetch failed:', err)
  })
*/
  audioLoader.load(
    '/sounds/cow-moo.wav',
    (buffer) => {
      worldAudio.mooBuffer = buffer
      console.log('Loaded cow moo sound')
    },
    undefined,
    (err) => {
      console.error('Failed to load cow moo sound:', err)
    }
  )

  // Important: unlock browser audio on first click
  function unlockAudio() {
    if (audioListener.context.state === 'suspended') {
      audioListener.context.resume().then(() => {
        console.log('Audio context resumed')
      }).catch((err) => {
        console.error('Failed to resume audio context:', err)
      })
    }
  }

  window.addEventListener('pointerdown', unlockAudio, { passive: true })

  const world = createTestWorld(game.scene, worldAudio)
  const player = createPlayer(game.camera, input, world)

  const raycaster = new THREE.Raycaster()
  const ATTACK_RANGE = 3

  let lastTime = performance.now()

  function animate(now) {
    requestAnimationFrame(animate)

    const deltaTime = Math.min((now - lastTime) / 1000, 0.033)
    lastTime = now

    try {
      player.update(deltaTime)

      for (const entity of world.entities) {
        if (!entity.isDead && entity.update) {
          entity.update(deltaTime, game.camera, player)
        }
      }

      if (input.consumeAttack()) {
        performBasicAttack(raycaster, game.camera, world, ATTACK_RANGE)
      }

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

function performBasicAttack(raycaster, camera, world, attackRange) {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera)
  raycaster.near = 0
  raycaster.far = attackRange

  const hittableMeshes = []
  const meshToEntity = new Map()

  for (const entity of world.entities) {
    if (entity.isDead) continue
    if (!entity.mesh) continue

    entity.mesh.traverse((child) => {
      if (!child.isMesh) return
      hittableMeshes.push(child)
      meshToEntity.set(child, entity)
    })
  }

  const hits = raycaster.intersectObjects(hittableMeshes, false)

  if (hits.length === 0) {
    console.log('Attack missed')
    return
  }

  for (const hit of hits) {
    const entity = meshToEntity.get(hit.object)

    if (!entity || entity.isDead) continue

    if (entity.canTakeDamage) {
      entity.takeDamage(10)
      return
    }

    if (entity.blocksAttack) {
      console.log(`Attack blocked by ${entity.name ?? entity.type}`)
      return
    }
  }

  console.log('Attack hit nothing damageable')
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