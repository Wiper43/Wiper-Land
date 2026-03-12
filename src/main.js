import './style.css'
import { createRenderer } from './renderer.js'
import { createTestWorld } from './world.js'
import { createInput } from './input.js'
import { createPlayer } from './player.js'

const app = document.getElementById('app')

try {
  const game = createRenderer(app)
  const world = createTestWorld(game.scene)

  const input = createInput(game.renderer.domElement)
  const player = createPlayer(game.camera, input, world)

  let lastTime = performance.now()

  function animate(now) {
    requestAnimationFrame(animate)

    const deltaTime = Math.min((now - lastTime) / 1000, 0.033)
    lastTime = now

    try {
      player.update(deltaTime)
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