// ============================================================
// SPHERE CHUNK MATH
//
// Identical arithmetic to worldMath.js — the axes are renamed:
//   cx → clat   (latitude chunk index)
//   cy → clon   (longitude chunk index)
//   cz → cdep   (depth chunk index)
// ============================================================

import {
  CHUNK_SIZE,
  CHUNK_VOLUME,
  floorDiv,
  positiveModulo,
  getBlockIndex,
  isValidLocalCoord,
} from '../worldMath.js'

import { LON_RES } from './sphereCoords.js'

export { CHUNK_SIZE, CHUNK_VOLUME, floorDiv, positiveModulo, getBlockIndex, isValidLocalCoord }

const LON_CHUNKS = LON_RES / CHUNK_SIZE   // total chunk columns in longitude
export { LON_CHUNKS }

// ── Block → chunk ───────────────────────────────────────────

export function blockToSphereChunk(bx, by, bz) {
  return {
    clat: floorDiv(bx, CHUNK_SIZE),
    clon: floorDiv(by, CHUNK_SIZE),
    cdep: floorDiv(bz, CHUNK_SIZE),
  }
}

export function blockToSphereLocal(bx, by, bz) {
  return {
    lx: positiveModulo(bx, CHUNK_SIZE),
    ly: positiveModulo(by, CHUNK_SIZE),
    lz: positiveModulo(bz, CHUNK_SIZE),
  }
}

// Chunk key string — same comma-separated format as the flat world.
// Longitude is normalised so [clon] stays in [0, LON_CHUNKS).
export function getSphereChunkKey(clat, clon, cdep) {
  const wrappedClon = ((clon % LON_CHUNKS) + LON_CHUNKS) % LON_CHUNKS
  return `${clat},${wrappedClon},${cdep}`
}

export function parseSphereChunkKey(key) {
  const [clat, clon, cdep] = key.split(',').map(Number)
  return { clat, clon, cdep }
}

export function sphereChunkToBlockOrigin(clat, clon, cdep) {
  return {
    bx: clat * CHUNK_SIZE,
    by: clon * CHUNK_SIZE,
    bz: cdep * CHUNK_SIZE,
  }
}

// Local coords + chunk coords → absolute block indices.
export function sphereLocalToBlock(clat, clon, cdep, lx, ly, lz) {
  return {
    bx: clat * CHUNK_SIZE + lx,
    by: clon * CHUNK_SIZE + ly,
    bz: cdep * CHUNK_SIZE + lz,
  }
}

// Wrap a longitude chunk index to [0, LON_CHUNKS).
export function wrapClonIndex(clon) {
  return ((clon % LON_CHUNKS) + LON_CHUNKS) % LON_CHUNKS
}
