# Wiper Land - Project Architecture

## Core Direction

Wiper Land should move toward a **heightmapped globe over an immutable shell**.

That means:
- the shell is the true planet body and cannot be destroyed
- terrain above the shell is a destructible height field
- the planet remains globe-first and cube-sphere based
- AI navigates the surface instead of full 3D voxel space
- distant world simulation stays lightweight so the game keeps running smoothly

This is the best compromise between:
- Breath of the Wild style elevation
- destructible terrain and craters
- monster navigation on a globe
- ecosystem and spawning systems
- acceptable performance

## World Model

The world should be split into 3 main layers.

### 1. Immutable Shell

Purpose:
- base planet body
- sea-level floor / ocean floor / bedrock boundary
- never destructible

Rules:
- all deformation clamps at the shell
- no explosion, monster, or player action can dig below it
- shell remains the stable reference for rendering, navigation, and physics

### 2. Terrain Thickness Layer

Purpose:
- stores terrain height above the shell
- creates mountains, valleys, ridges, coastlines, and riverbeds
- supports localized destruction

Rules:
- mountains are positive terrain thickness above shell
- craters lower terrain thickness
- terrain cannot go below zero thickness
- this layer is chunked and rebuilt only where modified

### 3. Surface Metadata Layer

Purpose:
- biome, moisture, temperature, river proximity, vegetation density, ambient tags
- drives visuals, sound, spawn rules, and ecosystem behavior

Examples:
- tropical forest
- temperate grassland
- alpine mountain
- desert
- polar ice
- river corridor

## High-Level System Ownership

### Game

Owns:
- system wiring
- update order
- scene / camera / renderer references
- shared runtime state
- cross-system coordination

### Planet Surface Runtime

Owns:
- cube-sphere coordinate math
- shell radius and face resolution
- chunk lifetime
- terrain deformation
- terrain queries
- terrain mesh rebuilds
- LOD policy

### Navigation System

Owns:
- surface graph generation
- node passability and slope checks
- local graph rebuilds when terrain changes
- path queries for monsters

### Spawn / Ecosystem System

Owns:
- heatzones
- spawn budgets
- faction populations
- offscreen ecosystem simulation
- active spawn/despawn decisions

### Entity System

Owns:
- monsters, wildlife, birds, pickups, projectiles, NPCs
- entity registry
- nearby queries
- sleeping / active state

### Equipment / Inventory System

Owns:
- player equipment slots
- inventory
- item definitions
- stat derivation from gear

### Audio / Ambient System

Owns:
- wind ambience
- river sound zones
- biome ambience
- nearby activity sounds

## Recommended Folder Structure

```text
src/
  main.js

  game/
    game.js
    updateLoop.js
    worldRuntime.js

  world/
    sphere/
      cubeSphereCoords.js
      cubeSphereChunkMath.js
      shellField.js
      surfaceGrid.js
      terrainField.js
      terrainGenerator.js
      terrainDeformer.js
      terrainMesher.js
      terrainLOD.js
      biomeField.js
      riverField.js
      earthAppearance.js

    navigation/
      navSurfaceGraph.js
      navChunkBuilder.js
      navQueries.js
      flowField.js

    spawning/
      heatZoneField.js
      spawnDirector.js
      spawnBudget.js
      factionRules.js
      ecosystemSystem.js

  entities/
    entitySystem.js
    entityFactory.js
    entityMovement.js
    entityCombat.js
    monsterAI.js
    surfaceMover.js
    steering.js

  equipment/
    inventory.js
    equipmentSlots.js
    itemDefs.js
    lootTables.js

  combat/
    combatSystem.js
    damageSystem.js
    fireBombSystem.js
    spellSystem.js

  environment/
    birdSystem.js
    windField.js
    ambientFX.js

  audio/
    ambientSystem.js
    riverAudio.js
    windAudio.js
    combatAudio.js

  ui/
    hud.js
    mapOverlay.js
    inventoryPanel.js
    equipmentPanel.js
    tooltipPanel.js
    floatingText.js
    overlays.js
```

## Terrain Architecture

### Core Data Per Surface Cell

Each surface cell should eventually store data like:

```js
{
  shellHeight: 0,
  terrainHeight: 34,
  moisture: 0.62,
  temperature: 0.48,
  biome: 'temperate_forest',
  riverMask: 0.0,
  destructible: true
}
```

### Terrain Generation Goals

Terrain generation should produce:
- oceans and coastlines
- mountain ranges
- valleys and plateaus
- rivers and drainage basins
- biome transitions by latitude, moisture, and elevation

Recommended generation inputs:
- continent mask or continent-scale shape field
- ridged mountain noise
- broad terrain noise
- river flow field
- latitude-based climate bands

### Destruction Model

Destruction should modify **terrain thickness**, not the shell.

Explosion flow:
1. find nearby surface cells
2. apply radial falloff
3. subtract terrain thickness
4. clamp at shell
5. mark touched terrain chunks dirty
6. rebuild only local terrain + local nav chunks

This supports:
- craters
- trenches
- blast scars
- shell exposure

It intentionally does not support:
- deep caves everywhere
- arbitrary tunneling
- overhang-heavy voxel worlds

That tradeoff is deliberate for performance.

## Rendering Strategy

### Terrain Rendering

Use chunked terrain meshes generated from the height field.

