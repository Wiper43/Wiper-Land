Core design goal

The new source of truth should become:

Game

owns systems

runs update order

passes shared references

BlockWorld

owns chunks, blocks, terrain queries, region queries

EntitySystem

owns dynamic creatures, projectiles, drops, NPCs

CombatSystem

owns attack resolution and damage routing

SpawnSystem

owns what appears where and when

That replaces the current split where legacy world.js still owns too much gameplay state. Your own refactor notes call out that world.js currently mixes entities, waves, spawning, UI state, beams, nav, and win/loss state, and should be replaced by a lighter top-level game container.

Recommended folder structure
src/
  main.js

  game/
    game.js
    gameState.js
    updateLoop.js
    serviceLocator.js

  world/
    blockWorld.js
    chunk.js
    mesher.js
    terrain.js
    blocks.js
    worldMath.js
    regions.js
    regionSampler.js
    worldQueries.js

  entities/
    entitySystem.js
    entityFactory.js
    entityTypes.js
    entityMovement.js
    entityCollision.js
    entityDamage.js
    entityUI.js
    entityQueries.js

    monsters/
      monsterDefs.js
      spider.js
      cow.js
      wolf.js
      zombieCow.js

    behaviors/
      idle.js
      wander.js
      chaseTarget.js
      flee.js
      meleeAttack.js
      rangedAttack.js
      edgeAvoidance.js
      packFollow.js
      herdProtect.js

  combat/
    combatSystem.js
    attackResolver.js
    raycastEntities.js
    raycastBlocks.js
    damageSystem.js
    hitResults.js
    combatTypes.js

  spawning/
    spawnSystem.js
    spawnPools.js
    spawnBudget.js
    spawnRules.js
    spawnLocations.js

  loot/
    dropSystem.js
    lootTables.js

  fx/
    beamVisuals.js
    floatingText.js
    deathEffects.js

  ui/
    hud.js
    healthBars.js
    overlays.js
    debugUI.js

  player/
    playerController.js
    playerCombatAdapter.js
    playerStats.js
    playerInventory.js

This fits your earlier long-term structure, which already separates world, chunk, terrain, entities, combat, UI, and later networking/persistence.

What each system should own
game/
game.js

This becomes the new root runtime object.

Owns:

references to all systems

startup wiring

shared update order

scene-level references

debug flags

save/load hooks later

Shape:

game = {
  scene,
  camera,
  renderer,
  input,
  player,
  blockWorld,
  entities,
  combat,
  spawning,
  loot,
  fx,
  ui,
  state,
  update(dt)
}

This matches the refactor direction you already outlined.

gameState.js

Owns:

paused/running/debug states

game mode

progression flags

temporary milestone flags

updateLoop.js

Owns the strict update order, which is important once systems multiply.

Recommended order:

input

player intent

spawning

entity AI

entity movement/collision

combat resolution

death/drop cleanup

FX/UI update

render sync

world/
blockWorld.js

Owns:

chunk registry

block set/get

isSolidBlock

block damage and regeneration

chunk dirty marking

world-space to voxel-space conversion

high-level terrain queries

This remains the backbone of the voxel game.

chunk.js

Owns:

block storage per chunk

local indexing

dirty flags

mesh refs

mesher.js

Owns:

generating visible voxel geometry

rebuilding chunk meshes

later: greedy meshing if you add it

terrain.js

Owns:

procedural terrain generation

caves later

layer/material logic

terrain noise composition

regions.js

Owns:

biome/region definitions

region tags

region rules

Examples:

plains

forest

swamp

cave

corrupted

frozen

volcanic

Your refactor notes call out region/biome metadata as a key requirement for scalable monster spawning.

regionSampler.js

Owns:

getRegionDataAt(x, z)

temperature/moisture/danger/corruption sampling

cave-vs-surface classification

This is one of the most important future-facing files because it turns terrain into spawn information. Your notes explicitly identify getRegionDataAt(x, z) as the right kind of world-facing API.

worldQueries.js

Owns shared world helper queries like:

getSurfaceYAt(x, z)

findNearbyStandablePositions(center, radius)

isWalkableCell(x, y, z)

getBlocksInRadius(...)

This keeps query logic out of combat and AI.

entities/

This is the most important subsystem for scalability.

Your notes already identify the need for a common entity model with shared fields like id, species, health, state, brain, sensors, and common hooks like update, takeDamage, and onDeath.

entitySystem.js

Owns:

the master entity registry

add/remove/update iteration

fast lookup by id

filtering by type/faction/tag

cleanup of dead entities

Core APIs:

addEntity(entity)

removeEntity(id)

update(dt, game)

getNearbyEntities(position, radius)

