// ============================================================
// SPHERE MESHER  (cube-sphere version)
//
// Each voxel is a spherical-frustum sector.  Vertex positions
// are computed via blockCornerToWorld() from cubeSphereCoords.
//
// Face ordering (6 faces per block):
//   0  bz-  outer surface face (faces away from core)
//   1  bz+  inner face        (faces toward core)
//   2  bx-  face in -bx direction
//   3  bx+  face in +bx direction
//   4  by-  face in -by direction
//   5  by+  face in +by direction
//
// Corner winding is chosen so cross(e1, e2) points OUTWARD.
// No pole-skipping needed — the cube-sphere mapping is uniform.
// ============================================================

import * as THREE from 'three'
import { BLOCK, isSolidBlockId } from '../blocks.js'
import { CHUNK_SIZE } from '../worldMath.js'
import { blockCornerToWorld, blockToWorld, wrapBlockCoords } from './cubeSphereCoords.js'
import { faceLocalToBlock } from './cubeSphereChunkMath.js'
import { getApproxEarthSurfaceColor } from './earthAppearance.js'

// ── Face definitions ─────────────────────────────────────────
//
// neighborOffset — [dbx, dby, dbz] direction of the adjacent block
// corners        — 4 corner indices (from blockCornerToWorld) in
//                  CCW order when viewed from the face's outward side

const CUBE_FACE_DEFS = [
  // 0: bz- face — outer surface — normal radially outward
  { neighborOffset: [0, 0, -1], corners: [0, 1, 3, 2] },
  // 1: bz+ face — inner surface — reversed winding
  { neighborOffset: [0, 0,  1], corners: [4, 6, 7, 5] },
  // 2: bx- face
  { neighborOffset: [-1, 0, 0], corners: [0, 2, 6, 4] },
  // 3: bx+ face
  { neighborOffset: [ 1, 0, 0], corners: [1, 5, 7, 3] },
  // 4: by- face
  { neighborOffset: [0, -1, 0], corners: [0, 4, 5, 1] },
  // 5: by+ face
  { neighborOffset: [0,  1, 0], corners: [2, 3, 7, 6] },
]

// ── Shared material ──────────────────────────────────────────

export function createSphereBlockMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  })
}

// ── Mesh builder ─────────────────────────────────────────────

const _e1     = new THREE.Vector3()
const _e2     = new THREE.Vector3()
const _normal = new THREE.Vector3()
const _radialUp = new THREE.Vector3()

