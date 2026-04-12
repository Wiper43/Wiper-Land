import './style.css'
import * as THREE from 'three'
import { createGame } from './game/game.js'
import { setActiveWorldPreset } from './world/worldPresets.js'

// ============================================================
// ENTRY POINT
// Creates the game and runs the main loop.
// All system wiring lives in game/game.js.
// All update ordering lives in game/updateLoop.js.
// ============================================================

const app = document.getElementById('app')

boot()

async function boot() {
  try {
    const selectedWorld = await showWorldPicker()
    setActiveWorldPreset(selectedWorld)

    const game = createGame(app)
    const { input, combat, heldItem, beamVisuals, ui } = game

    const tempAimDirection = new THREE.Vector3()

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return
      if (event.code === 'KeyG') {
        const origin = new THREE.Vector3()
        const direction = new THREE.Vector3()
        game.camera.getWorldPosition(origin)
        game.camera.getWorldDirection(direction)
        const foliageHit = game.treeSystem?.destroyFromRay?.(origin, direction, 6)
        const hits = game.blockWorld.traceRayAllHits(origin, direction, 6)
        if (hits.length > 0 && (!foliageHit || hits[0].distance <= foliageHit.distance)) {
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
        game.updateLoop.update(deltaTime, now)

        if (input.consumeAltAttack()) {
          const result = combat.trySecondaryAttack(now)
          let blockSpellResult = null

          if (result.type === 'miss' && result.attack?.kind === 'spell') {
            const foliageOrigin = heldItem.getCastWorldPosition()
            game.camera.getWorldDirection(tempAimDirection)
            game.treeSystem?.destroyFromRay?.(foliageOrigin, tempAimDirection, result.attack.range ?? 8)
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
                duration: 0.10,
                thickness: 0.045,
              })
            }
          }

          if (blockSpellResult?.brokenCount > 0) {
            console.log(`Right Click: ${result.attack?.name ?? 'Spell'} broke ${blockSpellResult.brokenCount} voxel block(s)`)
          } else {
            logCombatResult(result, 'Right Click')
          }
        }

        const selected = combat.attacks[combat.getSelectedRightClickAttack()]
        const movementHint = game.player.flyMode
          ? 'WASD fly | Space up | Shift down | F toggle fly | G break block'
          : 'WASD move | Space jump | F toggle fly | G break block'
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

function showWorldPicker() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 20000;
      display: flex; align-items: center; justify-content: center;
      padding: 28px;
      background:
        radial-gradient(circle at top, rgba(245,236,219,0.92), rgba(185,170,146,0.94)),
        linear-gradient(180deg, #d6c4aa, #8f7a5f);
      font-family: Arial, sans-serif;
    `

    const panel = document.createElement('div')
    panel.style.cssText = `
      width: min(980px, 100%);
      padding: 28px;
      border-radius: 24px;
      border: 1px solid rgba(70,50,32,0.2);
      background: rgba(255,248,238,0.92);
      box-shadow: 0 20px 60px rgba(42,28,18,0.22);
      color: #3f2c1f;
    `

    const title = document.createElement('div')
    title.textContent = 'What world would you like to play'
    title.style.cssText = 'font-size: 34px; font-weight: 800; text-align: center; margin-bottom: 10px;'

    const subtitle = document.createElement('div')
    subtitle.textContent = 'Choose a world to load into the voxel sandbox.'
    subtitle.style.cssText = 'font-size: 15px; text-align: center; opacity: 0.78; margin-bottom: 26px;'

    const grid = document.createElement('div')
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    `

    grid.appendChild(createWorldCard({
      caption: 'World 1',
      description: 'Green ridge country',
      preview: createWorld1Preview(),
      onSelect: () => finish('world1'),
    }))

    grid.appendChild(createWorldCard({
      caption: 'World 2',
      description: 'Brown river valley',
      preview: createWorld2Preview(),
      onSelect: () => finish('world2'),
    }))

    grid.appendChild(createWorldCard({
      caption: 'World 3',
      description: 'Training Grounds',
      preview: createWorld3Preview(),
      onSelect: () => finish('world3'),
    }))

    panel.appendChild(title)
    panel.appendChild(subtitle)
    panel.appendChild(grid)
    overlay.appendChild(panel)
    document.body.appendChild(overlay)

    function finish(worldId) {
      overlay.remove()
      resolve(worldId)
    }
  })
}

