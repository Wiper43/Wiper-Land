import './style.css'
import { createRenderer } from './renderer.js'
import { createTestWorld } from './world.js'
import { createInput } from './input.js'
import { createPlayer } from './player.js'

const app = document.getElementById('app')

const game = createRenderer(app)
createTestWorld(game.scene)

const input = createInput(game.renderer.domElement)
const player = createPlayer(game.camera, input)

let lastTime = performance.now()

function animate(now) {
  requestAnimationFrame(animate)

  const deltaTime = Math.min((now - lastTime) / 1000, 0.033)
  lastTime = now

  player.update(deltaTime)

  game.renderer.render(game.scene, game.camera)
}

animate(performance.now())