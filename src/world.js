import * as THREE from 'three'

export function createTestWorld(scene) {
  const colliders = []

  const floorGeo = new THREE.PlaneGeometry(40, 40)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x3a7a3a
  })

  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const grid = new THREE.GridHelper(40, 40)
  scene.add(grid)

  // Arena boundary walls
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

  // Central test block
  addBox(scene, colliders, {
    size: [2, 2, 2],
    position: [0, 1, 0],
    color: 0x888888
  })

  // Extra movement / jump test pieces
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

  return {
    colliders
  }
}

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