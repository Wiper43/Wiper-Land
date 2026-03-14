import * as THREE from 'three'
import { createNavGrid } from './navGrid.js'

export function createTestWorld(scene, audio = {}) {
  const colliders = []
  const entities = []
  const floatingTexts = []
  const attackBeams = []
  const playerDamageSound = createBrowserSound('/sounds/take-damage-sound.mp3')

  const navGrid = createNavGrid({
    worldSize: 40,
    cellSize: 1,
    origin: new THREE.Vector3(-20, 0, -20),
    agentRadius: 0.95,
    maxClimbStep: 1.25,
  })

  const world = {
    scene,
    colliders,
    entities,
    floatingTexts,
    cowEntity: null,
    cowEntities: [],
    audio,
    navGrid,
    attackBeams,
    playerDamageSound,
    navDirty: true,
    navRebuildCooldown: 0,
    debugNav: true,
    navDebug: createNavDebug(scene),
    survivalTime: 0,
    isGameOver: false,
    isVictory: false,
    gameOverOverlay: null,
    waveOverlay: null,
    waveMessageTimeout: null,
    cowVolume: 0.8,
    waveConfig: [1, 3, 10],
    waveSpawnPositions: [
      new THREE.Vector3(0, 0, -12),
      new THREE.Vector3(-10, 0, -10),
      new THREE.Vector3(0, 0, -12),
      new THREE.Vector3(10, 0, -10),
      new THREE.Vector3(-12, 0, -4),
      new THREE.Vector3(12, 0, -4),
      new THREE.Vector3(-8, 0, 8),
      new THREE.Vector3(8, 0, 8),
      new THREE.Vector3(0, 0, 12),
      new THREE.Vector3(-14, 0, 12),
      new THREE.Vector3(14, 0, 12),
      new THREE.Vector3(0, 0, -15),
    ],
    currentWaveIndex: -1,
    wavePhase: 'boot',
    waveDelayTimer: 0,
    playerState: {
      maxHealth: 100,
      health: 100,
      ui: null,
      initialized: false,
      knockbackVelocity: new THREE.Vector3(),
    },

    update(deltaTime, camera, player) {
      this.ensurePlayerState(player)
      this.ensurePlayerUI()

      if (!this.isGameOver) {
        this.survivalTime += deltaTime
      }

      updateFloatingTexts(deltaTime, floatingTexts, scene)
      updateAttackBeams(deltaTime, attackBeams, scene)
      applySmoothPlayerKnockback(deltaTime, player, this.colliders)
      this.updateWaveState(deltaTime)
      this.updatePlayerUI()

      this.navRebuildCooldown -= deltaTime
      if (this.navDirty || this.navRebuildCooldown <= 0) {
        this.navGrid.rebuild(this.colliders)
        this.navDirty = false
        this.navRebuildCooldown = 0.5
      }

      if (!this.isGameOver) {
        for (const entity of entities) {
          if (!entity || entity.isDead) continue

          if (typeof entity.update === 'function') {
            entity.update(deltaTime, camera, player)
          }

          syncEntityUI(entity, camera)
        }
      } else {
        for (const entity of entities) {
          if (!entity || entity.isDead) continue
          syncEntityUI(entity, camera)
        }
      }

      if (this.debugNav) {
        this.navDebug.update(this)
      } else {
        this.navDebug.clear()
      }
    },

    markNavDirty() {
      this.navDirty = true
    },

    spawnFloatingDamage(position, amount, color = '#ffd36b') {
      const sprite = createTextSprite(`-${amount}`, {
        fontSize: 42,
        textColor: color,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        borderColor: 'rgba(255, 211, 107, 0.35)',
        minWorldWidth: 0.9,
        worldHeight: 0.42,
      })

      sprite.position.copy(position)
      sprite.renderOrder = 1001
      scene.add(sprite)

      floatingTexts.push({
        sprite,
        age: 0,
        life: 0.75,
        riseSpeed: 1.15,
      })
    },

    setCowVolume(volume) {
      const safeVolume = Math.max(0, Math.min(1, Number(volume) || 0))
      this.cowVolume = safeVolume

      for (const cow of this.cowEntities) {
        if (!cow || cow.isDead) continue
        cow.cowVolume = safeVolume

        if (cow.mooSound) {
          cow.mooSound.setVolume(safeVolume)
        }
      }
    },

    setCowSoundBuffer(buffer) {
      for (const cow of this.cowEntities) {
        if (!cow || cow.isDead) continue
        cow.setSoundBuffer(buffer)
      }
    },

    ensurePlayerState(player) {
      if (!player) return

      if (player.maxHealth == null) player.maxHealth = 100
      if (player.health == null) player.health = 100
      if (player.isDead == null) player.isDead = false
      if (!player.knockbackVelocity) player.knockbackVelocity = new THREE.Vector3()

      this.playerState.maxHealth = player.maxHealth
      this.playerState.health = player.health
      this.playerState.initialized = true
    },

    ensurePlayerUI() {
      if (this.playerState.ui || typeof document === 'undefined') return

      const wrap = document.createElement('div')
      wrap.style.position = 'fixed'
      wrap.style.left = '16px'
      wrap.style.top = '16px'
      wrap.style.zIndex = '10000'
      wrap.style.padding = '10px 14px'
      wrap.style.border = '3px solid rgba(255,255,255,0.35)'
      wrap.style.background = 'rgba(0,0,0,0.62)'
      wrap.style.color = '#ffffff'
      wrap.style.fontFamily = 'Arial, sans-serif'
      wrap.style.fontWeight = '700'
      wrap.style.fontSize = '18px'
      wrap.style.borderRadius = '10px'
      wrap.style.boxShadow = '0 0 16px rgba(0,0,0,0.35)'

      const hp = document.createElement('div')
      const time = document.createElement('div')
      time.style.marginTop = '6px'
      time.style.fontSize = '15px'
      time.style.fontWeight = '600'
      time.style.opacity = '0.95'

      wrap.appendChild(hp)
      wrap.appendChild(time)
      document.body.appendChild(wrap)

      this.playerState.ui = { wrap, hp, time }
    },

    updatePlayerUI() {
      if (!this.playerState.ui) return

      const { wrap, hp, time } = this.playerState.ui
      const hpValue = Math.max(0, Math.round(this.playerState.health))
      const maxHp = Math.max(1, Math.round(this.playerState.maxHealth))
      const displayedWave = Math.max(1, Math.min(this.currentWaveIndex + 1, this.waveConfig.length))
      const aliveCows = this.getAliveCowCount()
      hp.textContent = `Player HP: ${hpValue} / ${maxHp}`
      time.textContent = `Time: ${this.survivalTime.toFixed(1)}s • Round: ${displayedWave}/${this.waveConfig.length} • Cows Left: ${aliveCows}`

      const hpRatio = hpValue / maxHp
      if (hpRatio > 0.6) {
        wrap.style.borderColor = 'rgba(120, 255, 120, 0.55)'
      } else if (hpRatio > 0.3) {
        wrap.style.borderColor = 'rgba(255, 210, 90, 0.75)'
      } else {
        wrap.style.borderColor = 'rgba(255, 90, 90, 0.9)'
      }
    },

    getAliveCowCount() {
      return this.cowEntities.filter((cow) => cow && !cow.isDead).length
    },

    removeCowEntity(cow) {
      if (!cow) return
      this.cowEntities = this.cowEntities.filter((entry) => entry !== cow)
      if (this.cowEntity === cow) {
        this.cowEntity = this.cowEntities.find((entry) => entry && !entry.isDead) || this.cowEntities[0] || null
      }
    },

    spawnCow(spawnPosition) {
      const cow = createCowDummy(this, spawnPosition.clone(), this.audio)
      cow.cowVolume = this.cowVolume
      if (cow.mooSound) cow.mooSound.setVolume(this.cowVolume)
      if (this.audio?.mooBuffer && typeof cow.setSoundBuffer === 'function') {
        cow.setSoundBuffer(this.audio.mooBuffer)
      }
      this.cowEntities.push(cow)
      this.entities.push(cow)
      if (!this.cowEntity || this.cowEntity.isDead) this.cowEntity = cow
      this.markNavDirty()
      return cow
    },

    showWaveMessage(title, subtitle = '', duration = 1.6) {
      if (typeof document === 'undefined') return

      if (!this.waveOverlay) {
        const overlay = document.createElement('div')
        overlay.style.position = 'fixed'
        overlay.style.left = '50%'
        overlay.style.top = '90px'
        overlay.style.transform = 'translateX(-50%)'
        overlay.style.zIndex = '10002'
        overlay.style.pointerEvents = 'none'
        overlay.style.padding = '16px 24px'
        overlay.style.borderRadius = '14px'
        overlay.style.border = '3px solid rgba(255,255,255,0.2)'
        overlay.style.background = 'rgba(0,0,0,0.72)'
        overlay.style.color = '#ffffff'
        overlay.style.fontFamily = 'Arial, sans-serif'
        overlay.style.textAlign = 'center'
        overlay.style.boxShadow = '0 0 24px rgba(0,0,0,0.28)'
        overlay.style.opacity = '0'
        overlay.style.transition = 'opacity 0.18s ease'

        const titleEl = document.createElement('div')
        titleEl.style.fontSize = '30px'
        titleEl.style.fontWeight = '900'
        titleEl.style.letterSpacing = '1.5px'

        const subtitleEl = document.createElement('div')
        subtitleEl.style.fontSize = '18px'
        subtitleEl.style.marginTop = '6px'
        subtitleEl.style.opacity = '0.92'

        overlay.appendChild(titleEl)
        overlay.appendChild(subtitleEl)
        document.body.appendChild(overlay)

        this.waveOverlay = { root: overlay, titleEl, subtitleEl }
      }

      const { root, titleEl, subtitleEl } = this.waveOverlay
      titleEl.textContent = title
      subtitleEl.textContent = subtitle
      subtitleEl.style.display = subtitle ? 'block' : 'none'
      root.style.opacity = '1'

      if (this.waveMessageTimeout) {
        clearTimeout(this.waveMessageTimeout)
      }

      this.waveMessageTimeout = setTimeout(() => {
        if (this.waveOverlay?.root) this.waveOverlay.root.style.opacity = '0'
      }, Math.max(150, duration * 1000))
    },

    startWave(index) {
      this.currentWaveIndex = index
      this.wavePhase = 'active'

      const cowCount = this.waveConfig[index] ?? 0
      const spawnCount = Math.min(cowCount, this.waveSpawnPositions.length)

      for (let i = 0; i < spawnCount; i++) {
        this.spawnCow(this.waveSpawnPositions[i])
      }

      this.showWaveMessage(`LEVEL ${index + 1} START`, `Defeat ${cowCount} zombie ${cowCount === 1 ? 'cow' : 'cows'}`, 1.8)
    },

    beginNextWaveDelay() {
      if (this.currentWaveIndex + 1 >= this.waveConfig.length) {
        this.triggerVictory()
        return
      }

      const nextWaveNumber = this.currentWaveIndex + 2
      this.wavePhase = 'intermission'
      this.waveDelayTimer = 2
      this.showWaveMessage('ROUND OVER', `Level ${nextWaveNumber} starts in 2 seconds`, 1.8)
    },

    updateWaveState(deltaTime) {
      if (this.isGameOver || this.isVictory) return

      if (this.wavePhase === 'boot') {
        this.wavePhase = 'intermission'
        this.waveDelayTimer = 1.25
        this.showWaveMessage('ZOMBIE COW ARENA', 'Level 1 starts now', 1.25)
        return
      }

      if (this.wavePhase === 'intermission') {
        this.waveDelayTimer -= deltaTime
        if (this.waveDelayTimer <= 0) {
          this.startWave(this.currentWaveIndex + 1)
        }
        return
      }

      if (this.wavePhase === 'active' && this.getAliveCowCount() === 0) {
        if (this.currentWaveIndex >= this.waveConfig.length - 1) {
          this.triggerVictory()
        } else {
          this.beginNextWaveDelay()
        }
      }
    },

    triggerVictory() {
      if (this.isVictory || typeof document === 'undefined') return
      this.isVictory = true
      this.wavePhase = 'complete'

      if (this.gameOverOverlay?.parentNode) {
        this.gameOverOverlay.parentNode.removeChild(this.gameOverOverlay)
      }

      const overlay = document.createElement('div')
      overlay.style.position = 'fixed'
      overlay.style.inset = '0'
      overlay.style.zIndex = '10003'
      overlay.style.display = 'flex'
      overlay.style.alignItems = 'center'
      overlay.style.justifyContent = 'center'
      overlay.style.background = 'rgba(0, 0, 0, 0.84)'
      overlay.style.fontFamily = 'Arial, sans-serif'

      const panel = document.createElement('div')
      panel.style.minWidth = '340px'
      panel.style.maxWidth = '92vw'
      panel.style.padding = '28px 26px'
      panel.style.borderRadius = '14px'
      panel.style.border = '4px solid rgba(120, 255, 120, 0.9)'
      panel.style.background = 'rgba(8, 25, 8, 0.95)'
      panel.style.color = '#ffffff'
      panel.style.textAlign = 'center'
      panel.style.boxShadow = '0 0 26px rgba(80, 255, 120, 0.25)'

      const title = document.createElement('div')
      title.textContent = 'VICTORY'
      title.style.fontSize = '38px'
      title.style.fontWeight = '900'
      title.style.letterSpacing = '2px'
      title.style.marginBottom = '14px'

      const summary = document.createElement('div')
      summary.textContent = `Remaining Health: ${Math.max(0, Math.round(this.playerState.health))} / ${Math.max(1, Math.round(this.playerState.maxHealth))}`
      summary.style.fontSize = '20px'
      summary.style.marginBottom = '10px'

      const time = document.createElement('div')
      time.textContent = `Time Spent: ${this.survivalTime.toFixed(1)} seconds`
      time.style.fontSize = '20px'
      time.style.marginBottom = '20px'

      const button = document.createElement('button')
      button.textContent = 'Play Again'
      button.style.padding = '10px 18px'
      button.style.fontSize = '18px'
      button.style.fontWeight = '800'
      button.style.borderRadius = '10px'
      button.style.border = '2px solid rgba(255,255,255,0.25)'
      button.style.background = '#3aa34f'
      button.style.color = '#fff'
      button.style.cursor = 'pointer'
      button.onclick = () => window.location.reload()

      panel.appendChild(title)
      panel.appendChild(summary)
      panel.appendChild(time)
      panel.appendChild(button)
      overlay.appendChild(panel)
      document.body.appendChild(overlay)

      this.gameOverOverlay = overlay
      this.showWaveMessage('ROUND OVER', 'All 3 levels cleared', 2.0)
    },

    damagePlayer(player, amount, sourcePosition = null, pushStrength = 1.35) {
      if (!player || this.isGameOver) return

      this.ensurePlayerState(player)

      player.health = Math.max(0, (player.health ?? 100) - amount)
      this.playerState.health = player.health
      this.playerState.maxHealth = player.maxHealth ?? 100

      if (sourcePosition && player.position) {
        const push = new THREE.Vector3(
          player.position.x - sourcePosition.x,
          0,
          player.position.z - sourcePosition.z
        )

        if (push.lengthSq() > 0.0001) {
          push.normalize().multiplyScalar(pushStrength)

          if (!player.knockbackVelocity) {
            player.knockbackVelocity = new THREE.Vector3()
          }

          player.knockbackVelocity.add(push)
          this.playerState.knockbackVelocity.copy(player.knockbackVelocity)
        }
      }

      if (this.playerDamageSound) {
        try {
          this.playerDamageSound.currentTime = 0
          const playResult = this.playerDamageSound.play()
          if (playResult && typeof playResult.catch === 'function') {
            playResult.catch(() => {})
          }
        } catch (err) {
          console.warn('Could not play player damage sound:', err)
        }
      }

      if (player.health <= 0) {
        player.isDead = true
        this.playerState.health = 0
        this.triggerGameOver()
      }
    },

    spawnAttackBeam(fromPosition, toPosition, color = 0xff4444, life = 0.18) {
      const material = new THREE.LineBasicMaterial({ color })
      const geometry = new THREE.BufferGeometry().setFromPoints([
        fromPosition.clone(),
        toPosition.clone(),
      ])
      const line = new THREE.Line(geometry, material)
      scene.add(line)

      attackBeams.push({
        line,
        age: 0,
        life,
      })
    },

    triggerGameOver() {
      if (this.isGameOver || typeof document === 'undefined') return
      this.isGameOver = true

      if (this.gameOverOverlay?.parentNode) {
        this.gameOverOverlay.parentNode.removeChild(this.gameOverOverlay)
      }

      const overlay = document.createElement('div')
      overlay.style.position = 'fixed'
      overlay.style.inset = '0'
      overlay.style.zIndex = '10001'
      overlay.style.display = 'flex'
      overlay.style.alignItems = 'center'
      overlay.style.justifyContent = 'center'
      overlay.style.background = 'rgba(0, 0, 0, 0.84)'
      overlay.style.fontFamily = 'Arial, sans-serif'

      const panel = document.createElement('div')
      panel.style.minWidth = '320px'
      panel.style.maxWidth = '90vw'
      panel.style.padding = '28px 26px'
      panel.style.borderRadius = '14px'
      panel.style.border = '4px solid rgba(255, 70, 70, 0.95)'
      panel.style.background = 'rgba(25, 8, 8, 0.95)'
      panel.style.color = '#ffffff'
      panel.style.textAlign = 'center'
      panel.style.boxShadow = '0 0 26px rgba(255, 40, 40, 0.35)'

      const title = document.createElement('div')
      title.textContent = 'GAME OVER'
      title.style.fontSize = '36px'
      title.style.fontWeight = '900'
      title.style.letterSpacing = '2px'
      title.style.marginBottom = '14px'

      const survived = document.createElement('div')
      survived.textContent = `Time survived: ${this.survivalTime.toFixed(1)} seconds`
      survived.style.fontSize = '20px'
      survived.style.marginBottom = '18px'

      const prompt = document.createElement('div')
      prompt.textContent = 'Play again?'
      prompt.style.fontSize = '18px'
      prompt.style.marginBottom = '18px'

      const buttonRow = document.createElement('div')
      buttonRow.style.display = 'flex'
      buttonRow.style.gap = '12px'
      buttonRow.style.justifyContent = 'center'

      const yesBtn = document.createElement('button')
      yesBtn.textContent = 'Yes'
      yesBtn.style.padding = '10px 18px'
      yesBtn.style.fontSize = '18px'
      yesBtn.style.fontWeight = '800'
      yesBtn.style.borderRadius = '10px'
      yesBtn.style.border = '2px solid rgba(255,255,255,0.25)'
      yesBtn.style.background = '#d23a3a'
      yesBtn.style.color = '#fff'
      yesBtn.style.cursor = 'pointer'
      yesBtn.onclick = () => window.location.reload()

      const noBtn = document.createElement('button')
      noBtn.textContent = 'No'
      noBtn.style.padding = '10px 18px'
      noBtn.style.fontSize = '18px'
      noBtn.style.fontWeight = '800'
      noBtn.style.borderRadius = '10px'
      noBtn.style.border = '2px solid rgba(255,255,255,0.25)'
      noBtn.style.background = '#444'
      noBtn.style.color = '#fff'
      noBtn.style.cursor = 'pointer'
      noBtn.onclick = () => {
        overlay.remove()
      }

      buttonRow.appendChild(yesBtn)
      buttonRow.appendChild(noBtn)
      panel.appendChild(title)
      panel.appendChild(survived)
      panel.appendChild(prompt)
      panel.appendChild(buttonRow)
      overlay.appendChild(panel)
      document.body.appendChild(overlay)

      this.gameOverOverlay = overlay
    },
  }

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambient)

  const dir = new THREE.DirectionalLight(0xffffff, 1.2)
  dir.position.set(8, 14, 6)
  scene.add(dir)

  //const floorGeo = new THREE.PlaneGeometry(40, 40)
 // const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a7a3a })
  //const floor = new THREE.Mesh(floorGeo, floorMat)
 // floor.rotation.x = -Math.PI / 2
  //scene.add(floor)

  const grid = new THREE.GridHelper(40, 40)
  scene.add(grid)

  addBlock(world, {
    size: [40, 4, 1],
    position: [0, 2, -20],
    color: 0x666666,
    name: 'north wall',
    maxHealth: Infinity,
    blocksMovement: true,
    blocksAttack: true,
    damageable: false,
  })

  addBlock(world, {
    size: [40, 4, 1],
    position: [0, 2, 20],
    color: 0x666666,
    name: 'south wall',
    maxHealth: Infinity,
    blocksMovement: true,
    blocksAttack: true,
    damageable: false,
  })

  addBlock(world, {
    size: [1, 4, 40],
    position: [-20, 2, 0],
    color: 0x666666,
    name: 'west wall',
    maxHealth: Infinity,
    blocksMovement: true,
    blocksAttack: true,
    damageable: false,
  })

  addBlock(world, {
    size: [1, 4, 40],
    position: [20, 2, 0],
    color: 0x666666,
    name: 'east wall',
    maxHealth: Infinity,
    blocksMovement: true,
    blocksAttack: true,
    damageable: false,
  })

  addBlock(world, {
    size: [2, 1.5, 2],
    position: [0, 0.75, 0],
    color: 0x888888,
    name: 'test block 1',
    maxHealth: 30,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  addBlock(world, {
    size: [3, 1.5, 3],
    position: [6, 0.75, 2],
    color: 0x8b5a2b,
    name: 'test block 2',
    maxHealth: 40,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  addBlock(world, {
    size: [2, 3, 2],
    position: [-5, 1.5, -3],
    color: 0x8b5a2b,
    name: 'test block 3',
    maxHealth: 50,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  addBlock(world, {
    size: [6, 2, 1],
    position: [3, 1, -7],
    color: 0x7777aa,
    name: 'test block 4',
    maxHealth: 60,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  addBlock(world, {
    size: [1, 2, 8],
    position: [-8, 1, 6],
    color: 0xaa7777,
    name: 'test block 5',
    maxHealth: 60,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  world.markNavDirty()

  return world
}

function addBlock(
  world,
  {
    size,
    position,
    color = 0x888888,
    name = 'block',
    maxHealth = Infinity,
    blocksMovement = true,
    blocksAttack = true,
    damageable = false,
  }
) {
  const { scene, colliders, entities } = world

  const [width, height, depth] = size
  const [x, y, z] = position

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color })
  )
  mesh.position.set(x, y, z)
  scene.add(mesh)

  const halfW = width / 2
  const halfH = height / 2
  const halfD = depth / 2

  const box = new THREE.Box3(
    new THREE.Vector3(x - halfW, y - halfH, z - halfD),
    new THREE.Vector3(x + halfW, y + halfH, z + halfD)
  )

  const collider = {
    mesh,
    box,
    isDynamic: false,
  }

  if (blocksMovement) {
    colliders.push(collider)
    world.markNavDirty()
  }

  let healthText = null

  if (damageable && Number.isFinite(maxHealth)) {
    healthText = createTextSprite(`${maxHealth} / ${maxHealth}`, {
      fontSize: 34,
      textColor: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      borderColor: 'rgba(255,255,255,0.18)',
      minWorldWidth: 1.2,
      worldHeight: 0.3,
    })

    healthText.position.set(x, y + height / 2 + 0.6, z)
    scene.add(healthText)
  }

  const entity = {
    type: 'block',
    name,
    mesh,
    collider,
    size: new THREE.Vector3(width, height, depth),
    health: maxHealth,
    maxHealth,
    isDead: false,
    blocksAttack,
    canTakeDamage: damageable,
    healthText,
    labelHeight: height / 2 + 0.6,

    getAnchorPosition() {
      return new THREE.Vector3(
        this.mesh.position.x,
        this.mesh.position.y + this.labelHeight,
        this.mesh.position.z
      )
    },

    takeDamage(amount, info = {}) {
      if (!this.canTakeDamage || this.isDead) return

      this.health -= amount
      if (this.health < 0) this.health = 0

      flashMeshes(this.mesh)

      const damagePos = info.hitPoint
        ? info.hitPoint.clone().add(new THREE.Vector3(0, 0.45, 0))
        : this.getAnchorPosition()

      world.spawnFloatingDamage(damagePos, amount)
      updateEntityHealthText(this)

      if (this.health <= 0) {
        this.isDead = true
        scene.remove(this.mesh)

        if (this.healthText) {
          scene.remove(this.healthText)
          disposeTextSprite(this.healthText)
        }

        const colliderIndex = colliders.indexOf(this.collider)
        if (colliderIndex !== -1) {
          colliders.splice(colliderIndex, 1)
          world.markNavDirty()
        }
      }
    },
  }

  entities.push(entity)
  return entity
}

function createCowDummy(world, position, audio) {
  const { scene, colliders } = world

  const COW_COLLIDER_HALF = new THREE.Vector3(1.15, 1.1, 0.7)
  const COW_AGGRO_RANGE = 18
  const COW_STOP_DISTANCE = 4.25
  const COW_MOVE_SPEED = 2.35
  const COW_TURN_SPEED = 7.5
  const COW_IDLE_SWAY_SPEED = 2.0
  const COW_IDLE_SWAY_AMOUNT = 0.02
  const COW_LEG_SWING_SPEED = 10.5
  const COW_LEG_SWING_AMOUNT = 0.45
  const COW_PATH_RECALC_INTERVAL = 1.0
  const COW_WAYPOINT_REACH_DISTANCE = 1.1
  const COW_STUCK_TIME = 0.85
  const COW_STUCK_MOVE_EPSILON = 0.12
  const COW_PATH_COOLDOWN_AFTER_STUCK = 0.45
  const COW_ATTACK_DAMAGE = 10
  const COW_ATTACK_COOLDOWN = 1.1
  const COW_ATTACK_PUSH = 10
  const COW_ATTACK_BEAM_LIFE = 0.18
  const COW_IDLE_ROAM_RADIUS = 3.25
  const COW_IDLE_ROAM_INTERVAL_MIN = 1.5
  const COW_IDLE_ROAM_INTERVAL_MAX = 3.5
  const COW_IDLE_ROAM_REACH_DISTANCE = 0.5

  const group = new THREE.Group()

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1 })

  function makeMesh(geometry, material) {
    return new THREE.Mesh(geometry, material.clone())
  }

  const body = makeMesh(new THREE.BoxGeometry(2.2, 1.2, 1.1), whiteMat)
  body.position.set(0, 1.4, 0)
  group.add(body)

  const spot1 = makeMesh(new THREE.BoxGeometry(0.5, 0.35, 0.05), blackMat)
  spot1.position.set(-0.3, 1.5, 0.58)
  group.add(spot1)

  const spot2 = makeMesh(new THREE.BoxGeometry(0.45, 0.4, 0.05), blackMat)
  spot2.position.set(0.5, 1.25, -0.58)
  group.add(spot2)

  const head = makeMesh(new THREE.BoxGeometry(0.85, 0.75, 0.75), whiteMat)
  head.position.set(1.45, 1.5, 0)
  group.add(head)

  const nose = makeMesh(new THREE.BoxGeometry(0.25, 0.3, 0.45), pinkMat)
  nose.position.set(1.95, 1.35, 0)
  group.add(nose)

  const legRoots = []

  const legPositions = [
    [0.7, 0.55, 0.35],
    [0.7, 0.55, -0.35],
    [-0.7, 0.55, 0.35],
    [-0.7, 0.55, -0.35],
  ]

  for (const [lx, ly, lz] of legPositions) {
    const legRoot = new THREE.Group()
    legRoot.position.set(lx, ly + 0.55, lz)

    const leg = makeMesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), blackMat)
    leg.position.set(0, -0.55, 0)
    legRoot.add(leg)

    group.add(legRoot)
    legRoots.push(legRoot)
  }

  const tail = makeMesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), blackMat)
  tail.position.set(-1.08, 1.55, 0)
  tail.rotation.z = -0.35
  group.add(tail)

  const horn1 = makeMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), blackMat)
  horn1.position.set(1.68, 1.93, 0.22)
  group.add(horn1)

  const horn2 = makeMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), blackMat)
  horn2.position.set(1.68, 1.93, -0.22)
  group.add(horn2)

  group.position.copy(position)
  scene.add(group)

  const box = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position.x, position.y + 1.1, position.z),
    new THREE.Vector3(COW_COLLIDER_HALF.x * 2, COW_COLLIDER_HALF.y * 2, COW_COLLIDER_HALF.z * 2)
  )

  const collider = {
    mesh: group,
    box,
    isDynamic: true,
  }
  colliders.push(collider)

  const healthBar = createTextSprite(`Cow HP: 50 / 50`, {
    fontSize: 38,
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    defaultBorderColor: 'rgba(255,255,255,0.2)',
    defaultBorderWidth: 2,
    minWorldWidth: 1.7,
    worldHeight: 0.34,
  })
  healthBar.position.set(position.x, position.y + 3.0, position.z)
  scene.add(healthBar)

  let mooSound = null

  function ensureCowSound() {
    if (mooSound) return mooSound
    if (!audio.listener) return null

    mooSound = new THREE.PositionalAudio(audio.listener)
    mooSound.setRefDistance(18)
    mooSound.setVolume(0.8)
    group.add(mooSound)

    return mooSound
  }

  function setSoundBuffer(buffer) {
    if (!buffer) return

    const sound = ensureCowSound()
    if (!sound) return

    sound.setBuffer(buffer)
    sound.setRefDistance(18)
    sound.setVolume(0.45)
  }

  if (audio.mooBuffer) {
    setSoundBuffer(audio.mooBuffer)
  }

  const entity = {
    type: 'cow',
    name: 'cow dummy',
    mesh: group,
    collider,
    health: 50,
    maxHealth: 50,
    isDead: false,
    canTakeDamage: true,
    blocksAttack: true,
    healthText: healthBar,
    labelHeight: 3.0,
    moveTime: 0,
    cowVolume: 0.45,
    aggroRange: COW_AGGRO_RANGE,
    stopDistance: COW_STOP_DISTANCE,
    moveSpeed: COW_MOVE_SPEED,
    path: [],
    pathIndex: 0,
    pathRecalcTimer: 0,
    lastPlayerNavTarget: new THREE.Vector3(),
    homePosition: position.clone(),
    idleRoamTarget: null,
    idleRoamTimer: 0.8,
    isAggroed: false,
    debugState: 'idle',
    debugWaypoint: null,
    lastPosition: position.clone(),
    stuckTimer: 0,
    repathCooldown: 0,
    attackCooldown: 0,

    get mooSound() {
      return mooSound
    },

    setSoundBuffer,

    getAnchorPosition() {
      return new THREE.Vector3(
        this.mesh.position.x,
        this.mesh.position.y + this.labelHeight,
        this.mesh.position.z
      )
    },

    takeDamage(amount, info = {}) {
      if (this.isDead) return

      this.health -= amount
      if (this.health < 0) this.health = 0

      flashMeshes(this.mesh)

      const damagePos = info.hitPoint
        ? info.hitPoint.clone().add(new THREE.Vector3(0, 0.45, 0))
        : this.getAnchorPosition()

      world.spawnFloatingDamage(damagePos, amount, '#ffb347')
      updateEntityHealthText(this, 'Cow HP')

      if (mooSound && mooSound.buffer) {
        try {
          if (mooSound.isPlaying) mooSound.stop()
          mooSound.play()
        } catch (err) {
          console.warn('Could not play cow sound:', err)
        }
      }

      if (this.health <= 0) {
        this.isDead = true
        scene.remove(this.mesh)

        if (this.healthText) {
          scene.remove(this.healthText)
          disposeTextSprite(this.healthText)
        }

        const colliderIndex = colliders.indexOf(this.collider)
        if (colliderIndex !== -1) {
          colliders.splice(colliderIndex, 1)
        }
      }
    },

    setAggroState(nextAggro) {
      if (this.isAggroed === nextAggro) return
      this.isAggroed = nextAggro
      updateEntityHealthBorder(this, nextAggro ? 'rgba(255, 70, 70, 0.95)' : null)
    },

    chooseIdleRoamTarget() {
      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = Math.random() * Math.PI * 2
        const radius = 0.8 + Math.random() * (COW_IDLE_ROAM_RADIUS - 0.8)
        const candidate = new THREE.Vector3(
          this.homePosition.x + Math.cos(angle) * radius,
          this.mesh.position.y,
          this.homePosition.z + Math.sin(angle) * radius
        )

        if (!canMoveCowTo(world, this, candidate, COW_COLLIDER_HALF)) continue
        const cell = world.navGrid.worldToCell(candidate)
        if (world.navGrid.isBlocked(cell.col, cell.row)) continue

        this.idleRoamTarget = candidate
        return
      }

      this.idleRoamTarget = null
    },

    updateIdleRoam(deltaTime) {
      this.idleRoamTimer -= deltaTime

      if (!this.idleRoamTarget && this.idleRoamTimer <= 0) {
        this.chooseIdleRoamTarget()
        this.idleRoamTimer = randomRange(COW_IDLE_ROAM_INTERVAL_MIN, COW_IDLE_ROAM_INTERVAL_MAX)
      }

      if (!this.idleRoamTarget) {
        return false
      }

      const moveResult = this.moveTowardsPoint(deltaTime, this.idleRoamTarget)

      if (
        moveResult.reached ||
        horizontalDistance(this.mesh.position, this.idleRoamTarget) <= COW_IDLE_ROAM_REACH_DISTANCE
      ) {
        this.idleRoamTarget = null
        this.idleRoamTimer = randomRange(COW_IDLE_ROAM_INTERVAL_MIN, COW_IDLE_ROAM_INTERVAL_MAX)
      }

      if (!moveResult.moved && !moveResult.reached) {
        this.idleRoamTarget = null
        this.idleRoamTimer = 0.75
      }

      return moveResult.moved
    },

    clearPath() {
      this.path.length = 0
      this.pathIndex = 0
      this.pathRecalcTimer = 0
      this.debugWaypoint = null
    },

    animateLegs(deltaTime, moving) {
      if (legRoots.length === 0) return

      if (moving) {
        const swing = Math.sin(this.moveTime * COW_LEG_SWING_SPEED) * COW_LEG_SWING_AMOUNT
        legRoots[0].rotation.z = swing
        legRoots[1].rotation.z = -swing
        legRoots[2].rotation.z = -swing
        legRoots[3].rotation.z = swing
      } else {
        const settleSpeed = Math.min(1, deltaTime * 10)
        for (const legRoot of legRoots) {
          legRoot.rotation.z += (0 - legRoot.rotation.z) * settleSpeed
        }
      }
    },

    updateStuckState(deltaTime, moved) {
      const movedDistance = horizontalDistance(this.mesh.position, this.lastPosition)

      if (moved || movedDistance > COW_STUCK_MOVE_EPSILON) {
        this.stuckTimer = 0
        this.lastPosition.copy(this.mesh.position)
        return false
      }

      this.stuckTimer += deltaTime
      this.lastPosition.copy(this.mesh.position)
      return this.stuckTimer >= COW_STUCK_TIME
    },

    onStuck(player) {
      this.debugState = 'stuck'
      this.clearPath()
      this.repathCooldown = COW_PATH_COOLDOWN_AFTER_STUCK

      if (player?.position) {
        const newPath = world.navGrid.findPath(this.mesh.position, player.position, {
          maxSearch: 2500,
        })

        if (newPath.length > 1) {
          // Skip the first point if it's too close to avoid spin-at-feet behavior.
          const firstDistance = horizontalDistance(this.mesh.position, newPath[0])
          this.path = newPath
          this.pathIndex = firstDistance <= COW_WAYPOINT_REACH_DISTANCE ? 1 : 0
          this.debugWaypoint = this.path[this.pathIndex] || null
        } else {
          this.path = newPath
          this.pathIndex = 0
          this.debugWaypoint = this.path[0] || null
        }

        this.pathRecalcTimer = COW_PATH_RECALC_INTERVAL
        this.lastPlayerNavTarget.copy(player.position)
      }
    },

    moveTowardsPoint(deltaTime, targetPoint) {
      const toTarget = new THREE.Vector3(
        targetPoint.x - this.mesh.position.x,
        0,
        targetPoint.z - this.mesh.position.z
      )

      const distance = toTarget.length()
      if (distance <= 0.0001) return { moved: false, reached: true }

      toTarget.normalize()

      const moveDistance = Math.min(this.moveSpeed * deltaTime, distance)
      const moveStep = toTarget.clone().multiplyScalar(moveDistance)

      const targetYaw = Math.atan2(toTarget.x, toTarget.z) - Math.PI / 2

      const fullTarget = this.mesh.position.clone().add(moveStep)
      if (canMoveCowTo(world, this, fullTarget, COW_COLLIDER_HALF)) {
        this.mesh.rotation.y = rotateTowardsAngle(
          this.mesh.rotation.y,
          targetYaw,
          COW_TURN_SPEED * deltaTime
        )
        this.mesh.position.copy(fullTarget)
        return {
          moved: true,
          reached: distance <= COW_WAYPOINT_REACH_DISTANCE,
          slideAxis: null,
        }
      }

      // Sliding fallback: helps the cow get around 90-degree corners instead of
      // sitting in place and repathing forever.
      const xOnlyTarget = this.mesh.position.clone().add(new THREE.Vector3(moveStep.x, 0, 0))
      const zOnlyTarget = this.mesh.position.clone().add(new THREE.Vector3(0, 0, moveStep.z))

      const canSlideX =
        Math.abs(moveStep.x) > 0.0001 && canMoveCowTo(world, this, xOnlyTarget, COW_COLLIDER_HALF)
      const canSlideZ =
        Math.abs(moveStep.z) > 0.0001 && canMoveCowTo(world, this, zOnlyTarget, COW_COLLIDER_HALF)

      // Prefer the axis with the bigger component toward the target.
      if (canSlideX || canSlideZ) {
        let slideTarget = null
        let slideAxis = null

        if (canSlideX && canSlideZ) {
          if (Math.abs(moveStep.x) >= Math.abs(moveStep.z)) {
            slideTarget = xOnlyTarget
            slideAxis = 'x'
          } else {
            slideTarget = zOnlyTarget
            slideAxis = 'z'
          }
        } else if (canSlideX) {
          slideTarget = xOnlyTarget
          slideAxis = 'x'
        } else {
          slideTarget = zOnlyTarget
          slideAxis = 'z'
        }

        const slideDir = new THREE.Vector3(
          slideTarget.x - this.mesh.position.x,
          0,
          slideTarget.z - this.mesh.position.z
        )

        if (slideDir.lengthSq() > 0.0001) {
          slideDir.normalize()
          const slideYaw = Math.atan2(slideDir.x, slideDir.z) - Math.PI / 2
          this.mesh.rotation.y = rotateTowardsAngle(
            this.mesh.rotation.y,
            slideYaw,
            COW_TURN_SPEED * deltaTime
          )
        }

        this.mesh.position.copy(slideTarget)
        return {
          moved: true,
          reached: horizontalDistance(this.mesh.position, targetPoint) <= COW_WAYPOINT_REACH_DISTANCE,
          slideAxis,
        }
      }

      return { moved: false, reached: false, slideAxis: null }
    },

    update(deltaTime, camera, player) {
      if (this.isDead) return

      this.moveTime += deltaTime
      this.pathRecalcTimer -= deltaTime
      this.repathCooldown -= deltaTime
      this.attackCooldown -= deltaTime
      this.debugState = 'idle'
      this.debugWaypoint = null

      let isMoving = false
      let attemptedMove = false

      if (player?.position) {
        const flatToPlayer = new THREE.Vector3(
          player.position.x - this.mesh.position.x,
          0,
          player.position.z - this.mesh.position.z
        )

        const distanceToPlayer = flatToPlayer.length()
        const withinAggro = distanceToPlayer <= this.aggroRange
        const withinStopDistance = distanceToPlayer <= this.stopDistance
        this.setAggroState(withinAggro)

        if (withinAggro && !withinStopDistance) {
          this.debugState = 'aggro'
          this.idleRoamTarget = null

          const directClear = world.navGrid.hasLineOfSight(this.mesh.position, player.position)
          const playerMovedEnough =
            this.lastPlayerNavTarget.distanceToSquared(player.position) > 1.5 * 1.5

          if (directClear) {
            this.debugState = 'direct-chase'
            this.clearPath()
            attemptedMove = true
            const directMove = this.moveTowardsPoint(deltaTime, player.position)
            isMoving = directMove.moved
            if (directMove.slideAxis) {
              this.debugState = `direct-slide-${directMove.slideAxis}`
            }
            this.debugWaypoint = player.position.clone()
          } else {
            const shouldRepath =
              this.repathCooldown <= 0 &&
              (
                this.path.length === 0 ||
                this.pathIndex >= this.path.length ||
                this.pathRecalcTimer <= 0 ||
                playerMovedEnough
              )

            if (shouldRepath) {
              this.path = world.navGrid.findPath(this.mesh.position, player.position, {
                maxSearch: 2500,
              })
              this.pathIndex = 0

              while (
                this.pathIndex < this.path.length &&
                horizontalDistance(this.mesh.position, this.path[this.pathIndex]) <= COW_WAYPOINT_REACH_DISTANCE
              ) {
                this.pathIndex++
              }

              this.pathRecalcTimer = COW_PATH_RECALC_INTERVAL
              this.lastPlayerNavTarget.copy(player.position)
            }

            this.debugState = 'pathing'

            while (this.pathIndex < this.path.length) {
              const waypoint = this.path[this.pathIndex]
              this.debugWaypoint = waypoint

              const flatDistance = horizontalDistance(this.mesh.position, waypoint)
              if (flatDistance <= COW_WAYPOINT_REACH_DISTANCE) {
                this.pathIndex++
                continue
              }

              attemptedMove = true
              const moveResult = this.moveTowardsPoint(deltaTime, waypoint)
              isMoving = moveResult.moved

              if (moveResult.slideAxis) {
                this.debugState = `path-slide-${moveResult.slideAxis}`
              }

              if (moveResult.reached) {
                this.pathIndex++
              }

              break
            }

            if (!isMoving && attemptedMove && this.updateStuckState(deltaTime, isMoving)) {
              this.onStuck(player)
            } else if (isMoving) {
              this.stuckTimer = 0
            }

            if (!isMoving && this.pathIndex >= this.path.length && this.repathCooldown <= 0 && this.pathRecalcTimer <= 0) {
              this.path = world.navGrid.findPath(this.mesh.position, player.position, {
                maxSearch: 2500,
              })
              this.pathIndex = 0
              this.pathRecalcTimer = COW_PATH_RECALC_INTERVAL
              this.lastPlayerNavTarget.copy(player.position)
            }
          }
        } else if (withinStopDistance) {
          this.debugState = 'attack-range'
          this.idleRoamTarget = null
          this.clearPath()
          this.stuckTimer = 0

          const faceOnly = new THREE.Vector3(
            player.position.x - this.mesh.position.x,
            0,
            player.position.z - this.mesh.position.z
          )

          if (faceOnly.lengthSq() > 0.0001) {
            faceOnly.normalize()
            const targetYaw = Math.atan2(faceOnly.x, faceOnly.z) - Math.PI / 2
            this.mesh.rotation.y = rotateTowardsAngle(
              this.mesh.rotation.y,
              targetYaw,
              COW_TURN_SPEED * deltaTime
            )
          }

          if (this.attackCooldown <= 0 && player && !player.isDead) {
            const beamStart = this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0))
            const beamEnd = player.position.clone().add(new THREE.Vector3(0, 1.0, 0))
            world.spawnAttackBeam(beamStart, beamEnd, 0xff4444, COW_ATTACK_BEAM_LIFE)
            world.damagePlayer(player, COW_ATTACK_DAMAGE, this.mesh.position, COW_ATTACK_PUSH)
            this.attackCooldown = COW_ATTACK_COOLDOWN
            this.debugState = 'attack-hit'
          }
        } else {
          this.debugState = 'idle-roam'
          this.setAggroState(false)
          this.clearPath()
          this.stuckTimer = 0
          isMoving = this.updateIdleRoam(deltaTime)
          if (this.idleRoamTarget) this.debugWaypoint = this.idleRoamTarget
        }
      } else {
        this.debugState = 'idle-roam'
        this.setAggroState(false)
        this.clearPath()
        this.stuckTimer = 0
        isMoving = this.updateIdleRoam(deltaTime)
        if (this.idleRoamTarget) this.debugWaypoint = this.idleRoamTarget
      }

      if (!attemptedMove) {
        this.stuckTimer = 0
      }

      if (!isMoving) {
        const sway = Math.sin(this.moveTime * COW_IDLE_SWAY_SPEED) * COW_IDLE_SWAY_AMOUNT
        this.mesh.rotation.y += sway * deltaTime * 6
      }

      this.animateLegs(deltaTime, isMoving)

      const center = new THREE.Vector3(
        this.mesh.position.x,
        this.mesh.position.y + 1.1,
        this.mesh.position.z
      )
      this.collider.box.setFromCenterAndSize(
        center,
        new THREE.Vector3(COW_COLLIDER_HALF.x * 2, COW_COLLIDER_HALF.y * 2, COW_COLLIDER_HALF.z * 2)
      )
    },
  }

  return entity
}


