import * as THREE from 'three'
import { getChunkBlock } from './chunk.js'
import { BLOCK, isSolidBlockId } from './blocks.js'
import { CHUNK_SIZE, localToBlock } from './worldMath.js'

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

            colors.push(color.r, color.g, color.b)
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

  return mesh
}

function getBlockColor(blockId) {
  switch (blockId) {
    case BLOCK.GRASS:
      return { r: 0.35, g: 0.7, b: 0.35 }

    case BLOCK.DIRT:
      return { r: 0.45, g: 0.3, b: 0.2 }

    case BLOCK.STONE:
      return { r: 0.55, g: 0.55, b: 0.6 }

    default:
      return { r: 1, g: 1, b: 1 }
  }
}