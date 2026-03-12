import * as THREE from 'three'

export function createTestWorld(scene, audio = {}) {
  const colliders = []
  const entities = []

  const floorGeo = new THREE.PlaneGeometry(40, 40)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a7a3a })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const grid = new THREE.GridHelper(40, 40)
  scene.add(grid)

  addBlock(scene, colliders, entities, {
    size: [40, 4, 1],
    position: [0, 2, -20],
    color: 0x666666,
    name: 'north wall',
    maxHealth: Infinity,
    blocksMovement: true,
    blocksAttack: true,
    damageable: false,
  })

  addBlock(scene, colliders, entities, {
    size: [40, 4, 1],
    position: [0, 2, 20],
    color: 0x666666,
    name: 'south wall',
    maxHealth: Infinity,
    blocksMovement: true,
    blocksAttack: true,
    damageable: false,
  })

  addBlock(scene, colliders, entities, {
    size: [1, 4, 40],
    position: [-20, 2, 0],
    color: 0x666666,
    name: 'west wall',
    maxHealth: Infinity,
    blocksMovement: true,
    blocksAttack: true,
    damageable: false,
  })

  addBlock(scene, colliders, entities, {
    size: [1, 4, 40],
    position: [20, 2, 0],
    color: 0x666666,
    name: 'east wall',
    maxHealth: Infinity,
    blocksMovement: true,
    blocksAttack: true,
    damageable: false,
  })

  addBlock(scene, colliders, entities, {
    size: [2, 1.5, 2],
    position: [0, 0.75, 0],
    color: 0x888888,
    name: 'test block 1',
    maxHealth: 30,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  addBlock(scene, colliders, entities, {
    size: [3, 1.5, 3],
    position: [6, 0.75, 2],
    color: 0x8b5a2b,
    name: 'test block 2',
    maxHealth: 40,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  addBlock(scene, colliders, entities, {
    size: [2, 3, 2],
    position: [-5, 1.5, -3],
    color: 0x8b5a2b,
    name: 'test block 3',
    maxHealth: 50,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  addBlock(scene, colliders, entities, {
    size: [6, 2, 1],
    position: [3, 1, -7],
    color: 0x7777aa,
    name: 'test block 4',
    maxHealth: 60,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  addBlock(scene, colliders, entities, {
    size: [1, 2, 8],
    position: [-8, 1, 6],
    color: 0xaa7777,
    name: 'test block 5',
    maxHealth: 60,
    blocksMovement: true,
    blocksAttack: true,
    damageable: true,
  })

  const cow = createCowDummy(scene, colliders, new THREE.Vector3(0, 0, -5), audio)
  entities.push(cow)

  return { colliders, entities }
}

function addBlock(
  scene,
  colliders,
  entities,
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

  const entity = {
    type: 'block',
    name,
    mesh,
    collider,
    health: maxHealth,
    maxHealth,
    isDead: false,
    blocksAttack,
    canTakeDamage: damageable,

    takeDamage(amount) {
      if (!this.canTakeDamage || this.isDead) return

      this.health -= amount
      flashMeshes(this.mesh)
      console.log(`${this.name} HP:`, this.health)

      if (this.health <= 0) {
        this.isDead = true
        scene.remove(this.mesh)

        const colliderIndex = colliders.indexOf(this.collider)
        if (colliderIndex !== -1) {
          colliders.splice(colliderIndex, 1)
        }

        console.log(`${this.name} destroyed`)
      }
    },
  }

  entities.push(entity)
  return entity
}

function createCowDummy(scene, colliders, position, audio) {
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

  const earGeo = new THREE.BoxGeometry(0.15, 0.2, 0.1)
  const leftEar = makeMesh(earGeo, whiteMat)
  leftEar.position.set(1.45, 1.95, -0.3)
  group.add(leftEar)

  const rightEar = makeMesh(earGeo, whiteMat)
  rightEar.position.set(1.45, 1.95, 0.3)
  group.add(rightEar)

  const hornGeo = new THREE.BoxGeometry(0.1, 0.15, 0.1)
  const leftHorn = makeMesh(hornGeo, blackMat)
  leftHorn.position.set(1.7, 1.95, -0.18)
  group.add(leftHorn)

  const rightHorn = makeMesh(hornGeo, blackMat)
  rightHorn.position.set(1.7, 1.95, 0.18)
  group.add(rightHorn)

  const legGeo = new THREE.BoxGeometry(0.22, 1.2, 0.22)
  const leg1 = makeMesh(legGeo, blackMat)
  leg1.position.set(-0.7, 0.6, -0.35)
  group.add(leg1)

  const leg2 = makeMesh(legGeo, blackMat)
  leg2.position.set(-0.7, 0.6, 0.35)
  group.add(leg2)

  const leg3 = makeMesh(legGeo, blackMat)
  leg3.position.set(0.7, 0.6, -0.35)
  group.add(leg3)

  const leg4 = makeMesh(legGeo, blackMat)
  leg4.position.set(0.7, 0.6, 0.35)
  group.add(leg4)

  const tail = makeMesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), blackMat)
  tail.position.set(-1.1, 1.55, 0)
  tail.rotation.z = -0.4
  group.add(tail)

  group.position.copy(position)
  scene.add(group)

  const healthBar = createHealthBar()
  scene.add(healthBar.group)

  let moveTimer = 0
  const moveDirection = new THREE.Vector3(1, 0, 0)
  const moveSpeed = 1.2
  const cowRadius = 0.9
  const playerPushRadius = 1.0

  const minX = -18
  const maxX = 18
  const minZ = -18
  const maxZ = 18

  const maxHealth = 50

  let mooSound = null
  if (audio?.listener) {
    mooSound = new THREE.Audio(audio.listener)
    if (audio?.mooBuffer) {
      mooSound.setBuffer(audio.mooBuffer)
    }
      mooSound.setVolume(1.0)
  }

  const enemy = {
    type: 'enemy',
    name: 'cow dummy',
    mesh: group,
    health: maxHealth,
    maxHealth,
    isDead: false,
    blocksAttack: true,
    canTakeDamage: true,

    update(deltaTime, camera, player) {
      if (this.isDead) return

      if (mooSound && !mooSound.buffer && audio?.mooBuffer) {
        mooSound.setBuffer(audio.mooBuffer)
        console.log('Attached moo sound buffer to cow')
      }

      moveTimer -= deltaTime

      if (moveTimer <= 0) {
        moveTimer = 1.5 + Math.random() * 2.0
        const angle = Math.random() * Math.PI * 2
        moveDirection.set(Math.cos(angle), 0, Math.sin(angle)).normalize()
      }

      const moveStep = moveDirection.clone().multiplyScalar(moveSpeed * deltaTime)
      const nextPosition = group.position.clone().add(moveStep)

      let blocked = false
      for (const collider of colliders) {
        if (circleIntersectsBoxXZ(nextPosition, cowRadius, collider.box)) {
          blocked = true
          break
        }
      }

      if (!blocked) {
        group.position.copy(nextPosition)
      }

      group.position.x = THREE.MathUtils.clamp(group.position.x, minX, maxX)
      group.position.z = THREE.MathUtils.clamp(group.position.z, minZ, maxZ)

      const playerPos = getPlayerPosition(player, camera)
      const dx = group.position.x - playerPos.x
      const dz = group.position.z - playerPos.z
      const distSq = dx * dx + dz * dz
      const minDist = cowRadius + playerPushRadius

      if (distSq > 0.000001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq)
        const overlap = minDist - dist
        const nx = dx / dist
        const nz = dz / dist

        group.position.x += nx * overlap
        group.position.z += nz * overlap
      }

      if (moveDirection.lengthSq() > 0.0001) {
        group.rotation.y = Math.atan2(moveDirection.x, moveDirection.z)
      }

      healthBar.group.position.set(
        group.position.x,
        group.position.y + 3.1,
        group.position.z
      )

      if (camera) {
        healthBar.group.quaternion.copy(camera.quaternion)
      }
    },

    takeDamage(amount) {
      if (this.isDead) return

      this.health -= amount
      if (this.health < 0) this.health = 0

      updateHealthBar(healthBar, this.health, this.maxHealth)
      flashMeshes(group)

      console.log('Cow HP:', this.health)
      console.log('Moo buffer loaded?', !!mooSound?.buffer)
      console.log('Audio context state:', audio?.listener?.context?.state)

      if (mooSound?.buffer) {
        if (mooSound.isPlaying) {
          mooSound.stop()
        }
        // Random pitch variation
        mooSound.playbackRate = 0.9 + Math.random() * 0.2
        mooSound.play()
        console.log('Played moo sound')
      } else {
        console.log('No moo buffer yet')
      }

      if (this.health <= 0) {
        this.isDead = true
        scene.remove(group)
        scene.remove(healthBar.group)
        console.log('Cow dummy defeated')
      }
    },
  }

  return enemy
}

function createHealthBar() {
  const group = new THREE.Group()

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.18),
    new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      side: THREE.DoubleSide,
    })
  )
  group.add(bg)

  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.12),
    new THREE.MeshBasicMaterial({
      color: 0x22cc44,
      transparent: true,
      opacity: 1,
      depthTest: false,
      side: THREE.DoubleSide,
    })
  )
  fill.position.z = 0.001
  group.add(fill)

  group.renderOrder = 999

  return { group, bg, fill, maxWidth: 1.5 }
}

