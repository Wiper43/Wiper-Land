import * as THREE from 'three'

export function createSpider(position = new THREE.Vector3()) {

  const geometry = new THREE.BoxGeometry(1, 2, 1)
  const material = new THREE.MeshStandardMaterial({ color: 0x000000 })

  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.copy(position)

  return {
    mesh,
    velocity: new THREE.Vector3(),
    speed: 2,
    gravity: 20,
    grounded: false,
  }
}


export function updateSpider(spider, deltaTime, blockWorld) {

  spider.velocity.y -= spider.gravity * deltaTime

  const nextY = spider.mesh.position.y + spider.velocity.y * deltaTime
  const bx = Math.floor(spider.mesh.position.x)
  const by = Math.floor(nextY - 0.5)
  const bz = Math.floor(spider.mesh.position.z)

  if (blockWorld.isSolidBlock(bx, by, bz)) {
    spider.velocity.y = 0
    spider.grounded = true
  } else {
    spider.mesh.position.y = nextY
    spider.grounded = false
  }
}