function createBrowserSound(src) {
  if (typeof Audio === 'undefined') return null

  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

function applySmoothPlayerKnockback(deltaTime, player, colliders) {
  if (!player?.position) return

  if (!player.knockbackVelocity) {
    player.knockbackVelocity = new THREE.Vector3()
    return
  }

  if (player.knockbackVelocity.lengthSq() <= 0.00001) {
    player.knockbackVelocity.set(0, 0, 0)
    return
  }

  const colliderHalf = getPlayerKnockbackHalf(player)
  const ignoredColliders = getIgnoredPlayerKnockbackColliders(player, colliderHalf, colliders)
  const move = player.knockbackVelocity.clone().multiplyScalar(deltaTime)
  let moved = false

  const fullTarget = player.position.clone().add(move)
  if (canOccupyKnockbackPosition(fullTarget, colliderHalf, colliders, ignoredColliders)) {
    player.position.copy(fullTarget)
    moved = true
  } else {
    const xTarget = player.position.clone().add(new THREE.Vector3(move.x, 0, 0))
    const zTarget = player.position.clone().add(new THREE.Vector3(0, 0, move.z))

    const canMoveX =
      Math.abs(move.x) > 0.0001 &&
      canOccupyKnockbackPosition(xTarget, colliderHalf, colliders, ignoredColliders)

    const canMoveZ =
      Math.abs(move.z) > 0.0001 &&
      canOccupyKnockbackPosition(zTarget, colliderHalf, colliders, ignoredColliders)

    if (canMoveX && canMoveZ) {
      if (Math.abs(move.x) >= Math.abs(move.z)) {
        player.position.copy(xTarget)
      } else {
        player.position.copy(zTarget)
      }
      moved = true
    } else if (canMoveX) {
      player.position.copy(xTarget)
      moved = true
    } else if (canMoveZ) {
      player.position.copy(zTarget)
      moved = true
    }
  }

  const damping = Math.max(0, 1 - 10.5 * deltaTime)
  player.knockbackVelocity.multiplyScalar(damping)

  if (!moved || player.knockbackVelocity.lengthSq() <= 0.0004) {
    player.knockbackVelocity.set(0, 0, 0)
  }
}

function getPlayerKnockbackHalf(player) {
  if (player?.collider?.box) {
    const size = new THREE.Vector3()
    player.collider.box.getSize(size)
    return size.multiplyScalar(0.5)
  }

  return new THREE.Vector3(0.38, 0.9, 0.38)
}

function getIgnoredPlayerKnockbackColliders(player, colliderHalf, colliders) {
  const ignored = new Set()

  if (player?.collider) {
    ignored.add(player.collider)
  }

  const supportCollider = findSupportingCollider(player.position, colliderHalf, colliders, player?.collider || null)
  if (supportCollider) {
    ignored.add(supportCollider)
  }

  return ignored
}

function findSupportingCollider(position, colliderHalf, colliders, ignoredCollider = null) {
  if (!position || !colliderHalf) return null

  const footY = position.y
  const epsilonY = 0.16
  const inset = 0.04

  const minX = position.x - colliderHalf.x + inset
  const maxX = position.x + colliderHalf.x - inset
  const minZ = position.z - colliderHalf.z + inset
  const maxZ = position.z + colliderHalf.z - inset

  for (const collider of colliders) {
    if (!collider || collider === ignoredCollider || !collider.box) continue

    const box = collider.box
    const supportsFeet = Math.abs(box.max.y - footY) <= epsilonY
    const overlapsX = maxX > box.min.x && minX < box.max.x
    const overlapsZ = maxZ > box.min.z && minZ < box.max.z

    if (supportsFeet && overlapsX && overlapsZ) {
      return collider
    }
  }

  return null
}

function canOccupyKnockbackPosition(position, colliderHalf, colliders, ignoredColliders = null) {
  const targetBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position.x, position.y + colliderHalf.y, position.z),
    new THREE.Vector3(colliderHalf.x * 2, colliderHalf.y * 2, colliderHalf.z * 2)
  )

  for (const collider of colliders) {
    if (!collider) continue
    if (ignoredColliders?.has?.(collider)) continue
    if (!targetBox.intersectsBox(collider.box)) continue
    return false
  }

  return true
}

