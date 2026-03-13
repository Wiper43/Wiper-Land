import * as THREE from 'three'

export function createCombat({ camera, world }) {
  // ============================================================
  // COMBAT STATE
  // ------------------------------------------------------------
  // lastAttackTime     = left click timer
  // lastAltAttackTime  = right click timer
  // selectedRightClickAttack = spellbook choice
  // ============================================================
  const state = {
    lastAttackTime: -Infinity,
    lastAltAttackTime: -Infinity,
    selectedRightClickAttack: 'flamethrower',
  }

  // ============================================================
  // ATTACK DEFINITIONS
  // ------------------------------------------------------------
  // This is the main list of attacks.
  // Keep this easy to find and edit.
  //
  // Left click uses:
  // - directAttack
  //
  // Right click can switch between:
  // - flamethrower
  // - waterGun
  // - directAttack
  // ============================================================
  const attacks = {
    directAttack: {
      id: 'directAttack',
      name: 'Direct Attack',
      kind: 'melee',
      damage: 10,
      range: 3,
      cooldownMs: 400,
      color: '#ffffff',
      visualType: 'slash',
      knockback: 8,
    },

    flamethrower: {
      id: 'flamethrower',
      name: 'Flamethrower',
      kind: 'spell',
      damage: 20,
      range: 6,
      cooldownMs: 550,
      color: '#ff4d2d',
      visualType: 'beamShell',
      knockback: 15,
    },

    waterGun: {
      id: 'waterGun',
      name: 'Water Gun',
      kind: 'spell',
      damage: 20,
      range: 6,
      cooldownMs: 550,
      color: '#3da5ff',
      visualType: 'beamShell',
      knockback: 6.5,
    },
  }

  const raycaster = new THREE.Raycaster()

  // ============================================================
  // LEFT CLICK = DIRECT ATTACK
  // ============================================================
  function tryPrimaryAttack(now = performance.now()) {
    return tryAttackByDefinition(attacks.directAttack, 'lastAttackTime', now)
  }

  // ============================================================
  // RIGHT CLICK = SPELLBOOK ATTACK
  // ============================================================
  function trySecondaryAttack(now = performance.now()) {
    const attack = attacks[state.selectedRightClickAttack] ?? attacks.flamethrower
    return tryAttackByDefinition(attack, 'lastAltAttackTime', now)
  }

  // ============================================================
  // SHARED ATTACK ENTRY
  // ============================================================
  function tryAttackByDefinition(attack, timeKey, now) {
    if (now - state[timeKey] < attack.cooldownMs) {
      return {
        ok: false,
        type: 'cooldown',
        cooldownRemainingMs: Math.max(0, attack.cooldownMs - (now - state[timeKey])),
        attack,
      }
    }

    state[timeKey] = now

    const attackData = {
      id: attack.id,
      name: attack.name,
      kind: attack.kind,
      basePower: attack.damage,
      range: attack.range,
      cooldownMs: attack.cooldownMs,
      color: attack.color,
      visualType: attack.visualType,
      knockback: attack.knockback ?? 0,
      source: 'player',
      sourcePosition: camera.position.clone(),
    }

    // ----------------------------------------------------------
    // Spawn attack visual first.
    // This is just a visual shell, not a collider.
    // ----------------------------------------------------------
    // spawnAttackVisual(attackData)

    const result = performRaycastAttack({
      raycaster,
      camera,
      world,
      attackData,
    })

    return {
      ok: true,
      attack: attackData,
      ...result,
    }
  }

  // ============================================================
  // RAYCAST HIT DETECTION
  // ------------------------------------------------------------
  // Still uses an invisible ray for hit detection.
  // The prism shell is visual only.
  // ============================================================
  function performRaycastAttack({ raycaster, camera, world, attackData }) {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera)
    raycaster.near = 0
    raycaster.far = attackData.range

    const hittableMeshes = []
    const meshToEntity = new Map()

    for (const entity of world.entities) {
      if (!entity) continue
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
      return {
        type: 'miss',
        entity: null,
        hit: null,
        hitDistance: attackData.range,
        damage: 0,
      }
    }

    for (const hit of hits) {
      const entity = meshToEntity.get(hit.object)
      if (!entity || entity.isDead) continue

      const resolution = resolveAttackAgainstEntity({
        entity,
        attackData,
        hit,
      })

      if (resolution) return resolution
    }

    return {
      type: 'no-effect',
      entity: null,
      hit: null,
      hitDistance: attackData.range,
      damage: 0,
    }
  }

  // ============================================================
  // DAMAGE / BLOCK RESOLUTION
  // ============================================================
  function resolveAttackAgainstEntity({ entity, attackData, hit }) {
    if (entity.canTakeDamage && typeof entity.takeDamage === 'function') {
      entity.takeDamage(attackData.basePower, {
        hitPoint: hit.point,
        attackData,
        sourcePosition: attackData.sourcePosition?.clone?.() ?? null,
      })

      return {
        type: 'damage',
        entity,
        hit,
        hitDistance: hit.distance,
        damage: attackData.basePower,
      }
    }

    if (entity.blocksAttack) {
      return {
        type: 'blocked',
        entity,
        hit,
        hitDistance: hit.distance,
        damage: 0,
      }
    }

    return null
  }

  // ============================================================
  // SPELLBOOK SELECTION
  // ============================================================
  function setSelectedRightClickAttack(attackId) {
    if (!attacks[attackId]) return
    state.selectedRightClickAttack = attackId
  }

  function getSelectedRightClickAttack() {
    return state.selectedRightClickAttack
  }

  function getAttackList() {
    return Object.values(attacks)
  }

  // ============================================================
  // VISUALS
  // ------------------------------------------------------------
  // Direct Attack uses the existing screen slash in UI.
  // Flamethrower / Water Gun use a prism shell in the world.
  // ============================================================

  /* // World-space spell visual disabled for now.
  // We are using the UI spellbook cast visual instead so the spell
  // looks like it comes from the player's lower-right hand/book.

  function spawnAttackVisual(attackData) {
    if (attackData.visualType !== 'beamShell') return

    const direction = new THREE.Vector3()
    camera.getWorldDirection(direction).normalize()

    const start = new THREE.Vector3()
    camera.getWorldPosition(start)

    // Start slightly in front of camera center
    start.add(direction.clone().multiplyScalar(0.9))

    const beamGroup = createBeamShellGroup({
      color: attackData.color,
      length: attackData.range,
      blockSize: 1,
    })

    // Position group so its center sits halfway down the beam
    const centerOffset = direction.clone().multiplyScalar(attackData.range / 2)
    beamGroup.position.copy(start).add(centerOffset)

    // Rotate to match camera direction
    beamGroup.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction.clone().normalize()
    )

    world.scene.add(beamGroup)

    const createdAt = performance.now()
    const lifeMs = 140

    function cleanup() {
      if (!beamGroup.parent) return
      world.scene.remove(beamGroup)

      beamGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose()
          if (child.material) child.material.dispose()
        }
      })
    }

    const fade = () => {
      const age = performance.now() - createdAt
      const t = Math.min(age / lifeMs, 1)

      beamGroup.traverse((child) => {
        if (!child.isMesh) return
        child.material.opacity = 0.65 * (1 - t)
      })

      if (t >= 1) {
        cleanup()
        return
      }

      requestAnimationFrame(fade)
    }

    requestAnimationFrame(fade)
  }
  */

  // ============================================================
  // Creates a rectangular prism shell made of 1x1x1 cubes.
  // It is visual only and has no collision.
  //
  // Dimensions:
  // - width  = 2 blocks
  // - height = 2 blocks
  // - length = attack range in blocks
  //
  // Since width/height are only 2, every cube is visible as shell.
  // ============================================================
  function createBeamShellGroup({ color, length, blockSize = 1 }) {
    const group = new THREE.Group()

    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize)
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.65,
    })

    const widthBlocks = 2
    const heightBlocks = 2
    const lengthBlocks = Math.max(1, Math.round(length))

    const xOffset = ((widthBlocks - 1) * blockSize) / 2
    const yOffset = ((heightBlocks - 1) * blockSize) / 2
    const zOffset = ((lengthBlocks - 1) * blockSize) / 2

    for (let x = 0; x < widthBlocks; x++) {
      for (let y = 0; y < heightBlocks; y++) {
        for (let z = 0; z < lengthBlocks; z++) {
          const isShell =
            x === 0 ||
            x === widthBlocks - 1 ||
            y === 0 ||
            y === heightBlocks - 1 ||
            z === 0 ||
            z === lengthBlocks - 1

          if (!isShell) continue

          const cube = new THREE.Mesh(geometry, material.clone())
          cube.position.set(
            x * blockSize - xOffset,
            y * blockSize - yOffset,
            z * blockSize - zOffset
          )
          group.add(cube)
        }
      }
    }

    return group
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    attacks,
    state,
    tryPrimaryAttack,
    trySecondaryAttack,
    setSelectedRightClickAttack,
    getSelectedRightClickAttack,
    getAttackList,
  }
}