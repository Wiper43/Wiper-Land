import * as THREE from 'three'
import { createTextSprite, disposeTextSprite } from '../../ui/floatingText.js'
import { flashMeshes, updateHealthBarText } from '../../ui/healthBars.js'
import { applyGravityAndGrounding } from '../entityMovement.js'

// ============================================================
// SPIDER ENTITY
// First fully voxel-native combat entity.
// Proves: entity ↔ BlockWorld collision + health + combat.
// ============================================================

export function createSpider(game, position = new THREE.Vector3()) {
  const { scene } = game

  const geometry = new THREE.BoxGeometry(1, 2, 1)
  const material = new THREE.MeshStandardMaterial({ color: 0x111111 })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(position)
  scene.add(mesh)

  const healthBar = createTextSprite('Spider HP: 40 / 40', {
    fontSize: 34,
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderColor: 'rgba(255,255,255,0.18)',
    minWorldWidth: 1.5,
    worldHeight: 0.3,
  })
  healthBar.position.set(position.x, position.y + 2.4, position.z)
  scene.add(healthBar)

  const entity = {
    type: 'spider',
    name: 'spider',
    isLiving: true,
    mesh,
    velocity: new THREE.Vector3(),
    grounded: false,
    health: 40,
    maxHealth: 40,
    isDead: false,
    canTakeDamage: true,
    blocksAttack: true,
    healthText: healthBar,
    labelHeight: 2.4,

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
        ? info.hitPoint.clone().add(new THREE.Vector3(0, 0.3, 0))
        : this.getAnchorPosition()

      game.spawnFloatingDamage(damagePos, amount, '#aaffaa')
      updateHealthBarText(this, 'Spider HP')

      if (this.health <= 0) {
        this.isDead = true
        scene.remove(this.mesh)

        if (this.healthText) {
          scene.remove(this.healthText)
          disposeTextSprite(this.healthText)
        }
      }
    },

    onDeath() {},

    update(deltaTime, camera, player) {
      if (this.isDead) return
      applyGravityAndGrounding(this, deltaTime, game.blockWorld)
    },
  }

  return entity
}