function horizontalDistance(a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dz * dz)
}

function canMoveCowTo(world, entity, targetPosition, colliderHalf) {
  const targetBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(targetPosition.x, targetPosition.y + 1.1, targetPosition.z),
    new THREE.Vector3(colliderHalf.x * 2, colliderHalf.y * 2, colliderHalf.z * 2)
  )

  for (const collider of world.colliders) {
    if (!collider || collider === entity.collider) continue
    if (!targetBox.intersectsBox(collider.box)) continue
    return false
  }

  return true
}

function rotateTowardsAngle(current, target, maxStep) {
  let delta = target - current

  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2

  if (Math.abs(delta) <= maxStep) {
    return target
  }

  return current + Math.sign(delta) * maxStep
}

function syncEntityUI(entity, camera) {
  if (!entity.healthText || entity.isDead) return

  const anchor = entity.getAnchorPosition
    ? entity.getAnchorPosition()
    : entity.mesh.position.clone()

  entity.healthText.position.copy(anchor)

  if (camera) {
    entity.healthText.quaternion.copy(camera.quaternion)
  }
}

function updateEntityHealthText(entity, prefix = null) {
  if (!entity.healthText) return

  const label = prefix
    ? `${prefix}: ${entity.health} / ${entity.maxHealth}`
    : `${entity.health} / ${entity.maxHealth}`

  updateTextSprite(entity.healthText, label)
}

