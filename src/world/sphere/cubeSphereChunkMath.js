// ============================================================
// CUBE-SPHERE CHUNK MATH
//
// Chunk addressing for the cube-sphere world.
// Each of the 6 cube faces is independently divided into a
// FACE_CHUNKS × FACE_CHUNKS grid of surface chunks, plus
// DEP_CHUNKS layers in the depth direction.
//
// Chunk coordinates: (faceIdx, cx, cy, cdep)
//   faceIdx ∈ [0, 5]
//   cx, cy  ∈ [0, FACE_CHUNKS)
//   cdep    ∈ [0, DEP_CHUNKS)
// ============================================================

import { CHUNK_SIZE, CHUNK_VOLUME, floorDiv, positiveModulo, getBlockIndex, isValidLocalCoord } from '../worldMath.js'
import { FACE_RES, SHELL_DEPTH, TERRAIN_MIN_BZ } from './cubeSphereCoords.js'

export { CHUNK_SIZE, CHUNK_VOLUME, getBlockIndex, isValidLocalCoord }

export const FACE_CHUNKS = Math.floor(FACE_RES / CHUNK_SIZE)     // chunk columns per face edge
export const DEP_CHUNKS  = Math.ceil(SHELL_DEPTH / CHUNK_SIZE)   // depth chunk layers
export const TERRAIN_MIN_CHUNK = floorDiv(TERRAIN_MIN_BZ, CHUNK_SIZE)

// ── Block → chunk ────────────────────────────────────────────

export function blockToFaceChunk(faceIdx, bx, by, bz) {
  return {
    faceIdx,
    cx:   floorDiv(bx, CHUNK_SIZE),
    cy:   floorDiv(by, CHUNK_SIZE),
    cdep: floorDiv(bz, CHUNK_SIZE),
  }
}

export function blockToFaceLocal(bx, by, bz) {
  return {
    lx: positiveModulo(bx, CHUNK_SIZE),
    ly: positiveModulo(by, CHUNK_SIZE),
    lz: positiveModulo(bz, CHUNK_SIZE),
  }
}

// ── Chunk key ─────────────────────────────────────────────────

export function getFaceChunkKey(faceIdx, cx, cy, cdep) {
  return `${faceIdx},${cx},${cy},${cdep}`
}

export function parseFaceChunkKey(key) {
  const [faceIdx, cx, cy, cdep] = key.split(',').map(Number)
  return { faceIdx, cx, cy, cdep }
}

// ── Chunk origin → block coordinates ─────────────────────────

export function faceChunkToBlockOrigin(faceIdx, cx, cy, cdep) {
  return {
    faceIdx,
    bx: cx   * CHUNK_SIZE,
    by: cy   * CHUNK_SIZE,
    bz: cdep * CHUNK_SIZE,
  }
}

// ── Local + chunk coords → absolute block indices ─────────────

export function faceLocalToBlock(faceIdx, cx, cy, cdep, lx, ly, lz) {
  return {
    faceIdx,
    bx: cx   * CHUNK_SIZE + lx,
    by: cy   * CHUNK_SIZE + ly,
    bz: cdep * CHUNK_SIZE + lz,
  }
}
