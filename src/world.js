import * as THREE from 'three'

export function createTestWorld(scene, audio = {}) {
  const colliders = []
  const entities = []
  const floatingTexts = []

  const world = {
    scene,
    colliders,
    entities,
    floatingTexts,
    cowEntity: null,
    audio,

    update(deltaTime, camera, player) {
      updateFloatingTexts(deltaTime, floatingTexts, scene)

      for (const entity of entities) {
        if (!entity || entity.isDead) continue

        if (typeof entity.update === 'function') {
          entity.update(deltaTime, camera, player)
        }

        syncEntityUI(entity, camera)
      }
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
      if (!this.cowEntity) return

      const safeVolume = Math.max(0, Math.min(1, Number(volume) || 0))
      this.cowEntity.cowVolume = safeVolume

      if (this.cowEntity.mooSound) {
        this.cowEntity.mooSound.setVolume(safeVolume)
      }
    },

    setCowSoundBuffer(buffer) {
      if (!this.cowEntity) return
      this.cowEntity.setSoundBuffer(buffer)
    },
  }

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambient)

  const dir = new THREE.DirectionalLight(0xffffff, 1.2)
  dir.position.set(8, 14, 6)
  scene.add(dir)

  const floorGeo = new THREE.PlaneGeometry(40, 40)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a7a3a })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

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

  const cow = createCowDummy(world, new THREE.Vector3(0, 0, -5), audio)
  world.cowEntity = cow
  entities.push(cow)

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
        }
      }
    },
  }

  entities.push(entity)
  return entity
}

function createCowDummy(world, position, audio) {
  const { scene, colliders } = world

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

  const legPositions = [
    [-0.7, 0.55, 0.35],
    [-0.7, 0.55, -0.35],
    [0.7, 0.55, 0.35],
    [0.7, 0.55, -0.35],
  ]

  for (const [lx, ly, lz] of legPositions) {
    const leg = makeMesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), blackMat)
    leg.position.set(lx, ly, lz)
    group.add(leg)
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

  const colliderHalf = new THREE.Vector3(1.15, 1.1, 0.7)
  const box = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position.x, position.y + 1.1, position.z),
    new THREE.Vector3(colliderHalf.x * 2, colliderHalf.y * 2, colliderHalf.z * 2)
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
    sound.setVolume(entity.cowVolume ?? 0.45)
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

    update(deltaTime) {
      if (this.isDead) return

      this.moveTime += deltaTime
      const sway = Math.sin(this.moveTime * 2.0) * 0.02
      this.mesh.rotation.y = sway

      const center = new THREE.Vector3(
        this.mesh.position.x,
        this.mesh.position.y + 1.1,
        this.mesh.position.z
      )
      this.collider.box.setFromCenterAndSize(
        center,
        new THREE.Vector3(colliderHalf.x * 2, colliderHalf.y * 2, colliderHalf.z * 2)
      )
    },
  }

  return entity
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
  const width = textWidth + paddingX * 2
  const height = fontSize + paddingY * 2

  canvas.width = width
  canvas.height = height

  context.font = font
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  roundRect(context, 0, 0, width, height, 12)
  context.fillStyle = backgroundColor
  context.fill()

  context.lineWidth = 2
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
    minWorldWidth,
    worldHeight,
    paddingX,
    paddingY,
  }

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