import * as THREE from 'three'

export function createTestWorld(scene) {
  // This array stores all solid objects the player can collide with
  const colliders = []

  // This array stores damageable enemies for combat raycasts
  const enemies = []

  // ------------------------------------------------------------------
  // FLOOR
  // ------------------------------------------------------------------

  const floorGeo = new THREE.PlaneGeometry(40, 40)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x3a7a3a
  })

  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // Helpful visual grid for testing movement and aiming
  const grid = new THREE.GridHelper(40, 40)
  scene.add(grid)

  // ------------------------------------------------------------------
  // ARENA WALLS
  // ------------------------------------------------------------------

  addBox(scene, colliders, {
    size: [40, 4, 1],
    position: [0, 2, -20],
    color: 0x666666
  })

  addBox(scene, colliders, {
    size: [40, 4, 1],
    position: [0, 2, 20],
    color: 0x666666
  })

  addBox(scene, colliders, {
    size: [1, 4, 40],
    position: [-20, 2, 0],
    color: 0x666666
  })

  addBox(scene, colliders, {
    size: [1, 4, 40],
    position: [20, 2, 0],
    color: 0x666666
  })

  // ------------------------------------------------------------------
  // TEST BLOCKS
  // ------------------------------------------------------------------

  addBox(scene, colliders, {
    size: [2, 1.5, 2],
    position: [0, 0.75, 0],
    color: 0x888888
  })

  addBox(scene, colliders, {
    size: [3, 1.5, 3],
    position: [6, 0.75, 2],
    color: 0x8b5a2b
  })

  addBox(scene, colliders, {
    size: [2, 3, 2],
    position: [-5, 1.5, -3],
    color: 0x8b5a2b
  })

  addBox(scene, colliders, {
    size: [6, 2, 1],
    position: [3, 1, -7],
    color: 0x7777aa
  })

  addBox(scene, colliders, {
    size: [1, 2, 8],
    position: [-8, 1, 6],
    color: 0xaa7777
  })

  // ------------------------------------------------------------------
  // COW DUMMY ENEMY
  // ------------------------------------------------------------------

  const cow = createCowDummy(scene, new THREE.Vector3(0, 0, -5))
  enemies.push(cow)

  return {
    colliders,
    enemies
  }
}

// ------------------------------------------------------------------
// Adds a solid box to the world and creates a Box3 collider for it
// ------------------------------------------------------------------
function addBox(scene, colliders, { size, position, color = 0x888888 }) {
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

  colliders.push({
    mesh,
    box
  })

  return mesh
}

