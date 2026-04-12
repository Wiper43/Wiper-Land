import * as THREE from 'three'
import { createTextSprite, disposeTextSprite } from '../../ui/floatingText.js'
import { flashMeshes, updateHealthBarText } from '../../ui/healthBars.js'

export function createTargetDummy(game, position = new THREE.Vector3()) {
  const { scene, colliders } = game

  const group = new THREE.Group()
  group.position.copy(position)
  scene.add(group)

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4128 })
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18 })
  const strawMat = new THREE.MeshStandardMaterial({ color: 0xc9a867 })
  const redMat = new THREE.MeshStandardMaterial({ color: 0xb53b2d })

  function addBox(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }

  addBox(0.42, 2.8, 0.42, 0, 1.4, 0, woodMat)
  addBox(2.4, 0.26, 0.38, 0, 2.72, 0, woodMat)
  addBox(1.7, 2.1, 0.72, 0, 1.72, 0, strawMat)
  addBox(1.2, 1.55, 0.12, 0, 1.72, 0.37, redMat)
  addBox(0.12, 1.55, 1.2, 0, 1.72, 0, redMat)
  addBox(0.6, 0.6, 0.14, 0, 1.72, 0.39, trimMat)

  const collider = {
    mesh: group,
    box: new THREE.Box3(
      new THREE.Vector3(position.x - 0.85, position.y, position.z - 0.36),
      new THREE.Vector3(position.x + 0.85, position.y + 2.9, position.z + 0.36)
    ),
    isDynamic: false,
  }
  colliders.push(collider)

  const healthBar = createTextSprite('Dummy HP: 120 / 120', {
    fontSize: 38,
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    defaultBorderColor: 'rgba(255,255,255,0.2)',
    defaultBorderWidth: 2,
    minWorldWidth: 2.0,
    worldHeight: 0.34,
  })
  healthBar.position.set(position.x, position.y + 3.4, position.z)
  scene.add(healthBar)

  const entity = {
    type: 'targetDummy',
    name: 'Target Dummy',
    mesh: group,
    collider,
    health: 120,
    maxHealth: 120,
    isDead: false,
    canTakeDamage: true,
    blocksAttack: true,
    healthText: healthBar,
    labelHeight: 3.4,
    getAnchorPosition() {
      return new THREE.Vector3(
        this.mesh.position.x,
        this.mesh.position.y + this.labelHeight,
        this.mesh.position.z
      )
    },
    takeDamage(amount, info = {}) {
      if (this.isDead) return

      this.health = Math.max(0, this.health - amount)
      flashMeshes(this.mesh)

      const damagePos = info.hitPoint
        ? info.hitPoint.clone().add(new THREE.Vector3(0, 0.35, 0))
        : this.getAnchorPosition()

      game.spawnFloatingDamage(damagePos, amount, '#ffd36b')
      updateHealthBarText(this, 'Dummy HP')

      if (this.health <= 0) {
        this.isDead = true
        scene.remove(this.mesh)
        scene.remove(this.healthText)
        disposeTextSprite(this.healthText)

        const colliderIndex = colliders.indexOf(this.collider)
        if (colliderIndex !== -1) colliders.splice(colliderIndex, 1)
      }
    },
  }

  return entity
}
