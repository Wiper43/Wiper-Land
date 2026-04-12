import { resolveRaycastAttack } from './attackResolver.js'
import { makeCooldownResult } from './rayHits.js'

// ============================================================
// COMBAT SYSTEM
// Owns: attack definitions, cooldowns, attack dispatch
// Does NOT own: beams, entity storage, biome data
// ============================================================

export function createCombatSystem({ camera, getEntities }) {
  const state = {
    lastAttackTime: -Infinity,
    lastAltAttackTime: -Infinity,
    selectedRightClickAttack: 'flamethrower',
  }

  // --------------------------------------------------------
  // ATTACK DEFINITIONS
  // --------------------------------------------------------
  const attacks = {
    directAttack: {
      id: 'directAttack',
      name: 'Direct Attack',
      kind: 'melee',
      damage: 10,
      range: 3,
      cooldownMs: 400,
      color: '#ffffff',
      visualType: 'slash',
      knockback: 8,
    },
    flamethrower: {
      id: 'flamethrower',
      name: 'Flamethrower',
      kind: 'spell',
      damage: 50,
      range: 12,
      cooldownMs: 550,
      color: '#ff4d2d',
      visualType: 'beamShell',
      knockback: 15,
    },
    waterGun: {
      id: 'waterGun',
      name: 'Water Gun',
      kind: 'spell',
      damage: 20,
      range: 6,
      cooldownMs: 550,
      color: '#3da5ff',
      visualType: 'beamShell',
      knockback: 6.5,
    },
  }

  // --------------------------------------------------------
  // PUBLIC ATTACK API
  // --------------------------------------------------------
  function tryPrimaryAttack(now = performance.now()) {
    return tryAttack(attacks.directAttack, 'lastAttackTime', now)
  }

  function trySecondaryAttack(now = performance.now()) {
    const attack = attacks[state.selectedRightClickAttack] ?? attacks.flamethrower
    return tryAttack(attack, 'lastAltAttackTime', now)
  }

  function tryAttack(attack, timeKey, now) {
    const elapsed = now - state[timeKey]
    if (elapsed < attack.cooldownMs) {
      return makeCooldownResult(attack, attack.cooldownMs - elapsed)
    }

    state[timeKey] = now

    const attackData = {
      id: attack.id,
      name: attack.name,
      kind: attack.kind,
      basePower: attack.damage,
      range: attack.range,
      cooldownMs: attack.cooldownMs,
      color: attack.color,
      visualType: attack.visualType,
      knockback: attack.knockback ?? 0,
      source: 'player',
      sourcePosition: camera.position.clone(),
    }

    const result = resolveRaycastAttack({
      camera,
      entities: getEntities(),
      attackData,
    })

    return { ok: true, attack: attackData, ...result }
  }

  // --------------------------------------------------------
  // SPELLBOOK SELECTION
  // --------------------------------------------------------
  function setSelectedRightClickAttack(attackId) {
    if (!attacks[attackId]) return
    state.selectedRightClickAttack = attackId
  }

  function getSelectedRightClickAttack() {
    return state.selectedRightClickAttack
  }

  function getAttackList() {
    return Object.values(attacks)
  }

  return {
    attacks,
    state,
    tryPrimaryAttack,
    trySecondaryAttack,
    setSelectedRightClickAttack,
    getSelectedRightClickAttack,
    getAttackList,
  }
}