// ------------------------------------------------------------------
// Creates a simple cow-like dummy with health bar + hit flash + wandering
// ------------------------------------------------------------------
function createCowDummy(scene, position) {
  const group = new THREE.Group()

  // ----------------------------------------------------------------
  // Base materials
  // Each mesh gets its own cloned material so flashing restores cleanly
  // ----------------------------------------------------------------
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1 })

  function makeMesh(geometry, material) {
    return new THREE.Mesh(geometry, material.clone())
  }

  // ----------------------------------------------------------------
  // Body
  // ----------------------------------------------------------------
  const body = makeMesh(
    new THREE.BoxGeometry(2.2, 1.2, 1.1),
    whiteMat
  )
  body.position.set(0, 1.4, 0)
  group.add(body)

  // Spots
  const spot1 = makeMesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.05),
    blackMat
  )
  spot1.position.set(-0.3, 1.5, 0.58)
  group.add(spot1)

  const spot2 = makeMesh(
    new THREE.BoxGeometry(0.45, 0.4, 0.05),
    blackMat
  )
  spot2.position.set(0.5, 1.25, -0.58)
  group.add(spot2)

  // ----------------------------------------------------------------
  // Head
  // ----------------------------------------------------------------
  const head = makeMesh(
    new THREE.BoxGeometry(0.85, 0.75, 0.75),
    whiteMat
  )
  head.position.set(1.45, 1.5, 0)
  group.add(head)

  const nose = makeMesh(
    new THREE.BoxGeometry(0.25, 0.3, 0.45),
    pinkMat
  )
  nose.position.set(1.95, 1.35, 0)
  group.add(nose)

  // Ears
  const earGeo = new THREE.BoxGeometry(0.15, 0.2, 0.1)

  const leftEar = makeMesh(earGeo, whiteMat)
  leftEar.position.set(1.45, 1.95, -0.3)
  group.add(leftEar)

  const rightEar = makeMesh(earGeo, whiteMat)
  rightEar.position.set(1.45, 1.95, 0.3)
  group.add(rightEar)

  // Horns
  const hornGeo = new THREE.BoxGeometry(0.1, 0.15, 0.1)

  const leftHorn = makeMesh(hornGeo, blackMat)
  leftHorn.position.set(1.7, 1.95, -0.18)
  group.add(leftHorn)

  const rightHorn = makeMesh(hornGeo, blackMat)
  rightHorn.position.set(1.7, 1.95, 0.18)
  group.add(rightHorn)

  // Legs
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

  // Tail
  const tail = makeMesh(
    new THREE.BoxGeometry(0.08, 0.6, 0.08),
    blackMat
  )
  tail.position.set(-1.1, 1.55, 0)
  tail.rotation.z = -0.4
  group.add(tail)

  // Put cow into the scene
  group.position.copy(position)
  scene.add(group)

  // ----------------------------------------------------------------
  // Health bar
  // ----------------------------------------------------------------
  const healthBar = createHealthBar()
  healthBar.group.position.set(0, 3.1, 0)
  group.add(healthBar.group)

  // ----------------------------------------------------------------
  // Movement settings
  // ----------------------------------------------------------------
  let moveTimer = 0
  const moveDirection = new THREE.Vector3(1, 0, 0)
  const moveSpeed = 1.2

  // Arena clamp range so cow stays inside the walls
  const minX = -18
  const maxX = 18
  const minZ = -18
  const maxZ = 18

  const maxHealth = 50
  let flashTimeoutId = null

  const enemy = {
    mesh: group,
    health: maxHealth,
    maxHealth,
    isDead: false,

    update(deltaTime) {
      if (this.isDead) return

      // Countdown until the cow picks a new random direction
      moveTimer -= deltaTime

      if (moveTimer <= 0) {
        moveTimer = 1.5 + Math.random() * 2.0

        const angle = Math.random() * Math.PI * 2
        moveDirection.set(
          Math.cos(angle),
          0,
          Math.sin(angle)
        ).normalize()
      }

      // Move the cow
      group.position.addScaledVector(moveDirection, moveSpeed * deltaTime)

      // Keep the cow inside the arena
      group.position.x = THREE.MathUtils.clamp(group.position.x, minX, maxX)
      group.position.z = THREE.MathUtils.clamp(group.position.z, minZ, maxZ)

      // Make the cow face the direction it is moving
      if (moveDirection.lengthSq() > 0.0001) {
        group.rotation.y = Math.atan2(moveDirection.x, moveDirection.z)
      }
    },

    takeDamage(amount) {
      if (this.isDead) return

      this.health -= amount
      if (this.health < 0) this.health = 0

      console.log('Cow HP:', this.health)

      updateHealthBar(healthBar, this.health, this.maxHealth)
      flashCow(group, flashTimeoutId, (id) => {
        flashTimeoutId = id
      })

      if (this.health <= 0) {
        this.isDead = true
        group.remove(healthBar.group)
        scene.remove(group)
        console.log('Cow dummy defeated')
      }
    }
  }

  return enemy
}

// ------------------------------------------------------------------
// Creates a simple health bar
// ------------------------------------------------------------------
function createHealthBar() {
  const group = new THREE.Group()

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.18),
    new THREE.MeshBasicMaterial({
      color: 0x111111,
      side: THREE.DoubleSide
    })
  )
  group.add(bg)

  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.12),
    new THREE.MeshBasicMaterial({
      color: 0x22cc44,
      side: THREE.DoubleSide
    })
  )
  fill.position.z = 0.001
  group.add(fill)

  return {
    group,
    bg,
    fill,
    maxWidth: 1.5
  }
}

// ------------------------------------------------------------------
// Updates the health bar size and color
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// Brief hit flash, then restore original colors
// ------------------------------------------------------------------
function flashCow(group, currentTimeoutId, setTimeoutId) {
  if (currentTimeoutId) {
    clearTimeout(currentTimeoutId)
  }

  group.traverse((child) => {
    if (!child.isMesh) return

    if (!child.userData.originalColor) {
      child.userData.originalColor = child.material.color.clone()
    }

    child.material.color.set(0xff4444)
  })

  const timeoutId = setTimeout(() => {
    group.traverse((child) => {
      if (!child.isMesh) return
      if (!child.userData.originalColor) return

      child.material.color.copy(child.userData.originalColor)
    })
  }, 100)

  setTimeoutId(timeoutId)
}