function updateFloatingTexts(deltaTime, floatingTexts, scene) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const item = floatingTexts[i]
    item.age += deltaTime

    const t = item.age / item.life
    item.sprite.position.y += item.riseSpeed * deltaTime

    const material = item.sprite.material
    if (material) {
      material.opacity = Math.max(0, 1 - t)
      material.transparent = true
    }

    if (item.age >= item.life) {
      scene.remove(item.sprite)
      disposeTextSprite(item.sprite)
      floatingTexts.splice(i, 1)
    }
  }
}


function updateAttackBeams(deltaTime, attackBeams, scene) {
  for (let i = attackBeams.length - 1; i >= 0; i--) {
    const item = attackBeams[i]
    item.age += deltaTime

    const t = item.age / item.life
    if (item.line?.material) {
      item.line.material.transparent = true
      item.line.material.opacity = Math.max(0, 1 - t)
    }

    if (item.age >= item.life) {
      if (item.line) {
        scene.remove(item.line)
        item.line.geometry?.dispose?.()
        item.line.material?.dispose?.()
      }
      attackBeams.splice(i, 1)
    }
  }
}

function flashMeshes(root) {
  const touched = []

  root.traverse((child) => {
    if (!child.isMesh || !child.material || !child.material.color) return

    const material = child.material
    touched.push({
      material,
      original: material.color.clone(),
      emissive: material.emissive ? material.emissive.clone() : null,
    })

    material.color.offsetHSL(0, 0, 0.18)

    if (material.emissive) {
      material.emissive.setRGB(0.25, 0.18, 0.08)
    }
  })

  setTimeout(() => {
    for (const item of touched) {
      item.material.color.copy(item.original)
      if (item.material.emissive && item.emissive) {
        item.material.emissive.copy(item.emissive)
      }
    }
  }, 90)
}

