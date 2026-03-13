import * as THREE from 'three'

export function createBeamVisualSystem(scene) {
  const activeBeams = []

  function spawnBeam({
    start,
    direction,
    length = 8,
    color = 0xff8a4a,
    duration = 0.12,
    thickness = 0.045,
  }) {
    const geometry = new THREE.CylinderGeometry(
      thickness,
      thickness,
      length,
      10,
      1,
      true
    )

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })

    const beam = new THREE.Mesh(geometry, material)

    // Cylinder is Y-axis by default, so rotate to match direction
    const up = new THREE.Vector3(0, 1, 0)
    const dir = direction.clone().normalize()

    beam.quaternion.setFromUnitVectors(up, dir)

    const midpoint = start.clone().add(dir.clone().multiplyScalar(length * 0.5))
    beam.position.copy(midpoint)

    scene.add(beam)

    activeBeams.push({
      mesh: beam,
      material,
      age: 0,
      duration,
    })
  }

  function update(deltaTime) {
    for (let i = activeBeams.length - 1; i >= 0; i -= 1) {
      const beamData = activeBeams[i]
      beamData.age += deltaTime

      const t = beamData.age / beamData.duration
      beamData.material.opacity = Math.max(0, 0.95 * (1 - t))

      if (beamData.age >= beamData.duration) {
        scene.remove(beamData.mesh)
        beamData.mesh.geometry.dispose()
        beamData.material.dispose()
        activeBeams.splice(i, 1)
      }
    }
  }

  function dispose() {
    for (const beamData of activeBeams) {
      scene.remove(beamData.mesh)
      beamData.mesh.geometry.dispose()
      beamData.material.dispose()
    }
    activeBeams.length = 0
  }

  return {
    spawnBeam,
    update,
    dispose,
  }
}