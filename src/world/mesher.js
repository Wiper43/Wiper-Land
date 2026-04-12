import * as THREE from 'three'
import { getChunkBlock } from './chunk.js'
import { BLOCK, isSolidBlockId } from './blocks.js'
import { CHUNK_SIZE, localToBlock } from './worldMath.js'
import { getActiveWorldPreset } from './worldPresets.js'

const FACE_DEFS = [
  // +X
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },

  // -X
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },

  // +Y
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },

  // -Y
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },

  // +Z
  {
    normal: [0, 0, 1],
    corners: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
  },

  // -Z
  {
    normal: [0, 0, -1],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
]

export function createWorldBlockMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
  })
}

export function buildChunkMesh(chunk, world, material) {
  const positions = []
  const normals = []
  const colors = []
  const indices = []
  const edgePositions = []

  let vertexOffset = 0

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const blockId = getChunkBlock(chunk, lx, ly, lz)
        if (blockId === BLOCK.AIR) continue
        if (!isSolidBlockId(blockId)) continue

        const { bx, by, bz } = localToBlock(chunk.cx, chunk.cy, chunk.cz, lx, ly, lz)
        const color = getBlockColor(blockId)

        for (const face of FACE_DEFS) {
          const nx = bx + face.normal[0]
          const ny = by + face.normal[1]
          const nz = bz + face.normal[2]

          const neighborId = world.getBlockId(nx, ny, nz)
          if (isSolidBlockId(neighborId)) continue

          appendFaceOutline(edgePositions, bx, by, bz, face)
          const light = getFaceSkyLight(world, bx, by, bz, face)
          const litColor = {
            r: color.r * light,
            g: color.g * light,
            b: color.b * light,
          }

          for (const corner of face.corners) {
            positions.push(
              bx + corner[0],
              by + corner[1],
              bz + corner[2]
            )

            normals.push(
              face.normal[0],
              face.normal[1],
              face.normal[2]
            )

            colors.push(litColor.r, litColor.g, litColor.b)
          }
          indices.push(
            vertexOffset + 0,
            vertexOffset + 1,
            vertexOffset + 2,
            vertexOffset + 0,
            vertexOffset + 2,
            vertexOffset + 3
          )

          vertexOffset += 4
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = false
  mesh.receiveShadow = true
  mesh.frustumCulled = true

  if (edgePositions.length > 0) {
    const edgeGeometry = new THREE.BufferGeometry()
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3))

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })

    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial)
    edgeLines.renderOrder = 2
    mesh.add(edgeLines)
  }

  return mesh
}

function appendFaceOutline(edgePositions, bx, by, bz, face) {
  const edgeInset = 0.002
  const nx = face.normal[0] * edgeInset
  const ny = face.normal[1] * edgeInset
  const nz = face.normal[2] * edgeInset

  for (let i = 0; i < face.corners.length; i++) {
    const a = face.corners[i]
    const b = face.corners[(i + 1) % face.corners.length]

    edgePositions.push(
      bx + a[0] + nx,
      by + a[1] + ny,
      bz + a[2] + nz,
      bx + b[0] + nx,
      by + b[1] + ny,
      bz + b[2] + nz
    )
  }
}

function getFaceSkyLight(world, bx, by, bz, face) {
  const sampleX = bx + 0.5 + face.normal[0] * 0.6
  const sampleY = by + 0.5 + face.normal[1] * 0.6
  const sampleZ = bz + 0.5 + face.normal[2] * 0.6

  const sky = world.getSkyLightAt(
    Math.floor(sampleX),
    Math.floor(sampleY),
    Math.floor(sampleZ)
  )

  let faceBias = 0.74
  if (face.normal[1] > 0) faceBias = 1.0
  else if (face.normal[1] < 0) faceBias = 0.5
  else if (face.normal[0] !== 0) faceBias = 0.82

  return THREE.MathUtils.lerp(0.2, 1.0, sky) * faceBias
}

function getBlockColor(blockId) {
  const palette = getActiveWorldPreset().colors

  switch (blockId) {
    case BLOCK.GRASS:
      return palette.grass

    case BLOCK.DIRT:
      return palette.dirt

    case BLOCK.STONE:
      return palette.stone

    default:
      return { r: 1, g: 1, b: 1 }
  }
}
