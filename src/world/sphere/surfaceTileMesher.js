import * as THREE from 'three'
import { CHUNK_SIZE } from '../worldMath.js'
import { blockCornerToWorld, blockToWorld, wrapBlockCoords } from './cubeSphereCoords.js'
import { getApproxEarthSurfaceColor } from './earthAppearance.js'
import { getColumnProfile, SPHERE_PRESET } from './spherePresets.js'

const _e1 = new THREE.Vector3()
const _e2 = new THREE.Vector3()
const _normal = new THREE.Vector3()
const _radialUp = new THREE.Vector3()

export function getSurfaceTileKey(faceIdx, cx, cy) {
  return `${faceIdx},${cx},${cy}`
}

export function buildSurfaceTileMesh(faceIdx, cx, cy, material) {
  const positions = []
  const normals = []
  const colors = []
  const indices = []
  const edgePositions = []
  let vertexOffset = 0

  const startBx = cx * CHUNK_SIZE
  const startBy = cy * CHUNK_SIZE

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const bx = startBx + lx
      const by = startBy + ly
      const topBz = getTopSolidBz(faceIdx, bx, by)
      const topBlockId = SPHERE_PRESET.getBlockId(faceIdx, bx, by, topBz)
      if (topBlockId === 0) continue

      const topP0 = blockCornerToWorld(faceIdx, bx, by, topBz, 0)
      const topP1 = blockCornerToWorld(faceIdx, bx, by, topBz, 1)
      const topP2 = blockCornerToWorld(faceIdx, bx, by, topBz, 3)
      const topP3 = blockCornerToWorld(faceIdx, bx, by, topBz, 2)
      vertexOffset = appendQuad(
        positions,
        normals,
        colors,
        indices,
        edgePositions,
        vertexOffset,
        topP0,
        topP1,
        topP2,
        topP3,
        getSurfaceColor(faceIdx, bx, by, topBz),
      )

      vertexOffset = appendVerticalFace(
        positions,
        normals,
        colors,
        indices,
        edgePositions,
        vertexOffset,
        faceIdx,
        bx,
        by,
        topBz,
        1,
        0,
        1,
        3,
      )
      vertexOffset = appendVerticalFace(
        positions,
        normals,
        colors,
        indices,
        edgePositions,
        vertexOffset,
        faceIdx,
        bx,
        by,
        topBz,
        -1,
        0,
        0,
        2,
      )
      vertexOffset = appendVerticalFace(
        positions,
        normals,
        colors,
        indices,
        edgePositions,
        vertexOffset,
        faceIdx,
        bx,
        by,
        topBz,
        0,
        1,
        2,
        3,
      )
      vertexOffset = appendVerticalFace(
        positions,
        normals,
        colors,
        indices,
        edgePositions,
        vertexOffset,
        faceIdx,
        bx,
        by,
        topBz,
        0,
        -1,
        0,
        1,
      )
    }
  }

  if (positions.length === 0) return null

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
    const edgeGeo = new THREE.BufferGeometry()
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3))
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
    mesh.add(new THREE.LineSegments(edgeGeo, edgeMat))
  }

  return mesh
}

function appendVerticalFace(
  positions,
  normals,
  colors,
  indices,
  edgePositions,
  vertexOffset,
  faceIdx,
  bx,
  by,
  topBz,
  ox,
  oy,
  lowerCornerA,
  lowerCornerB,
) {
  const wrapped = wrapBlockCoords(faceIdx, bx + ox, by + oy)
  const neighborTopBz = getTopSolidBz(wrapped.faceIdx, wrapped.bx, wrapped.by)
  if (neighborTopBz <= topBz) return vertexOffset

  const topA = blockCornerToWorld(faceIdx, bx, by, topBz, lowerCornerA)
  const topB = blockCornerToWorld(faceIdx, bx, by, topBz, lowerCornerB)
  const bottomB = blockCornerToWorld(faceIdx, bx, by, neighborTopBz, lowerCornerB)
  const bottomA = blockCornerToWorld(faceIdx, bx, by, neighborTopBz, lowerCornerA)

  return appendQuad(
    positions,
    normals,
    colors,
    indices,
    edgePositions,
    vertexOffset,
    topA,
    topB,
    bottomB,
    bottomA,
    getSideColor(faceIdx, bx, by, topBz),
  )
}

function appendQuad(
  positions,
  normals,
  colors,
  indices,
  edgePositions,
  vertexOffset,
  p0,
  p1,
  p2,
  p3,
  color,
) {
  _e1.subVectors(p2, p0)
  _e2.subVectors(p1, p3)
  _normal.crossVectors(_e1, _e2).normalize()
  _radialUp.set(
    (p0.x + p1.x + p2.x + p3.x) * 0.25,
    (p0.y + p1.y + p2.y + p3.y) * 0.25,
    (p0.z + p1.z + p2.z + p3.z) * 0.25,
  ).normalize()

  if (_normal.dot(_radialUp) < 0) _normal.negate()

  for (const p of [p0, p1, p2, p3]) {
    positions.push(p.x, p.y, p.z)
    normals.push(_normal.x, _normal.y, _normal.z)
    colors.push(color.r, color.g, color.b)
  }

  indices.push(
    vertexOffset, vertexOffset + 1, vertexOffset + 2,
    vertexOffset, vertexOffset + 2, vertexOffset + 3,
  )

  appendEdge(edgePositions, p0, p1, p2, p3, _normal)
  return vertexOffset + 4
}

function appendEdge(edgePositions, p0, p1, p2, p3, normal) {
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

function getSurfaceColor(faceIdx, bx, by, bz) {
  const worldPos = blockToWorld(faceIdx, bx, by, bz)
  const radius = Math.max(0.0001, worldPos.length())
  const latitude = Math.asin(THREE.MathUtils.clamp(worldPos.y / radius, -1, 1)) * THREE.MathUtils.RAD2DEG
  const longitude = Math.atan2(worldPos.z, worldPos.x) * THREE.MathUtils.RAD2DEG
  return getApproxEarthSurfaceColor(latitude, longitude)
}

function getSideColor(faceIdx, bx, by, bz) {
  const topId = SPHERE_PRESET.getBlockId(faceIdx, bx, by, bz)
  if (topId === 1) {
    return { r: 0.46, g: 0.34, b: 0.22 }
  }
  return { r: 0.52, g: 0.52, b: 0.56 }
}

function getTopSolidBz(faceIdx, bx, by) {
  const profile = getColumnProfile(faceIdx, bx, by)
  return profile.landMask > 0.33 ? profile.topBz : 0
}
