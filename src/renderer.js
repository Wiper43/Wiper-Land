import * as THREE from 'three'

export function createRenderer(container) {
  const scene = new THREE.Scene()
  const skyColor = new THREE.Color(0xbfd4e8)
  scene.background = skyColor
  scene.fog = new THREE.Fog(0xaec6da, 240, 900)

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )

  camera.position.set(0, 3, 8)
  scene.add(camera)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.98

  const ambient = new THREE.AmbientLight(0xe7e2d6, 0.22)
  scene.add(ambient)

  const skyFill = new THREE.HemisphereLight(0xd7e8f7, 0x65705f, 1.05)
  scene.add(skyFill)

  const skyRig = new THREE.Group()
  scene.add(skyRig)

  // Northeast sun: +X is east, -Z is north in the current world/map convention.
  const sun = new THREE.DirectionalLight(0xffefc8, 1.55)
  sun.position.set(90, 120, -90)
  sun.target.position.set(0, 0, 0)
  scene.add(sun)
  scene.add(sun.target)

  // A soft counter-fill prevents the shadow side from going fully flat.
  const bounce = new THREE.DirectionalLight(0x9db8d3, 0.22)
  bounce.position.set(-55, 38, 60)
  bounce.target.position.set(0, 10, 0)
  scene.add(bounce)
  scene.add(bounce.target)

  // Visible sun disc/glow so the light direction reads in the sky.
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(7, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0xfff2c6,
      transparent: true,
      opacity: 0.95,
      fog: false,
    })
  )
  skyRig.add(sunDisc)

  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(12, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffd98e,
      transparent: true,
      opacity: 0.16,
      fog: false,
    })
  )
  skyRig.add(sunGlow)

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(850, 32, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x7fb1e0) },
        horizonColor: { value: new THREE.Color(0xd8e6f2) },
        bottomColor: { value: new THREE.Color(0xf0e5d0) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;

        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 color = mix(horizonColor, topColor, smoothstep(0.0, 0.85, max(h, 0.0)));
          color = mix(color, bottomColor, smoothstep(-0.55, -0.05, -h) * 0.45);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
  )
  skyRig.add(skyDome)

  const sunVisualDirection = new THREE.Vector3(0.5, 0.7, -0.5).normalize()
  sunDisc.position.copy(sunVisualDirection).multiplyScalar(300)
  sunGlow.position.copy(sunVisualDirection).multiplyScalar(300)

  const cloudTexture = createCloudTexture()
  const clouds = []
  const cloudLayer = new THREE.Group()
  skyRig.add(cloudLayer)

  for (let i = 0; i < 16; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.22 + Math.random() * 0.18,
        depthWrite: false,
        color: new THREE.Color(0xffffff),
        fog: false,
      })
    )

    const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.4
    const radius = 220 + Math.random() * 220
    const height = 120 + Math.random() * 55
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    sprite.position.set(x, height, z)

    const width = 120 + Math.random() * 120
    const heightScale = width * (0.28 + Math.random() * 0.2)
    sprite.scale.set(width, heightScale, 1)

    cloudLayer.add(sprite)
    clouds.push({
      sprite,
      drift: new THREE.Vector2((Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 1.8),
      wobblePhase: Math.random() * Math.PI * 2,
      baseY: height,
    })
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  function updateSky(deltaTime) {
    skyRig.position.copy(camera.position)

    for (const cloud of clouds) {
      cloud.sprite.position.x += cloud.drift.x * deltaTime
      cloud.sprite.position.z += cloud.drift.y * deltaTime
      cloud.wobblePhase += deltaTime * 0.18
      cloud.sprite.position.y = cloud.baseY + Math.sin(cloud.wobblePhase) * 2.4

      if (cloud.sprite.position.x > 420) cloud.sprite.position.x = -420
      if (cloud.sprite.position.x < -420) cloud.sprite.position.x = 420
      if (cloud.sprite.position.z > 420) cloud.sprite.position.z = -420
      if (cloud.sprite.position.z < -420) cloud.sprite.position.z = 420
    }
  }

  return { scene, camera, renderer, updateSky }
}

function createCloudTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const puffs = [
    [60, 72, 34],
    [92, 54, 42],
    [128, 62, 36],
    [162, 56, 30],
    [194, 70, 26],
    [126, 82, 40],
  ]

  for (const [x, y, radius] of puffs) {
    const gradient = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius)
    gradient.addColorStop(0, 'rgba(255,255,255,0.92)')
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.62)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}