function createWorldCard({ caption, description, preview, onSelect }) {
  const card = document.createElement('button')
  card.type = 'button'
  card.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 16px;
    border-radius: 18px;
    cursor: pointer;
    border: 1px solid rgba(78,58,40,0.15);
    background: rgba(255,255,255,0.84);
    color: inherit;
    box-shadow: 0 10px 24px rgba(60,42,25,0.10);
    transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
  `
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-3px)'
    card.style.boxShadow = '0 16px 30px rgba(60,42,25,0.16)'
    card.style.borderColor = 'rgba(112,82,52,0.38)'
  })
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)'
    card.style.boxShadow = '0 10px 24px rgba(60,42,25,0.10)'
    card.style.borderColor = 'rgba(78,58,40,0.15)'
  })
  card.addEventListener('click', onSelect)

  preview.style.width = '100%'
  preview.style.aspectRatio = '16 / 9'
  preview.style.borderRadius = '14px'
  preview.style.border = '1px solid rgba(84,60,38,0.18)'
  preview.style.overflow = 'hidden'

  const captionEl = document.createElement('div')
  captionEl.textContent = caption
  captionEl.style.cssText = 'font-size: 22px; font-weight: 800;'

  const descriptionEl = document.createElement('div')
  descriptionEl.textContent = description
  descriptionEl.style.cssText = 'font-size: 14px; opacity: 0.72;'

  card.appendChild(preview)
  card.appendChild(captionEl)
  card.appendChild(descriptionEl)
  return card
}

function createWorld1Preview() {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 270
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#d3e2ee'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#a8cd95'
  ctx.beginPath()
  ctx.moveTo(0, 220)
  ctx.lineTo(120, 188)
  ctx.lineTo(220, 150)
  ctx.lineTo(330, 164)
  ctx.lineTo(420, 190)
  ctx.lineTo(480, 182)
  ctx.lineTo(480, 270)
  ctx.lineTo(0, 270)
  ctx.closePath()
  ctx.fill()

  for (let i = 0; i < 18; i++) {
    const y = 70 + i * 9
    const slope = 120 - i * 5
    ctx.strokeStyle = i % 2 === 0 ? '#6d5a47' : '#82a873'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(slope + 180, y + 12)
    ctx.stroke()
  }

  ctx.fillStyle = '#eef4f6'
  ctx.beginPath()
  ctx.ellipse(390, 225, 44, 22, 0, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}

function createWorld2Preview() {
  const preview = document.createElement('div')
  preview.style.background = '#ffffff'
  return preview
}

function createWorld3Preview() {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 270
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#d5e2eb'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#9bb380'
  ctx.fillRect(0, 170, canvas.width, 100)

  ctx.fillStyle = '#6a422b'
  ctx.fillRect(110, 108, 16, 92)
  ctx.fillRect(232, 104, 16, 96)
  ctx.fillRect(354, 110, 16, 90)

  ctx.fillStyle = '#c7a56f'
  ctx.fillRect(74, 70, 88, 78)
  ctx.fillRect(196, 66, 88, 78)
  ctx.fillRect(318, 72, 88, 78)

  ctx.fillStyle = '#b53b2d'
  ctx.fillRect(109, 80, 18, 58)
  ctx.fillRect(88, 99, 60, 18)
  ctx.fillRect(231, 76, 18, 58)
  ctx.fillRect(210, 95, 60, 18)
  ctx.fillRect(353, 82, 18, 58)
  ctx.fillRect(332, 101, 60, 18)

  return canvas
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
