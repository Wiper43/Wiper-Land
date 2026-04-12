import * as THREE from 'three'
import { makeMissResult, makeNoEffectResult, makeDamageResult, makeBlockedResult } from './rayHits.js'

// ============================================================
// ATTACK RESOLVER
// Owns: casting a ray, querying entities, returning a hit result
// Does NOT own: rendering beams, applying damage, spawning FX
// ============================================================

const _raycaster = new THREE.Raycaster()

/**
 * Resolve a raycast attack against the entity list.
 * Returns a standard hit result.
 *
 * @param {Object} options
 * @param {THREE.Camera} options.camera
 * @param {Object[]} options.entities - attackable entities (from entitySystem or world.entities)
 * @param {Object} options.attackData
 */
export function resolveRaycastAttack({ camera, entities, attackData }) {
  _raycaster.setFromCamera({ x: 0, y: 0 }, camera)
  _raycaster.near = 0
  _raycaster.far = attackData.range

  const hittableMeshes = []
  const meshToEntity = new Map()

  for (const entity of entities) {
    if (!entity) continue
    if (entity.isDead) continue
    if (!entity.mesh) continue

    entity.mesh.traverse((child) => {
      if (!child.isMesh) return
      hittableMeshes.push(child)
      meshToEntity.set(child, entity)
    })
  }

  const hits = _raycaster.intersectObjects(hittableMeshes, false)

  if (hits.length === 0) {
    return makeMissResult(attackData)
  }

  for (const hit of hits) {
    const entity = meshToEntity.get(hit.object)
    if (!entity || entity.isDead) continue

    const resolution = resolveHitAgainstEntity({ entity, attackData, hit })
    if (resolution) return resolution
  }

  return makeNoEffectResult(attackData)
}

function resolveHitAgainstEntity({ entity, attackData, hit }) {
  if (entity.canTakeDamage && typeof entity.takeDamage === 'function') {
    entity.takeDamage(attackData.basePower, {
      hitPoint: hit.point,
      attackData,
      sourcePosition: attackData.sourcePosition?.clone?.() ?? null,
    })
    return makeDamageResult(entity, hit, attackData.basePower, attackData)
  }

  if (entity.blocksAttack) {
    return makeBlockedResult(entity, hit, attackData)
  }

  return null
}
