import * as THREE from 'three'

export function createTestWorld(scene) {

  const floorGeo = new THREE.PlaneGeometry(40, 40)

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x3a7a3a
  })

  const floor = new THREE.Mesh(floorGeo, floorMat)

  floor.rotation.x = -Math.PI / 2

  scene.add(floor)

  const boxGeo = new THREE.BoxGeometry(2, 2, 2)

  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x888888
  })

  const box = new THREE.Mesh(boxGeo, boxMat)

  box.position.set(0, 1, 0)

  scene.add(box)

  const grid = new THREE.GridHelper(40, 40)

  scene.add(grid)
}