function createTextSprite(
  text,
  {
    fontSize = 36,
    textColor = '#ffffff',
    backgroundColor = 'rgba(0, 0, 0, 0.6)',
    borderColor = 'rgba(255,255,255,0.2)',
    borderWidth = 2,
    defaultBorderWidth = 2,
    minWorldWidth = 1.0,
    worldHeight = 0.35,
    paddingX = 18,
    paddingY = 12,
  } = {}
) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  const font = `bold ${fontSize}px Arial`
  context.font = font

  const metrics = context.measureText(text)
  const textWidth = Math.ceil(metrics.width)
  const borderPad = Math.max(0, Math.ceil(borderWidth))
  const width = textWidth + paddingX * 2 + borderPad * 2
  const height = fontSize + paddingY * 2 + borderPad * 2

  canvas.width = width
  canvas.height = height

  context.font = font
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  roundRect(context, 0, 0, width, height, 12)
  context.fillStyle = backgroundColor
  context.fill()

  context.lineWidth = borderWidth
  context.strokeStyle = borderColor
  context.stroke()

  context.fillStyle = textColor
  context.fillText(text, width / 2, height / 2 + 1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const aspect = width / height
  const worldWidth = Math.max(minWorldWidth, worldHeight * aspect)

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })

  const sprite = new THREE.Sprite(material)
  sprite.scale.set(worldWidth, worldHeight, 1)
  sprite.userData.textCanvas = canvas
  sprite.userData.textContext = context
  sprite.userData.textOptions = {
    fontSize,
    textColor,
    backgroundColor,
    borderColor,
    borderWidth,
    defaultBorderColor: arguments[1]?.defaultBorderColor || borderColor,
    defaultBorderWidth: arguments[1]?.defaultBorderWidth || defaultBorderWidth || borderWidth,
    minWorldWidth,
    worldHeight,
    paddingX,
    paddingY,
  }
  sprite.userData.currentText = text

  return sprite
}