function updateHealthBar(healthBar, health, maxHealth) {
  const ratio = Math.max(0, health / maxHealth)
  healthBar.fill.scale.x = ratio
  healthBar.fill.position.x = -(healthBar.maxWidth * (1 - ratio)) / 2

  if (ratio > 0.6) {
    healthBar.fill.material.color.set(0x22cc44)
  } else if (ratio > 0.3) {
    healthBar.fill.material.color.set(0xe6c84f)
  } else {
    healthBar.fill.material.color.set(0xdd3333)
  }
}

function flashMeshes(root) {
  root.traverse((child) => {
    if (!child.isMesh) return

    if (!child.userData.originalColor) {
      child.userData.originalColor = child.material.color.clone()
    }

    child.material.color.set(0xff4444)
  })

  setTimeout(() => {
    root.traverse((child) => {
      if (!child.isMesh) return
      if (!child.userData.originalColor) return
      child.material.color.copy(child.userData.originalColor)
    })
  }, 100)
}

function circleIntersectsBoxXZ(position, radius, box) {
  const closestX = THREE.MathUtils.clamp(position.x, box.min.x, box.max.x)
  const closestZ = THREE.MathUtils.clamp(position.z, box.min.z, box.max.z)

  const dx = position.x - closestX
  const dz = position.z - closestZ

  return (dx * dx + dz * dz) < radius * radius
}

function getPlayerPosition(player, camera) {
  if (player?.position) return player.position
  if (player?.getPosition) return player.getPosition()
  if (camera?.position) return camera.position
  return new THREE.Vector3()
}