getAttackableEntities()

This should replace world.entities as the real owner.

entityFactory.js

Owns:

constructing entity instances from definitions

applying variants/modifiers

attaching behaviors

mesh/model creation hooks

Important API:

createMonster(speciesId, spawnData, game)

This is central to your goal of generating lots of monsters in different regions. Your own notes call out the factory pattern directly.

entityTypes.js

Defines shared shape/contracts.

Example contract:

{
  id,
  type,
  species,
  faction,
  tags,
  position,
  velocity,
  radius,
  height,
  health,
  maxHealth,
  isDead,
  canTakeDamage,
  blocksAttack,
  stats,
  state,
  brain,
  sensors,
  mesh,
  update(dt, game),
  takeDamage(amount, source, context),
  onDeath(game, context),
  getHitShape(),
  getAnchorPosition()
}
entityMovement.js

Owns:

gravity

desired movement resolution

grounded state

stepping/falling

shared locomotion helpers

Important API:

moveEntityWithVoxelCollisions(entity, desiredMotion, blockWorld)

That exact idea is already in your refactor notes and it is a big one for consistency.

entityCollision.js

Owns:

AABB/capsule/body overlap helpers

entity-vs-world tests

entity-vs-entity separation later if needed

entityDamage.js

Owns:

applying damage

hurt cooldown if added

resistances later

death state transitions

entityUI.js

Owns:

health bar attachments

floating names

anchor position logic

damage popup spawn hooks

entityQueries.js

Owns:

efficient queries for AI/combat

nearest prey

nearby allies

pack leader lookup

threat detection

entities/monsters/
monsterDefs.js

This is the heart of scalable content.

Owns data, not code:

base stats

size

movement speed

aggression

attack range

biome tags

region weights

drop tables

faction

behavior package

variants

Your notes explicitly say monsters should be data-driven, not code-driven, and that definitions should include things like health, move speed, biome tags, drops, and brain identifiers.

Example:

export const MONSTER_DEFS = {
  spider: {
    faction: "wild",
    health: 40,
    moveSpeed: 2.2,
    radius: 0.45,
    height: 1.0,
    attackRange: 1.4,
    aggroRange: 10,
    biomeTags: ["forest", "cave"],
    drops: [{ id: "silk", chance: 0.5 }],
    behaviorSet: ["wander", "edgeAvoidance", "chaseTarget", "meleeAttack"],
    variants: ["normal", "cave", "venomous"]
  }
};
spider.js, cow.js, wolf.js

These should stay thin.

They should only own species-specific code that cannot be described in data alone:

special animation hooks

unique attack timing

unique senses

special movement quirks

unique sound hooks

Do not let them become giant AI files.

entities/behaviors/

This is where monster intelligence becomes reusable.

Your own notes strongly recommend behavior modules instead of one giant unique AI file per creature.

idle.js

Owns:

doing nothing

random pause state

wander.js

Owns:

pick direction

short movement bursts

casual roaming

chaseTarget.js

Owns:

moving toward a target

pursuit timeout

line-of-sight checks

flee.js

Owns:

retreat logic

fear-based movement

herd/kid survival behavior

meleeAttack.js

Owns:

close-range attack timing

cooldown

hit window

rangedAttack.js

Owns:

projectile or beam launch intent

distance checks

cooldown hooks

edgeAvoidance.js

Owns:

don’t walk off cliffs

don’t fall into holes unless species allows it

packFollow.js

Owns:

pack hierarchy following

leader distance

formation looseness

herdProtect.js

Owns:

defend young

group threat response

This structure matches the ecosystem design direction where wolves, herds, elders, alphas, kids, and predators all need layered reusable roles instead of one-off scripts.

combat/

This subsystem should fully unify entities and voxel blocks.

Your notes already call out the need for a single resolveAttack(...) path that tests entity hits and voxel hits together, compares nearest impact, and applies the result.

combatSystem.js

Owns:

public combat API

attack requests

cooldown gates

per-frame combat updates if needed

attackResolver.js

This is the key file.

Owns:

cast from origin/direction/range

query both entities and blocks

compare nearest hit

return a normalized hit result

trigger damage/break/effects

Important API:

resolveAttack({
  attacker,
  origin,
  direction,
  range,
  attackData,
  game
})
raycastEntities.js

Owns:

ray vs entity hit shapes

filtering dead/non-attackable entities

nearest entity hit result

raycastBlocks.js

Owns:

wrapping blockWorld.traceRayAllHits()

selecting the nearest valid solid block hit

turning it into a normalized hit result

damageSystem.js

Owns:

applying combat results to health

hit reactions

stagger later

block HP reduction

