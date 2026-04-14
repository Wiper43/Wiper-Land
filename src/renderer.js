import * as THREE from 'three'

export function createRenderer(container) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x03060c)

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    3000,
  )
  camera.position.set(0, 3, 8)
  scene.add(camera)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  container.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xf2f6ff, 1.15)
  scene.add(ambient)

  const hemi = new THREE.HemisphereLight(0xffffff, 0xe6ecf5, 1.1)
  scene.add(hemi)

  const fillA = new THREE.DirectionalLight(0xffffff, 0.45)
  fillA.position.set(1, 1, 1)
  scene.add(fillA)

  const fillB = new THREE.DirectionalLight(0xffffff, 0.35)
  fillB.position.set(-1, -0.4, -1)
  scene.add(fillB)

  const fillC = new THREE.DirectionalLight(0xdde6f6, 0.25)
  fillC.position.set(-1, 0.6, 1)
  scene.add(fillC)

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  function updateSky(_deltaTime) {}

  return { scene, camera, renderer, updateSky }
}