export function buildSphereChunkMesh(chunk, world, material) {
  const positions     = []
  const normals       = []
  const colors        = []
  const indices       = []
  const edgePositions = []

  const chunkFace = chunk.faceIdx   // cube face index (0–5) for this chunk

  let vertexOffset = 0

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const blockId = world.getLocalBlock(chunk, lx, ly, lz)
        if (blockId === BLOCK.AIR) continue
        if (!isSolidBlockId(blockId)) continue

        const { bx, by, bz } = faceLocalToBlock(chunkFace, chunk.cx, chunk.cy, chunk.cz, lx, ly, lz)

        const color = getSphereBlockColor(blockId, chunkFace, bx, by, bz)

        for (const faceDef of CUBE_FACE_DEFS) {
          const [dbx, dby, dbz] = faceDef.neighborOffset

          // We do not need the globe-wide inward-facing shell cap.
          // Rendering it creates a dark inner sphere toward the core.
          if (dbz === 1 && bz === 0) continue

          // Resolve neighbour, wrapping across cube-face boundaries
          const nbz = bz + dbz
          let neighborId
          if (dbz === 0) {
            const wrapped = wrapBlockCoords(chunkFace, bx + dbx, by + dby)
            neighborId = world.getBlockId(wrapped.faceIdx, wrapped.bx, wrapped.by, nbz)
          } else {
            neighborId = world.getBlockId(chunkFace, bx, by, nbz)
          }

          if (isSolidBlockId(neighborId)) continue

          // Compute the 4 world-space corner positions
          const p0 = blockCornerToWorld(chunkFace, bx, by, bz, faceDef.corners[0])
          const p1 = blockCornerToWorld(chunkFace, bx, by, bz, faceDef.corners[1])
          const p2 = blockCornerToWorld(chunkFace, bx, by, bz, faceDef.corners[2])
          const p3 = blockCornerToWorld(chunkFace, bx, by, bz, faceDef.corners[3])

          // Face normal from cross product of diagonals
          _e1.subVectors(p2, p0)
          _e2.subVectors(p1, p3)
          _normal.crossVectors(_e1, _e2).normalize()

          // Radial-up at block centre for lighting bias
          _radialUp.set(
            (p0.x + p1.x + p2.x + p3.x) * 0.25,
            (p0.y + p1.y + p2.y + p3.y) * 0.25,
            (p0.z + p1.z + p2.z + p3.z) * 0.25,
          ).normalize()

          // Ensure normal faces away from sphere centre
          if (_normal.dot(_radialUp) < 0 && dbz !== 1) {
            _normal.negate()
          }
          if (dbz === 1 && _normal.dot(_radialUp) > 0) {
            _normal.negate()
          }

          const light = getSphereBlockLight(world, chunkFace, bx, by, bz, _normal, _radialUp)
          const r = color.r * light
          const g = color.g * light
          const b = color.b * light

          for (const p of [p0, p1, p2, p3]) {
            positions.push(p.x, p.y, p.z)
            normals.push(_normal.x, _normal.y, _normal.z)
            colors.push(r, g, b)
          }

          indices.push(
            vertexOffset,     vertexOffset + 1, vertexOffset + 2,
            vertexOffset,     vertexOffset + 2, vertexOffset + 3,
          )

          appendSphereEdge(edgePositions, p0, p1, p2, p3, _normal)
          vertexOffset += 4
        }
      }
    }
  }

  if (positions.length === 0) return null

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3))
  geometry.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow    = false
  mesh.receiveShadow = true
  mesh.frustumCulled = true

  if (edgePositions.length > 0) {
    const edgeGeo = new THREE.BufferGeometry()
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3))
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
    mesh.add(new THREE.LineSegments(edgeGeo, edgeMat))
  }

  return mesh
}

// ── Helpers ───────────────────────────────────────────────────

function appendSphereEdge(edgePositions, p0, p1, p2, p3, normal) {
  const inset = 0.002
  const nx = normal.x * inset
  const ny = normal.y * inset
  const nz = normal.z * inset

  const corners = [p0, p1, p2, p3]
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    edgePositions.push(
      a.x + nx, a.y + ny, a.z + nz,
      b.x + nx, b.y + ny, b.z + nz,
    )
  }
}

function getSphereBlockLight(world, faceIdx, bx, by, bz, faceNormal, radialUp) {
  const sky = world.getSkyLightAt(faceIdx, bx, by, bz)

  const dotUp = faceNormal.dot(radialUp)
  let faceBias
  if (dotUp > 0.7)       faceBias = 1.0
  else if (dotUp < -0.7) faceBias = 0.5
  else                   faceBias = 0.74 + dotUp * 0.1

  return THREE.MathUtils.lerp(0.2, 1.0, sky) * faceBias
}

function getSphereBlockColor(blockId, faceIdx, bx, by, bz) {
  if (blockId === BLOCK.CLOUD) {
    return {
      r: 0.96,
      g: 0.97,
      b: 0.99,
    }
  }

  if (blockId === BLOCK.DIRT) {
    return {
      r: 0.46,
      g: 0.34,
      b: 0.22,
    }
  }

  if (blockId === BLOCK.STONE) {
    return {
      r: 0.52,
      g: 0.52,
      b: 0.56,
    }
  }

  const worldPos = blockToWorld(faceIdx, bx, by, bz)
  const radius = Math.max(0.0001, worldPos.length())
  const latitude = Math.asin(THREE.MathUtils.clamp(worldPos.y / radius, -1, 1)) * THREE.MathUtils.RAD2DEG
  const longitude = Math.atan2(worldPos.z, worldPos.x) * THREE.MathUtils.RAD2DEG
  return getApproxEarthSurfaceColor(latitude, longitude)
}
