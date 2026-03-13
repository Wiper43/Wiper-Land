import * as THREE from 'three'

export function createHeldItem(camera) {
  // =========================================================
  // TWEAK SECTION
  // =========================================================
  const TWEAK = {
    position: { x: 0.42, y: -0.50, z: -1.00 },
    rotation: { x: -0.18, y: -0.32, z: -0.08 },
    scale: 1.0,

    bob: {
      posX: 0.01,
      posY: 0.008,
      rotX: 0.015,
      rotY: 0.02,
      rotZ: 0.01,
      speedA: 1.8,
      speedB: 2.6,
      speedC: 1.7,
      speedD: 1.2,
      speedE: 1.5,
    },

    cast: {
      duration: 0.18,
      liftY: 0.08,
      pushZ: 0.04,
      rotX: -0.16,
      rotY: 0.08,
      rotZ: 0.08,
    },
  }

  const root = new THREE.Group()
  root.name = 'heldItemRoot'
  camera.add(root)

  const spellbook = new THREE.Group()
  spellbook.name = 'heldSpellbook'
  root.add(spellbook)

  const coverGeometry = new THREE.BoxGeometry(0.34, 0.24, 0.08)
  const coverMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a2d1c,
    roughness: 0.9,
    metalness: 0.05,
  })
  const cover = new THREE.Mesh(coverGeometry, coverMaterial)
  spellbook.add(cover)

  const pagesGeometry = new THREE.BoxGeometry(0.26, 0.19, 0.05)
  const pagesMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8ccb0,
    roughness: 1.0,
    metalness: 0.0,
  })
  const pages = new THREE.Mesh(pagesGeometry, pagesMaterial)
  pages.position.set(0.02, 0.0, 0.02)
  spellbook.add(pages)

  const spineGeometry = new THREE.BoxGeometry(0.05, 0.22, 0.085)
  const spineMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c160d,
    roughness: 0.95,
    metalness: 0.02,
  })
  const spine = new THREE.Mesh(spineGeometry, spineMaterial)
  spine.position.set(-0.145, 0, 0)
  spellbook.add(spine)

  const runeGeometry = new THREE.TorusGeometry(0.045, 0.006, 12, 28)
  const runeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd08a,
    transparent: true,
    opacity: 0.75,
  })
  const rune = new THREE.Mesh(runeGeometry, runeMaterial)
  rune.position.set(0.04, 0.02, 0.045)
  spellbook.add(rune)

  const glow = new THREE.PointLight(0xffa366, 0.8, 1.6)
  glow.position.set(0.04, 0.02, 0.14)
  spellbook.add(glow)

  // Beam/cast origin point in front of the book
  const castSocket = new THREE.Object3D()
  castSocket.position.set(0.00,0.00,0.00)
  root.add(castSocket)

  let time = 0
  let castTimer = 0

  function applyBaseTransform() {
    root.position.set(
      TWEAK.position.x,
      TWEAK.position.y,
      TWEAK.position.z
    )

    root.rotation.set(
      TWEAK.rotation.x,
      TWEAK.rotation.y,
      TWEAK.rotation.z
    )

    root.scale.setScalar(TWEAK.scale)
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3)
  }

  function getCastStrength(deltaTime) {
    if (castTimer <= 0) return 0

    castTimer = Math.max(0, castTimer - deltaTime)

    const total = TWEAK.cast.duration
    const progress = 1 - castTimer / total

    if (progress < 0.5) {
      return easeOutCubic(progress / 0.5)
    }

    return 1 - (progress - 0.5) / 0.5
  }

  function cast() {
    castTimer = TWEAK.cast.duration
  }

  function getCastWorldPosition() {
    const worldPosition = new THREE.Vector3()
    castSocket.getWorldPosition(worldPosition)
    return worldPosition
  }

  applyBaseTransform()

  function update(deltaTime) {
    time += deltaTime

    const castStrength = getCastStrength(deltaTime)

    root.position.x =
      TWEAK.position.x + Math.sin(time * TWEAK.bob.speedA) * TWEAK.bob.posX

    root.position.y =
      TWEAK.position.y +
      Math.sin(time * TWEAK.bob.speedB) * TWEAK.bob.posY +
      TWEAK.cast.liftY * castStrength

    root.position.z =
      TWEAK.position.z - TWEAK.cast.pushZ * castStrength

    root.rotation.x =
      TWEAK.rotation.x +
      Math.sin(time * TWEAK.bob.speedC) * TWEAK.bob.rotX +
      TWEAK.cast.rotX * castStrength

    root.rotation.y =
      TWEAK.rotation.y +
      Math.sin(time * TWEAK.bob.speedD) * TWEAK.bob.rotY +
      TWEAK.cast.rotY * castStrength

    root.rotation.z =
      TWEAK.rotation.z +
      Math.sin(time * TWEAK.bob.speedE) * TWEAK.bob.rotZ +
      TWEAK.cast.rotZ * castStrength

    rune.rotation.z += deltaTime * 1.2
    runeMaterial.opacity = 0.75
    glow.intensity = 0.8
  }

  function setVisible(isVisible) {
    root.visible = isVisible
  }

  function dispose() {
    camera.remove(root)

    coverGeometry.dispose()
    coverMaterial.dispose()

    pagesGeometry.dispose()
    pagesMaterial.dispose()

    spineGeometry.dispose()
    spineMaterial.dispose()

    runeGeometry.dispose()
    runeMaterial.dispose()
  }

  return {
    update,
    cast,
    getCastWorldPosition,
    setVisible,
    dispose,
    root,
    spellbook,
    tweak: TWEAK,
    applyBaseTransform,
  }
}