Per chunk:
- sample the local height field
- generate mesh vertices from shell radius + terrain height
- compute normals
- apply biome colors / textures
- rebuild only changed chunks

### LOD

Use aggressive LOD because the planet is huge.

Recommended approach:
- near player: full local chunk detail
- medium range: simplified chunk mesh
- far range: coarse planet mesh
- very far effects: atmosphere, clouds, continent colors only

### Atmosphere / Life Layers

Cheap systems with strong visual return:
- atmosphere rim glow
- moving cloud layer
- instanced trees / rocks only near player
- instanced birds and ambience actors by biome

## AI Navigation

### Best Navigation Model

AI should navigate the **surface graph**, not full 3D voxels.

Use:
- one navigation node per coarse surface cell
- edges only where slope and passability are valid
- A* for long-range pathing
- steering for local pursuit and combat spacing

This keeps monster pathfinding stable and affordable.

### Why This Is Better Than Full Voxels

Full voxel navigation would require:
- stacked-block reasoning
- jump / fall / cave / tunnel pathfinding
- expensive nav rebuilds after destruction

Surface navigation gives you:
- stable globe pathing
- easy slope rules
- local terrain damage support
- cheaper updates after craters

### Terrain-Breaking Monsters

Monsters should not behave like full miners.

Cheap but effective options:
- smash low cover blocking path
- break destructible ridges in a small radius
- create shallow craters with special attacks
- only evaluate terrain-breaking when stuck or when using a heavy attack

That gives the feeling of destructive AI without full mining simulation.

## Spawn System and Heatzones

### Heatzones

A heatzone is a region that biases what can spawn there.

Example fields:

```js
{
  id: 'andes_predator_zone',
  faction: 'predators',
  biomeTags: ['mountain', 'temperate'],
  center: { faceIdx, bx, by },
  radius: 220,
  budget: 18,
  spawnTable: ['raptor', 'wolf', 'stingbat']
}
```

### Spawn Director

Owns:
- active zone evaluation near player
- local population caps
- spawn budget control
- despawn and sleep behavior far away

Rules:
- only fully simulate zones near active players
- keep offscreen populations abstract
- use biome + heatzone + faction weights together

## Ecosystem Simulation

Do not simulate the whole planet at full fidelity.

Use a hybrid model:
- near player: real entities fight, hunt, flee, patrol
- far from player: ecosystem runs as lightweight counters and periodic zone updates

Offscreen ecosystem can track:
- predator pressure
- prey population
- faction control
- corruption / danger escalation

That lets the world feel alive without spawning thousands of real actors.

## Entity / Faction Model

Monsters should be data-driven.

Suggested core fields:

```js
{
  id,
  species,
  faction,
  biomeTags,
  position,
  velocity,
  radius,
  height,
  health,
  maxHealth,
  isDead,
  canDamageTerrain,
  combatRole,
  state,
  targetId,
  update(dt, game)
}
```

Faction system should support:
- monsters attacking the player
- monsters attacking rival factions
- predator/prey relationships
- territorial fighting
- neutral wildlife that flees

## Equipment / UI

### Player Equipment

Recommended slots:
- weapon
- offhand
- head
- chest
- legs
- accessory

### UI Panels

Needed UI:
- HUD for health / stamina / active weapon
- inventory panel
- equipment paper-doll panel
- tooltip / compare panel
- loot pickup prompts

Keep this data-driven so equipment changes are cheap and easy to expand.

## Performance Rules

These are the non-negotiables if the game is supposed to stay smooth.

### Terrain
- heightmap chunks only
- rebuild touched chunks only
- LOD aggressively
- no whole-planet mesh rebuilds during gameplay

### AI
- active AI only near player
- sleep or abstract distant AI
- coarse nav graph, local steering up close

### Ecosystem
- offscreen simulation is statistical, not full actor simulation
- spawn budgets per zone

### Destruction
- local crater updates only
- clamp to shell
- local nav rebuilds only

### Ambient Life
- birds, insects, wind FX, and river sounds should be proximity-based
- use instancing and cheap loops

## Recommended Implementation Order

### Phase 1 - Foundation
1. convert terrain model from shell-only voxels to shell + terrain height
2. build terrain field and terrain chunk mesher
3. preserve shell as immutable base

### Phase 2 - Destruction
1. add terrain deformation / crater system
2. rebuild touched terrain chunks only
3. add shell clamp rules

### Phase 3 - Navigation
1. build coarse surface nav graph
2. add path queries
3. move monsters to tangent-surface movement

### Phase 4 - Spawning and Ecosystem
1. add heatzones and biome-weighted spawn tables
2. add spawn director
3. add faction hostility and offscreen ecosystem simulation

### Phase 5 - Living World
1. birds in sky
2. wind field and ambient FX
3. river audio and environment sound cues

### Phase 6 - Equipment and RPG Layer
1. inventory data model
2. equipment slots
3. equipment UI
4. item-based stat derivation

## Final Recommendation

The correct long-term architecture for Wiper Land is:
- **cube-sphere globe**
- **immutable shell**
- **destructible heightmapped terrain above shell**
- **surface-based AI navigation**
- **heatzone spawning with lightweight ecosystem simulation**
- **data-driven equipment UI and monster systems**

This is the architecture most likely to give you:
- good-looking terrain
- crater destruction
- decent monster AI
- a world that feels alive
- smooth performance as the project grows
