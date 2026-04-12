import * as THREE from 'three'

// ============================================================
// OVERLAY SYSTEM
// Owns: player HP UI, wave messages, victory/game-over screens
// ============================================================

export function createOverlaySystem() {
  let playerState = { maxHealth: 100, health: 100, ui: null }
  let survivalTime = 0
  let isGameOver = false
  let isVictory = false
  let waveOverlay = null
  let gameOverOverlay = null
  let waveMessageTimeout = null
  let knockbackVelocity = new THREE.Vector3()

  const playerDamageSound = createBrowserSound('/sounds/take-damage-sound.mp3')

  // --------------------------------------------------------
  // PLAYER HP UI
  // --------------------------------------------------------
  function ensurePlayerUI() {
    if (playerState.ui || typeof document === 'undefined') return

    const wrap = document.createElement('div')
    wrap.style.cssText = `
      position:fixed; left:16px; top:16px; z-index:10000;
      padding:10px 14px; border:3px solid rgba(255,255,255,0.35);
      background:rgba(0,0,0,0.62); color:#ffffff;
      font-family:Arial,sans-serif; font-weight:700; font-size:18px;
      border-radius:10px; box-shadow:0 0 16px rgba(0,0,0,0.35);
    `
    const hp = document.createElement('div')
    const time = document.createElement('div')
    time.style.cssText = 'margin-top:6px; font-size:15px; font-weight:600; opacity:0.95;'
    wrap.appendChild(hp)
    wrap.appendChild(time)
    document.body.appendChild(wrap)
    playerState.ui = { wrap, hp, time }
  }

  function updatePlayerUI(waveIndex, waveCount, aliveCowCount) {
    if (!playerState.ui) return

    const { wrap, hp, time } = playerState.ui
    const hpValue = Math.max(0, Math.round(playerState.health))
    const maxHp = Math.max(1, Math.round(playerState.maxHealth))
    const displayedWave = Math.max(1, Math.min(waveIndex + 1, waveCount))

    hp.textContent = `Player HP: ${hpValue} / ${maxHp}`
    time.textContent = `Time: ${survivalTime.toFixed(1)}s • Round: ${displayedWave}/${waveCount} • Cows Left: ${aliveCowCount}`

    const hpRatio = hpValue / maxHp
    if (hpRatio > 0.6) {
      wrap.style.borderColor = 'rgba(120, 255, 120, 0.55)'
    } else if (hpRatio > 0.3) {
      wrap.style.borderColor = 'rgba(255, 210, 90, 0.75)'
    } else {
      wrap.style.borderColor = 'rgba(255, 90, 90, 0.9)'
    }
  }

  function tickSurvivalTime(deltaTime) {
    if (!isGameOver) survivalTime += deltaTime
  }

  // --------------------------------------------------------
  // PLAYER DAMAGE
  // --------------------------------------------------------
  function damagePlayer(player, amount, sourcePosition = null, pushStrength = 1.35) {
    if (!player || isGameOver) return

    if (player.maxHealth == null) player.maxHealth = 100
    if (player.health == null) player.health = 100
    if (!player.knockbackVelocity) player.knockbackVelocity = new THREE.Vector3()

    player.health = Math.max(0, player.health - amount)
    playerState.health = player.health
    playerState.maxHealth = player.maxHealth

    if (sourcePosition && player.position) {
      const push = new THREE.Vector3(
        player.position.x - sourcePosition.x,
        0,
        player.position.z - sourcePosition.z
      )
      if (push.lengthSq() > 0.0001) {
        push.normalize().multiplyScalar(pushStrength)
        player.knockbackVelocity.add(push)
      }
    }

    try {
      if (playerDamageSound) {
        playerDamageSound.currentTime = 0
        const p = playerDamageSound.play()
        if (p?.catch) p.catch(() => {})
      }
    } catch (_) {}

    if (player.health <= 0) {
      player.isDead = true
      playerState.health = 0
      triggerGameOver()
    }
  }

  function initPlayerState(player) {
    if (!player) return
    if (player.maxHealth == null) player.maxHealth = 100
    if (player.health == null) player.health = 100
    if (player.isDead == null) player.isDead = false
    if (!player.knockbackVelocity) player.knockbackVelocity = new THREE.Vector3()
    playerState.maxHealth = player.maxHealth
    playerState.health = player.health
  }

  // --------------------------------------------------------
  // WAVE MESSAGE
  // --------------------------------------------------------
  function showWaveMessage(title, subtitle = '', duration = 1.6) {
    if (typeof document === 'undefined') return

    if (!waveOverlay) {
      const overlay = document.createElement('div')
      overlay.style.cssText = `
        position:fixed; left:50%; top:90px; transform:translateX(-50%);
        z-index:10002; pointer-events:none; padding:16px 24px;
        border-radius:14px; border:3px solid rgba(255,255,255,0.2);
        background:rgba(0,0,0,0.72); color:#ffffff;
        font-family:Arial,sans-serif; text-align:center;
        box-shadow:0 0 24px rgba(0,0,0,0.28); opacity:0; transition:opacity 0.18s ease;
      `
      const titleEl = document.createElement('div')
      titleEl.style.cssText = 'font-size:30px; font-weight:900; letter-spacing:1.5px;'
      const subtitleEl = document.createElement('div')
      subtitleEl.style.cssText = 'font-size:18px; margin-top:6px; opacity:0.92;'
      overlay.appendChild(titleEl)
      overlay.appendChild(subtitleEl)
      document.body.appendChild(overlay)
      waveOverlay = { root: overlay, titleEl, subtitleEl }
    }

    const { root, titleEl, subtitleEl } = waveOverlay
    titleEl.textContent = title
    subtitleEl.textContent = subtitle
    subtitleEl.style.display = subtitle ? 'block' : 'none'
    root.style.opacity = '1'

    if (waveMessageTimeout) clearTimeout(waveMessageTimeout)
    waveMessageTimeout = setTimeout(() => {
      if (waveOverlay?.root) waveOverlay.root.style.opacity = '0'
    }, Math.max(150, duration * 1000))
  }

  // --------------------------------------------------------
  // VICTORY
  // --------------------------------------------------------
  function triggerVictory() {
    if (isVictory || typeof document === 'undefined') return
    isVictory = true

    if (gameOverOverlay?.parentNode) gameOverOverlay.parentNode.removeChild(gameOverOverlay)

    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10003;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.84); font-family:Arial,sans-serif;
    `
    const panel = document.createElement('div')
    panel.style.cssText = `
      min-width:340px; max-width:92vw; padding:28px 26px;
      border-radius:14px; border:4px solid rgba(120,255,120,0.9);
      background:rgba(8,25,8,0.95); color:#ffffff; text-align:center;
      box-shadow:0 0 26px rgba(80,255,120,0.25);
    `
    const title = document.createElement('div')
    title.textContent = 'VICTORY'
    title.style.cssText = 'font-size:38px; font-weight:900; letter-spacing:2px; margin-bottom:14px;'

    const summary = document.createElement('div')
    summary.textContent = `Remaining Health: ${Math.max(0, Math.round(playerState.health))} / ${Math.max(1, Math.round(playerState.maxHealth))}`
    summary.style.cssText = 'font-size:20px; margin-bottom:10px;'

    const timeEl = document.createElement('div')
    timeEl.textContent = `Time Spent: ${survivalTime.toFixed(1)} seconds`
    timeEl.style.cssText = 'font-size:20px; margin-bottom:20px;'

    const button = document.createElement('button')
    button.textContent = 'Play Again'
    button.style.cssText = `
      padding:10px 18px; font-size:18px; font-weight:800;
      border-radius:10px; border:2px solid rgba(255,255,255,0.25);
      background:#3aa34f; color:#fff; cursor:pointer;
    `
    button.onclick = () => window.location.reload()

    panel.appendChild(title)
    panel.appendChild(summary)
    panel.appendChild(timeEl)
    panel.appendChild(button)
    overlay.appendChild(panel)
    document.body.appendChild(overlay)
    gameOverOverlay = overlay

    showWaveMessage('ROUND OVER', 'All 3 levels cleared', 2.0)
  }

  // --------------------------------------------------------
  // GAME OVER
  // --------------------------------------------------------
  function triggerGameOver() {
    if (isGameOver || typeof document === 'undefined') return
    isGameOver = true

    if (gameOverOverlay?.parentNode) gameOverOverlay.parentNode.removeChild(gameOverOverlay)

    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10001;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.84); font-family:Arial,sans-serif;
    `
    const panel = document.createElement('div')
    panel.style.cssText = `
      min-width:320px; max-width:90vw; padding:28px 26px;
      border-radius:14px; border:4px solid rgba(255,70,70,0.95);
      background:rgba(25,8,8,0.95); color:#ffffff; text-align:center;
      box-shadow:0 0 26px rgba(255,40,40,0.35);
    `
    const title = document.createElement('div')
    title.textContent = 'GAME OVER'
    title.style.cssText = 'font-size:36px; font-weight:900; letter-spacing:2px; margin-bottom:14px;'

    const survived = document.createElement('div')
    survived.textContent = `Time survived: ${survivalTime.toFixed(1)} seconds`
    survived.style.cssText = 'font-size:20px; margin-bottom:18px;'

    const prompt = document.createElement('div')
    prompt.textContent = 'Play again?'
    prompt.style.cssText = 'font-size:18px; margin-bottom:18px;'

    const buttonRow = document.createElement('div')
    buttonRow.style.cssText = 'display:flex; gap:12px; justify-content:center;'

    const yesBtn = document.createElement('button')
    yesBtn.textContent = 'Yes'
    yesBtn.style.cssText = `padding:10px 18px; font-size:18px; font-weight:800; border-radius:10px; border:2px solid rgba(255,255,255,0.25); background:#d23a3a; color:#fff; cursor:pointer;`
    yesBtn.onclick = () => window.location.reload()

    const noBtn = document.createElement('button')
    noBtn.textContent = 'No'
    noBtn.style.cssText = `padding:10px 18px; font-size:18px; font-weight:800; border-radius:10px; border:2px solid rgba(255,255,255,0.25); background:#444; color:#fff; cursor:pointer;`
    noBtn.onclick = () => overlay.remove()

    buttonRow.appendChild(yesBtn)
    buttonRow.appendChild(noBtn)
    panel.appendChild(title)
    panel.appendChild(survived)
    panel.appendChild(prompt)
    panel.appendChild(buttonRow)
    overlay.appendChild(panel)
    document.body.appendChild(overlay)
    gameOverOverlay = overlay
  }

  return {
    initPlayerState,
    damagePlayer,
    tickSurvivalTime,
    ensurePlayerUI,
    updatePlayerUI,
    showWaveMessage,
    triggerVictory,
    triggerGameOver,
    get isGameOver() { return isGameOver },
    get isVictory() { return isVictory },
    get survivalTime() { return survivalTime },
    get playerHealth() { return playerState.health },
    get playerMaxHealth() { return playerState.maxHealth },
    playerState,
  }
}

function createBrowserSound(src) {
  if (typeof Audio === 'undefined') return null
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}
