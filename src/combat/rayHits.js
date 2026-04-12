// ============================================================
// HIT RESULT TYPES
// Standard shapes returned by attack resolution.
// ============================================================

export const HIT_TYPE = {
  DAMAGE: 'damage',
  BLOCKED: 'blocked',
  MISS: 'miss',
  NO_EFFECT: 'no-effect',
  COOLDOWN: 'cooldown',
}

/**
 * Standard hit result shape:
 * {
 *   type: HIT_TYPE.*
 *   entity: entity | null
 *   hit: Three.js intersection | null
 *   hitDistance: number
 *   damage: number
 *   attack: attackData | null
 *   cooldownRemainingMs?: number
 * }
 */

export function makeMissResult(attack) {
  return {
    type: HIT_TYPE.MISS,
    entity: null,
    hit: null,
    hitDistance: attack?.range ?? 8,
    damage: 0,
    attack,
  }
}

export function makeNoEffectResult(attack) {
  return {
    type: HIT_TYPE.NO_EFFECT,
    entity: null,
    hit: null,
    hitDistance: attack?.range ?? 8,
    damage: 0,
    attack,
  }
}

export function makeDamageResult(entity, hit, damage, attack) {
  return {
    type: HIT_TYPE.DAMAGE,
    entity,
    hit,
    hitDistance: hit.distance,
    damage,
    attack,
  }
}

export function makeBlockedResult(entity, hit, attack) {
  return {
    type: HIT_TYPE.BLOCKED,
    entity,
    hit,
    hitDistance: hit.distance,
    damage: 0,
    attack,
  }
}

export function makeCooldownResult(attack, remainingMs) {
  return {
    ok: false,
    type: HIT_TYPE.COOLDOWN,
    cooldownRemainingMs: Math.max(0, remainingMs),
    attack,
  }
}