hitResults.js

Defines standard result shape:

{
  type: "entity" | "block" | "none",
  distance,
  entityId,
  blockPos,
  point,
  normal
}
combatTypes.js

Defines attack data shapes for:

melee

beam

spell burst

piercing rays later

This is especially useful because your long-term combat notes already include more advanced spell/ray ideas and clash mechanics.

spawning/

This subsystem is what will make “lots of monsters in different regions” manageable.

Your notes explicitly call for a real spawn manager driven by player distance, region tags, biome data, local caps, and monster pools.

spawnSystem.js

Owns:

periodic spawn evaluation

region-based spawning

despawn rules

active population balancing

spawnPools.js

Owns:

which species belong to which region

weighted entries

surface/cave/day/night pools later

Example:

forest: [
  { species: "spider", weight: 20 },
  { species: "wolf", weight: 10 },
  { species: "deer", weight: 30 }
]
spawnBudget.js

Owns:

max population per chunk/region

danger budget

species cap

anti-overcrowding

This is essential if you want procedural creature density to stay sane.

spawnRules.js

Owns:

validation rules like:

must be surface

must be cave

not near player

only in swamp

only below Y level

only in corruption > 0.5

spawnLocations.js

Owns:

finding actual safe spawn points on terrain

standable position checks

spacing between spawns

loot/
dropSystem.js

Owns:

creating drops on death

scatter position

pickup creation later

lootTables.js

Owns:

species drop definitions

rarity

biome modifiers later

This should be data-driven alongside monster definitions.

fx/
beamVisuals.js

Owns:

attack beam rendering

not damage logic

floatingText.js

Owns:

damage numbers

heal numbers

status text

deathEffects.js

Owns:

dissolve/despawn visuals

particles later

This is important because your current legacy world mixes gameplay ownership with beams and floating text. Those should move out into FX ownership.

ui/
hud.js

Owns:

health

hotbar later

target info

crosshair

healthBars.js

Owns:

world-space enemy bars

on-screen bar drawing

overlays.js

Owns:

menu overlays

pause

debug screens

debugUI.js

Owns:

region display

entity count

spawn diagnostics

selected target data

player/
playerController.js

Owns:

movement input intent

camera-relative motion

jump

interact requests

playerCombatAdapter.js

Owns:

turning player click input into combat requests

feeding origin/direction/attackData into combatSystem

playerStats.js

Owns:

player health/stamina/resource data later

playerInventory.js

Owns:

held item

selected slot

item-driven attack type later

Exact ownership boundaries

These rules matter a lot.

BlockWorld should not own:

monster AI

combat outcomes

UI bars

spawn populations

It should answer world questions and mutate voxels.

EntitySystem should not own:

terrain generation

chunk meshing

player input

attack ray origin rules

It owns dynamic world objects.

CombatSystem should not own:

rendering beams

entity storage

biome data

spawn caps

It resolves attacks and damage.

SpawnSystem should not own:

pathfinding

combat rules

mesh rendering

chunk meshing

It decides what appears and where.

That separation is the main thing that keeps the codebase scalable.

The new entity contract

This is the contract I’d use as the foundation:

{
  id: "ent_123",
  kind: "monster",
  species: "spider",
  variant: "cave",
  faction: "wild",
  tags: ["hostile", "ground"],
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  radius: 0.45,
  height: 1.0,
  health: 40,
  maxHealth: 40,
  isDead: false,
  canTakeDamage: true,
  blocksAttack: true,
  stats: {
    moveSpeed: 2.2,
    attackRange: 1.4,
    aggroRange: 10
  },
  state: {
    grounded: false,
    aiState: "wander",
    targetId: null,
    hurtTimer: 0
  },
  brain: ["wander", "edgeAvoidance", "chaseTarget", "meleeAttack"],
  sensors: {
    sightRange: 10,
    hearingRange: 14
  },
  mesh,
  update(dt, game) {},
  takeDamage(amount, source, context) {},
  onDeath(game, context) {},
  getHitShape() {},
  getAnchorPosition() {}
}

That aligns closely with the shared entity format in your own Phase 3.5 notes.

The scalable monster pipeline

This is the content pipeline that will make large creature expansion manageable.

Step 1: define species

In monsterDefs.js.

Step 2: choose region spawn pool

In spawnPools.js.

Step 3: roll variant

In entityFactory.js.

Step 4: instantiate shared entity

Using the common entity contract.

Step 5: attach behavior package

From behavior modules.

Step 6: let systems handle the rest

movement from shared movement

combat from shared combat

death from shared damage/drop

UI from shared bars/text

That is how you get from “one spider test entity” to “dozens of monster species” without the project collapsing.