function updateTextSprite(sprite, text) {
  if (!sprite) return

  const options = sprite.userData.textOptions || {}
  const oldMaterial = sprite.material
  const oldTexture = oldMaterial.map

  const newSprite = createTextSprite(text, options)

  sprite.material = newSprite.material
  sprite.scale.copy(newSprite.scale)
  sprite.userData = newSprite.userData

  if (oldTexture) oldTexture.dispose()
  if (oldMaterial) oldMaterial.dispose()
}

function disposeTextSprite(sprite) {
  if (!sprite) return
  if (sprite.material) {
    if (sprite.material.map) sprite.material.map.dispose()
    sprite.material.dispose()
  }
}


function createNavDebug(scene) {
  const group = new THREE.Group()
  scene.add(group)

  const pathMaterial = new THREE.LineBasicMaterial({ color: 0x55ff55 })
  const losMaterial = new THREE.LineBasicMaterial({ color: 0x4aa3ff })

  let pathLine = null
  let losLine = null
  let waypointMesh = null
  let stuckText = null

  function clearObject(obj) {
    if (!obj) return null
    group.remove(obj)
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) obj.material.dispose?.()
    return null
  }

  function update(world) {
    const cow =
      world.cowEntities?.find((entity) => entity && !entity.isDead) ||
      world.cowEntity

    if (!cow || cow.isDead) {
      clear()
      return
    }

    pathLine = clearObject(pathLine)
    losLine = clearObject(losLine)
    waypointMesh = clearObject(waypointMesh)

    if (cow.path && cow.pathIndex < cow.path.length) {
      const points = [cow.mesh.position.clone().add(new THREE.Vector3(0, 0.2, 0))]
      for (let i = cow.pathIndex; i < cow.path.length; i++) {
        points.push(cow.path[i].clone().add(new THREE.Vector3(0, 0.2, 0)))
      }
      if (points.length >= 2) {
        pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), pathMaterial.clone())
        group.add(pathLine)
      }
    }

    if (cow.debugWaypoint) {
      waypointMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffdd33 })
      )
      waypointMesh.position.copy(cow.debugWaypoint).add(new THREE.Vector3(0, 0.35, 0))
      group.add(waypointMesh)

      losLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          cow.mesh.position.clone().add(new THREE.Vector3(0, 0.3, 0)),
          cow.debugWaypoint.clone().add(new THREE.Vector3(0, 0.3, 0)),
        ]),
        losMaterial.clone()
      )
      group.add(losLine)
    }

    if (cow.debugState === 'stuck') {
      if (!stuckText) {
        stuckText = createTextSprite('STUCK', {
          fontSize: 34,
          textColor: '#ff6666',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderColor: 'rgba(255, 70, 70, 0.95)',
          borderWidth: 5,
          defaultBorderColor: 'rgba(255, 70, 70, 0.95)',
          defaultBorderWidth: 5,
          minWorldWidth: 1.25,
          worldHeight: 0.3,
        })
        group.add(stuckText)
      }
      stuckText.position.copy(cow.mesh.position).add(new THREE.Vector3(0, 4.0, 0))
    } else if (stuckText) {
      group.remove(stuckText)
      disposeTextSprite(stuckText)
      stuckText = null
    }
  }

  function clear() {
    pathLine = clearObject(pathLine)
    losLine = clearObject(losLine)
    waypointMesh = clearObject(waypointMesh)
    if (stuckText) {
      group.remove(stuckText)
      disposeTextSprite(stuckText)
      stuckText = null
    }
  }

  return { update, clear, group }
}

function updateEntityHealthBorder(entity, borderColor = null) {
  if (!entity?.healthText) return

  const options = { ...(entity.healthText.userData?.textOptions || {}) }
  const fallback = options.defaultBorderColor || 'rgba(255,255,255,0.2)'
  options.borderColor = borderColor || fallback
  options.borderWidth = borderColor ? ((options.defaultBorderWidth || 2) * 4) : (options.defaultBorderWidth || 2)

  const label =
    entity.healthText.userData?.currentText ||
    (entity.maxHealth !== undefined ? `${entity.health} / ${entity.maxHealth}` : '')

  const oldMaterial = entity.healthText.material
  const oldTexture = oldMaterial?.map

  const newSprite = createTextSprite(label, options)

  entity.healthText.material = newSprite.material
  entity.healthText.scale.copy(newSprite.scale)
  entity.healthText.userData = newSprite.userData

  if (oldTexture) oldTexture.dispose()
  if (oldMaterial) oldMaterial.dispose()
}

function randomRange(min, max) {
  return min + Math.random() * (max - min)
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}
