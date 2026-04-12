// ============================================================
// MONSTER DEFINITIONS
// Species should be data. Behavior should be modular.
// Add new monsters here — no new code files needed for stats.
// ============================================================

export const MONSTER_DEFS = {
  cow: {
    species: 'cow',
    faction: 'hostile',
    health: 50,
    moveSpeed: 2.35,
    radius: 1.15,
    height: 2.2,
    attackRange: 4.25,
    aggroRange: 18,
    attackDamage: 10,
    attackCooldown: 1.1,
    attackKnockback: 10,
    biomeTags: ['plains', 'arena'],
    drops: [],
    behaviorSet: ['idle', 'wander', 'chase', 'melee'],
    variants: ['normal'],
  },

  zombieCow: {
    species: 'zombieCow',
    faction: 'hostile',
    health: 50,
    moveSpeed: 2.35,
    radius: 1.15,
    height: 2.2,
    attackRange: 4.25,
    aggroRange: 18,
    attackDamage: 10,
    attackCooldown: 1.1,
    attackKnockback: 10,
    biomeTags: ['arena'],
    drops: [],
    behaviorSet: ['idle', 'wander', 'chase', 'melee'],
    variants: ['normal'],
  },

  spider: {
    species: 'spider',
    faction: 'hostile',
    health: 40,
    moveSpeed: 2.2,
    radius: 0.45,
    height: 1.0,
    attackRange: 1.4,
    aggroRange: 10,
    attackDamage: 8,
    attackCooldown: 1.5,
    attackKnockback: 4,
    biomeTags: ['forest', 'cave'],
    drops: [{ id: 'silk', chance: 0.5 }],
    behaviorSet: ['wander', 'chase', 'melee'],
    variants: ['normal', 'cave', 'venomous'],
  },

  wolf: {
    species: 'wolf',
    faction: 'hostile',
    health: 35,
    moveSpeed: 3.5,
    radius: 0.5,
    height: 1.1,
    attackRange: 1.6,
    aggroRange: 14,
    attackDamage: 12,
    attackCooldown: 1.2,
    attackKnockback: 6,
    biomeTags: ['forest', 'plains'],
    drops: [{ id: 'fur', chance: 0.6 }],
    behaviorSet: ['wander', 'chase', 'melee', 'packFollow'],
    variants: ['normal', 'alpha'],
  },
}
