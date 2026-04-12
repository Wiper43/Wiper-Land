import * as THREE from 'three'

export function createBeamVisualSystem(scene) {
  const activeBeams = []
  const activeFireballs = []

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

  function spawnFireball({
    start,
    direction,
    length = 8,
    duration = 0.5,
  }) {
    const dir = direction.clone().normalize()
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0))
    if (side.lengthSq() < 0.0001) side.set(1, 0, 0)
    side.normalize()
    const upish = new THREE.Vector3().crossVectors(side, dir).normalize()

    const fireballGroup = new THREE.Group()
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc46b,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    })
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5a1f,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    })

    const streamSpheres = []
    const sphereCount = 9
    for (let i = 0; i < sphereCount; i++) {
      const radius = 0.1 + Math.random() * 0.09
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 12),
        i < 3 ? coreMaterial : shellMaterial
      )
      sphere.visible = false
      fireballGroup.add(sphere)
      streamSpheres.push({
        mesh: sphere,
        delay: (duration * 0.58) * (i / Math.max(1, sphereCount - 1)),
        lateral: (Math.random() - 0.5) * 0.42,
        vertical: (Math.random() - 0.5) * 0.24,
        drag: 0.78 + Math.random() * 0.2,
      })
    }

    fireballGroup.position.copy(start)
    scene.add(fireballGroup)

    const smokePuffs = []
    const smokeCount = 5
    for (let i = 0; i < smokeCount; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 10),
        new THREE.MeshBasicMaterial({
          color: 0x252525,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      )
      puff.visible = false
      fireballGroup.add(puff)
      smokePuffs.push({
        mesh: puff,
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.45,
          Math.random() * 0.28,
          (Math.random() - 0.5) * 0.45
        ),
      })
    }

    activeFireballs.push({
      group: fireballGroup,
      streamSpheres,
      coreMaterial,
      shellMaterial,
      smokePuffs,
      direction: dir,
      side,
      upish,
      start: start.clone(),
      distance: length,
      speed: length / Math.max(duration, 0.001),
      age: 0,
      duration,
      smokeDuration: 0.38,
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

    for (let i = activeFireballs.length - 1; i >= 0; i -= 1) {
      const fireball = activeFireballs[i]
      fireball.age += deltaTime

      if (fireball.age <= fireball.duration) {
        const t = fireball.age / fireball.duration
        const anchorDistance = Math.min(fireball.distance, fireball.speed * fireball.age)
        fireball.group.position.copy(
          fireball.start.clone().addScaledVector(fireball.direction, anchorDistance)
        )
        for (const packet of fireball.streamSpheres) {
          const sphereAge = fireball.age - packet.delay
          if (sphereAge < 0) {
            packet.mesh.visible = false
            continue
          }

          const sphereDistance = Math.min(fireball.distance, fireball.speed * sphereAge * packet.drag)
          packet.mesh.visible = true
          packet.mesh.position.copy(
            fireball.direction.clone().multiplyScalar(-Math.max(0, anchorDistance - sphereDistance))
              .add(fireball.side.clone().multiplyScalar(packet.lateral))
              .add(fireball.upish.clone().multiplyScalar(packet.vertical))
          )
          const localT = Math.min(1, sphereAge / Math.max(0.001, fireball.duration - packet.delay + 0.08))
          packet.mesh.scale.setScalar(1 - localT * 0.1)
          packet.mesh.material.opacity = (packet.mesh.material === fireball.coreMaterial ? 0.95 : 0.68) * (1 - localT * 0.32)
        }
        continue
      }

      const smokeAge = fireball.age - fireball.duration
      const smokeT = smokeAge / fireball.smokeDuration

      for (const packet of fireball.streamSpheres) {
        packet.mesh.visible = false
      }

      for (const puff of fireball.smokePuffs) {
        puff.mesh.visible = true
        puff.mesh.position.copy(puff.offset).multiplyScalar(1 + smokeT * 2.4)
        const scale = 0.8 + smokeT * 2.6
        puff.mesh.scale.setScalar(scale)
        puff.mesh.material.opacity = Math.max(0, 0.38 * (1 - smokeT))
      }

      if (smokeAge >= fireball.smokeDuration) {
        disposeFireball(fireball, scene)
        activeFireballs.splice(i, 1)
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

    for (const fireball of activeFireballs) {
      disposeFireball(fireball, scene)
    }
    activeFireballs.length = 0
  }

  return {
    spawnBeam,
    spawnFireball,
    update,
    dispose,
  }
}

function disposeFireball(fireball, scene) {
  scene.remove(fireball.group)
  for (const packet of fireball.streamSpheres) {
    packet.mesh.geometry.dispose()
  }
  fireball.coreMaterial.dispose()
  fireball.shellMaterial.dispose()

  for (const puff of fireball.smokePuffs) {
    puff.mesh.geometry.dispose()
    puff.mesh.material.dispose()
  }
}
