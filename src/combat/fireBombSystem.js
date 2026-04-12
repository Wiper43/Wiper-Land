import * as THREE from 'three'
import { BLOCK, isDestructibleBlockId } from '../world/blocks.js'

const FIRE_BOMB_CHARGE_TIME = 1.0
const FIRE_BOMB_SPEED = 6.5
const FIRE_BOMB_RANGE = 30
const FIRE_BOMB_DAMAGE = 100
const FIRE_BOMB_BASE_RADIUS = 3
const FIRE_BOMB_CHARGED_RADIUS = 6

export function createFireBombSystem(game) {
  const activeBombs = []
  const aimDirection = new THREE.Vector3()
  const tempPosition = new THREE.Vector3()

  let chargeTime = 0

  function update(deltaTime) {
    const holding = game.input.isPrimaryHeld()
    const released = game.input.consumePrimaryRelease()

    if (holding) {
      chargeTime = Math.min(FIRE_BOMB_CHARGE_TIME, chargeTime + deltaTime)
    }

    if (released && chargeTime > 0.02) {
      launchBomb(chargeTime >= FIRE_BOMB_CHARGE_TIME - 0.001)
      chargeTime = 0
    } else if (!holding) {
      chargeTime = 0
    }

    game.ui.setFireBombCharge(
      holding || chargeTime > 0,
      chargeTime / FIRE_BOMB_CHARGE_TIME,
      chargeTime >= FIRE_BOMB_CHARGE_TIME - 0.001
    )

    updateBombs(deltaTime)
  }

  function launchBomb(isCharged) {
    const start = game.heldItem.getCastWorldPosition()
    game.camera.getWorldDirection(aimDirection)
    game.heldItem.cast()

    const outer = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 14, 14),
      new THREE.MeshBasicMaterial({
        color: 0xff6a2a,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    )
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffd07a,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      })
    )
    const group = new THREE.Group()
    group.add(outer, inner)
    group.position.copy(start)
    game.scene.add(group)

    activeBombs.push({
      group,
      outer,
      inner,
      position: start.clone(),
      direction: aimDirection.clone().normalize(),
      traveled: 0,
      blastRadius: isCharged ? FIRE_BOMB_CHARGED_RADIUS : FIRE_BOMB_BASE_RADIUS,
    })
  }

  function updateBombs(deltaTime) {
    for (let i = activeBombs.length - 1; i >= 0; i--) {
      const bomb = activeBombs[i]
      const previous = bomb.position.clone()
      const moveDistance = Math.min(FIRE_BOMB_SPEED * deltaTime, FIRE_BOMB_RANGE - bomb.traveled)
      bomb.position.addScaledVector(bomb.direction, moveDistance)
      bomb.traveled += moveDistance

      const collisionPoint = findCollisionAlongSegment(previous, bomb.position)
      bomb.group.position.copy(collisionPoint ?? bomb.position)

      if (collisionPoint || bomb.traveled >= FIRE_BOMB_RANGE) {
        detonateBomb(bomb, collisionPoint ?? bomb.position)
        activeBombs.splice(i, 1)
      }
    }
  }

  function findCollisionAlongSegment(start, end) {
    const segment = end.clone().sub(start)
    const length = segment.length()
    const steps = Math.max(1, Math.ceil(length / 0.3))

    for (let step = 1; step <= steps; step++) {
      const t = step / steps
      tempPosition.copy(start).lerp(end, t)

      if (game.blockWorld.isSolidBlock(
        Math.floor(tempPosition.x),
        Math.floor(tempPosition.y),
        Math.floor(tempPosition.z)
      )) {
        return tempPosition.clone()
      }

      for (const entity of game.entitySystem.getAttackable()) {
        if (!entity || entity.isDead || !entity.collider?.box) continue
        if (distanceSqToBox(tempPosition, entity.collider.box) <= 0.12) {
          return tempPosition.clone()
        }
      }
    }

    return null
  }

  function detonateBomb(bomb, center) {
    game.scene.remove(bomb.group)
    bomb.outer.geometry.dispose()
    bomb.outer.material.dispose()
    bomb.inner.geometry.dispose()
    bomb.inner.material.dispose()

    spawnExplosionVisual(center, bomb.blastRadius)
    damageEntities(center, bomb.blastRadius)
    damageBlocks(center, bomb.blastRadius)
  }

  function spawnExplosionVisual(center, radius) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.32, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffa84d,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      })
    )
    flash.position.copy(center)
    game.scene.add(flash)

    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.45, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0x2f2b2a,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    )
    smoke.position.copy(center)
    game.scene.add(smoke)

    const life = 0.35
    game.attackBeams.push({
      line: null,
      age: 0,
      life,
      updateVisual(t) {
        const flashScale = 1 + t * 2.4
        flash.scale.setScalar(flashScale)
        flash.material.opacity = Math.max(0, 0.8 * (1 - t))
        smoke.scale.setScalar(1 + t * 1.8)
        smoke.material.opacity = Math.max(0, 0.42 * (1 - t))
      },
      cleanup() {
        game.scene.remove(flash)
        game.scene.remove(smoke)
        flash.geometry.dispose()
        flash.material.dispose()
        smoke.geometry.dispose()
        smoke.material.dispose()
      },
    })
  }

  function damageEntities(center, radius) {
    for (const entity of game.entitySystem.getAttackable()) {
      if (!entity || entity.isDead || !entity.canTakeDamage) continue

      const hit = entity.collider?.box
        ? distanceSqToBox(center, entity.collider.box) <= radius * radius
        : entity.mesh?.position?.distanceToSquared(center) <= radius * radius

      if (!hit) continue

      entity.takeDamage(FIRE_BOMB_DAMAGE, {
        hitPoint: center.clone(),
        attackData: {
          id: 'fireBomb',
          name: 'Fire Bomb',
          basePower: FIRE_BOMB_DAMAGE,
        },
      })
    }
  }

  function damageBlocks(center, radius) {
    const minX = Math.floor(center.x - radius)
    const maxX = Math.floor(center.x + radius)
    const minY = Math.floor(center.y - radius)
    const maxY = Math.floor(center.y + radius)
    const minZ = Math.floor(center.z - radius)
    const maxZ = Math.floor(center.z + radius)
    const breakRadiusSq = (radius + 0.9) * (radius + 0.9)

    for (let bz = minZ; bz <= maxZ; bz++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bx = minX; bx <= maxX; bx++) {
          const blockId = game.blockWorld.getBlockId(bx, by, bz)
          if (blockId === BLOCK.AIR || !isDestructibleBlockId(blockId)) continue

          const dx = (bx + 0.5) - center.x
          const dy = (by + 0.5) - center.y
          const dz = (bz + 0.5) - center.z
          if ((dx * dx + dy * dy + dz * dz) > breakRadiusSq) continue

          game.blockWorld.breakBlock(bx, by, bz)
        }
      }
    }
  }

  function dispose() {
    for (const bomb of activeBombs) {
      game.scene.remove(bomb.group)
      bomb.outer.geometry.dispose()
      bomb.outer.material.dispose()
      bomb.inner.geometry.dispose()
      bomb.inner.material.dispose()
    }
    activeBombs.length = 0
  }

  return {
    update,
    dispose,
  }
}

function distanceSqToBox(point, box) {
  const x = Math.max(box.min.x, Math.min(point.x, box.max.x))
  const y = Math.max(box.min.y, Math.min(point.y, box.max.y))
  const z = Math.max(box.min.z, Math.min(point.z, box.max.z))
  const dx = point.x - x
  const dy = point.y - y
  const dz = point.z - z
  return dx * dx + dy * dy + dz * dz
}
