# Wiper Land – Project State

## Project
Wiper Land browser game prototype

## Stack
- Three.js
- Vite
- JavaScript

## Current Focus
Phase 2 combat prototype moving into **Phase 2.5 mini-game**

---

## Current Workspace Summary

The project is currently a **first-person combat sandbox** with a working movement/controller foundation and an early spellcasting presentation layer.

### Core engine and player systems working
- WASD movement
- mouse look / pointer lock
- jump + gravity
- arena collision
- test arena rendering
- world update loop
- basic UI / crosshair

### Combat systems currently working
- raycast-based combat
- left click direct attack
- right click spell attacks
- cooldown-based attack usage
- damage application to enemies
- combat result flow through `combat.js`

### Current spell presentation layer
- floating spellbook viewmodel attached to the camera
- spellbook sits on the lower-right/front-right of the screen
- spellbook has idle bob
- spellbook has a quick flick-up cast animation
- world-space beam visuals can fire from the spellbook
- beam visuals are **visual only**
- beam visuals currently have **no collision**
- gameplay hit detection is still handled by **raycasting**, not the visible beam

### Enemy systems currently working
- cow dummy enemy exists
- cow can take damage
- cow health bar exists
- cow can be removed on death

---

## Current File / System Layout

### Main gameplay files
- `src/main.js` → main loop and system wiring
- `src/renderer.js` → scene, camera, renderer
- `src/world.js` → arena/world objects
- `src/player.js` → movement/controller logic
- `src/input.js` → keyboard/mouse input
- `src/combat.js` → raycast combat logic
- `src/ui.js` → HUD and crosshair
- `src/heldItem.js` → local floating weapon/spellbook viewmodel
- `src/beamVisual.js` → visual-only world-space beam system

### Current flow
`main.js`
↓
player update
↓
held item update
↓
beam visual update
↓
world update
↓
render

### Combat flow
input
↓
combat.js attack call
↓
raycast resolves hit / miss
↓
damage applied if valid
↓
held item cast animation plays
↓
world-space beam visual plays

---

## Important Design Rules Currently Chosen

### Gameplay truth
- raycasting decides hits
- raycasting decides hit distance
- raycasting decides damage

### Presentation only
- floating spellbook is visual only
- beam visuals are visual only
- equipped held item has no collision
- visible beam does not determine gameplay

This separation is intentional so the project scales better into:
- more weapons
- AI enemies
- remote players
- future beam upgrades
- multiplayer visibility later

---

## Phase 2 Completed / In Progress Summary

### Phase 2 foundation complete
- movement sandbox complete
- combat system exists
- attacks can damage enemies
- cow dummy enemy exists
- spellbook viewmodel exists
- visual world beam exists

### Beam status
Beams are currently in an **early presentation state**:
- visual beam exists
- no collision on beam visual
- actual attack logic still uses raycasts
- current beam implementation is acceptable for now
- deeper beam improvements are postponed until later

---

# Phase 2.5 – Mini-Game Goal

Create a combat mini-game where **cows attack the player with their own beams** at **half the player’s beam range**.

This phase is about making combat feel like an actual playable loop instead of a sandbox test.

## Phase 2.5 goals

### 1. Add player hitpoints
The player needs:
- max HP
- current HP
- damage intake
- death or fail-state handling later
- UI display for player health

### 2. Make cows aggro and move toward the player
Cows should:
- detect the player
- move toward the player
- stop at reasonable attack distance
- no longer behave like random dummies in this mode

### 3. Give cows beam attacks
Cow attacks should:
- use the same general combat philosophy as the player
- visually fire beams toward the player
- have **half the range of the player’s beam**
- damage the player through game logic, not beam collision

### 4. Add cow-to-cow collision / bumping
Cows should:
- not overlap into one blob
- push/bump each other when touching
- feel like separate bodies in the arena

---

## Phase 2.5 gameplay loop target

Desired mini-game loop:

player enters arena
↓
cows detect player
↓
cows move toward player
↓
cows bunch up and bump each other instead of stacking
↓
cows fire shorter-range beams at player
↓
player loses HP when hit
↓
player fights back with current beam/raycast combat

This phase should prove:
- player can be attacked
- enemies can chase
- enemies can use ranged attacks
- multiple enemies can exist together physically

---

## Recommended Build Order for Phase 2.5

### Step 1
Add **player HP system**
- player health data
- damage function
- UI health display

### Step 2
Upgrade cows from dummy behavior to **chase behavior**
- move toward player
- attack distance check

### Step 3
Add **cow beam attack logic**
- shorter than player beam range
- damage player
- visual beam only

### Step 4
Add **cow-to-cow separation / bump collision**
- prevent overlap
- simple push apart behavior

---

## Immediate Next Coding Tasks

1. add player hitpoints
2. add cow aggro/chase
3. add cow beam attack at half player range
4. add cow bump collision with other cows

---

## Short Reminder of Current Direction

Wiper Land is currently evolving from:

**movement sandbox**
into
**combat prototype**
and now into
**a small combat encounter**

Phase 2.5 is the first step where the game starts to feel like a real playable combat scenario rather than a test room.

Additions to PROJECT_STATE.md

Add the following section near the bottom of the file.

Phase 2.5 Progress Update

Several systems from the Phase 2.5 goals are now partially implemented in the prototype.

Player combat response

The player now has:

100 HP

damage intake from cow attacks

screen HUD displaying player HP

survival timer display

damage sound when hit

Player health is managed inside the world simulation loop and updated in the UI layer.

Cow attack behavior

Cows now:

detect the player

move toward the player

stop at attack distance

fire a visual beam toward the player

apply gameplay damage to the player

Cow attacks currently deal:

10 damage per hit
Animated pushback system

The combat system now includes a smooth knockback system.

Features:

knockback is applied as a velocity impulse

movement decays over time using damping

pushback respects world colliders

player will slide along walls instead of clipping

Special fix implemented:

When the player stands on top of a block, the knockback system ignores the supporting collider beneath the player, allowing horizontal shove to work correctly.

Player hit feedback

Current hit feedback includes:

pushback

HP reduction

damage sound

beam visual from the attacking cow

Known issue

Cow navigation occasionally gets stuck on tight corners or obstacles.

This is a pathing issue, not a combat issue.

Planned improvements later:

better path smoothing

steering when path node becomes blocked

dynamic repathing

Next Development Session Goals
Goal 1 — Living Entity Pushback System

Add knockback behavior for living entities only.

Living entities should include:

cows
future enemies
boss creatures

When hit by attacks they should:

take damage

receive knockback impulse

slide smoothly using the same pushback system as the player

Goal 2 — Non-Living Entity Rules

Non-living objects must not move when hit.

Non-living entities include:

blocks
terrain
arena walls
environment props

They should:

take damage if destructible

never receive knockback

Implementation plan

Introduce a simple classification property on world entities.

Example:

entity.isLiving = true

Usage rules:

if (entity.isLiving)
    applyKnockback()
else
    applyDamageOnly()

This keeps the combat pipeline consistent for all enemies.

Goal 3 — Cow Knockback

When the player hits a cow:

the cow should receive a smaller knockback impulse

cow movement should temporarily yield to knockback velocity

cow pathing resumes after knockback decays

Desired feel:

player hit → cow nudged backwards slightly
cow hit → player pushed harder
Goal 4 — Combat System Consolidation

Refactor combat logic so that all attacks pass through a single pipeline:

attack event
↓
raycast determines hit
↓
damage applied
↓
living entity knockback applied
↓
visual effects triggered

This will make future additions easier:

wolves

zombies

bosses

multiplayer combat

Longer Term Goals (Post Phase 2.5)

Future improvements once the mini-game is stable:

improved cow navigation

enemy spawn system

wave survival mode

enemy variety

impact feedback (camera shake / screen flash)

boss encounters

Current Direction Reminder

Wiper Land is transitioning from:

movement sandbox
→ combat prototype
→ playable combat encounter

Phase 2.5 is successfully evolving the project into a real gameplay loop rather than a test arena

//////////////////////////////////////////////
///////////////////////////////////////
phase 2 unifished but complete
//////////////////////////////////////////////
//////////////////////////////////////

Wiper Land — Project State Summary
Current phase

You’ve completed a strong Phase 2.5 combat prototype and you’re now ready to begin Phase 3: World Structure. That lines up with your architecture plan, where Phase 3 is the point to introduce the block world, chunk structure, terrain generation, placement/destruction, and world queries.

What is already working

Your current build has a solid playable loop:

Three.js browser prototype

first-person movement

jumping

gravity

mouse look

arena collision

player health and damage intake

combat based on raycast gameplay with separate visual effects

enemy cows that detect, chase, and attack

multiple cows active at once

round-based zombie cow mini-game flow

wave progression with delay and UI messaging

victory screen showing remaining health and time spent

That means the project is no longer just a movement sandbox or a single-target combat test. It is now a real playable combat scenario.

Combat architecture status

Your combat structure is in a good place:

gameplay hit detection is separated from visuals

attacks route through centralized combat logic

enemies can take damage and die

player knockback works

enemy knockback was added and partially worked, but needs follow-up tuning/debugging

combat is already modular enough to carry forward into later systems

That fits the larger Wiper Land direction where combat should remain a distinct system and not be tangled into player code.

Zombie Cow mini-game status

The mini-game is now functioning as an actual prototype loop instead of a note. Earlier, the uploaded mini-game file was only a placeholder saying to upload the zip for review.

As of today, your implemented mini-game includes:

Wave 1: 1 cow

Wave 2: 3 cows

Wave 3: 10 cows

round transition messaging

2-second delay between waves

end-state victory summary

Known issues to carry forward

You ended today with two known bugs:

In wave 3, at least one cow spawned on a block and got stuck.

Enemy pushback no longer felt like it was working correctly.

Those are both fixable and neither blocks Phase 3 planning.

Recommended interpretation of where you are

You are not starting Phase 3 from scratch.

You are entering Phase 3 with:

a proven movement base

a proven combat loop

working hostile entities

basic game-state flow

early UI feedback

a playable mini-game testbed

That is a very good place to be.

What Phase 3 should mean for your project

Based on your architecture notes, Phase 3 should focus on turning the current arena prototype into a real world foundation:

block world

chunk structure

terrain generation

world queries

block placement and destruction

The smart goal is not “make a huge game world” yet. The goal is to build the first clean world foundation under the combat prototype.

Best next mindset

Your best move now is:

freeze Phase 2.5 as “playable but imperfect,” then start Phase 3 cleanly

That means:

keep note of the cow spawn bug

keep note of the enemy knockback regression

do not let those small issues delay the world foundation work unless they block testing

Suggested Phase 3 starting point

When you come back, I’d frame Phase 3 like this:

Phase 3.0 goal:
Replace the temporary arena-only setup with the first real world system:

flat block terrain

chunk data structure

block lookup

collision against blocks

simple placement/destruction

keep combat playable inside it

That follows your intended build order exactly: movement → combat → world.

3/13 project state
Phase 3 is underway and the new BlockWorld terrain system is functional.

Completed:
- Added chunked voxel terrain system
- Added block generation, meshing, destruction, and regeneration
- Added player voxel floor + wall collision
- Wired terrain into main loop
- Confirmed blocks can be destroyed with F-key test and regenerate correctly
- Renamed voxel manager to BlockWorld
- Removed duplicate src/world/world.js

Current architecture:
- src/world.js = old gameplay world (cows/combat/nav)
- src/world/blockWorld.js = new voxel terrain system

Next goals:

2. Fully remove old floor/grid dependence
3. Replace F-key test with proper block raycast
4. Connect combat to block terrain
5. Connect nav/AI to terrain changes
6. Reduce reliance on old world colliders
7. Add destruction/regeneration polish





Short Project State (Update)

Date: 2026-03-14

Phase 3 – BlockWorld Integration Progress

BlockWorld terrain system is now functional and integrated with the core loop.

Completed

Chunked voxel terrain system working

Block generation, meshing, destruction, and regeneration implemented

Player voxel collision (floor + walls)

Terrain connected to main game loop

Blocks can be destroyed and regenerate correctly

BlockWorld API created:

getBlock()

isSolidBlock()

traceRayAllHits()

Spell system can now break multiple blocks using ray traversal and block HP

Block regeneration now pauses if player is within 10 units

Cow collision investigation paused

New test entity system started

Created src/entities/spider.js

Spider entity successfully:

spawns

collides with voxel terrain

falls into holes correctly

This confirms entity ↔ BlockWorld collision works.

Current Architecture
src/world.js              -> legacy gameplay world (cows/combat/nav)
src/world/blockWorld.js   -> voxel terrain system
src/entities/spider.js    -> test entity for voxel interaction

Spider is now the reference entity for terrain physics testing.

Next Goals

Continue entity system development using the spider as the test platform.

Best next order

give spider HP + takeDamage()

make combat able to hit spider

add simple HP text/bar above it

add simple wandering movement

After this:

migrate cows into src/entities/

unify entity collision with BlockWorld

begin replacing legacy world collider logic

When you come back tomorrow, the very first thing I recommend is adding spider combat hits. That will connect:

combat system
↓
traceRayAllHits
↓
entities
↓
blockWorld

Once that loop is working, your combat, terrain, and entities will finally be unified.

PROJECT_STATE — Wiper Land

Date: 2026-03-15

Current State

Wiper Land is currently in a hybrid architecture phase.

There are 2 systems running side by side:

1. Legacy gameplay world

Handled mostly by:

src/world.js

src/combat.js

src/cowAI.js

src/navGrid.js

This side currently owns a lot of gameplay behavior, including:

legacy entities/cows

combat raycast against entities

floating damage text

attack beams

overlays / wave-style logic

some UI/game state ownership

2. New voxel world

Handled mostly by:

src/world/blockWorld.js

src/world/chunk.js

src/world/mesher.js

src/world/terrain.js

This side currently supports:

chunked voxel terrain

block generation

block meshing

block destruction

block regeneration

player voxel collision

traceRayAllHits() voxel ray traversal

block HP / spell interaction

Bridge prototype

Current bridge entity:

src/entities/spider.js

Spider currently proves:

entity can spawn in the voxel world

entity collides with voxel terrain

entity falls into holes correctly

That means entity ↔ BlockWorld collision is confirmed working.

Important Findings

Spider is currently not yet a full gameplay entity.

Spider currently has:

mesh

gravity

velocity

grounded state

simple voxel collision

Spider currently does not have:

health

maxHealth

takeDamage()

isDead

canTakeDamage

blocksAttack

health bar/text

registration in a shared entity system

Combat is already farther along than expected.

src/combat.js already:

raycasts against meshes in world.entities

maps hit mesh back to entity

calls entity.takeDamage(...)

respects canTakeDamage

skips dead entities

So the missing link is not rewriting combat first.

The missing link is:

make spider match the combat/entity contract

make spider visible to combat

then unify entity hits with voxel block hits

Architecture Goal

Move away from:

legacy world.js

blockWorld.js

bridge code in main.js

Toward a scalable voxel-native structure:

Future target structure

Game

BlockWorld

EntitySystem

CombatSystem

SpawnSystem

UI / FX

Region / Biome support

Core rule:

voxel world becomes the real source of truth

all gameplay systems plug into it

Scalability Goal

The long-term goal is to support:

easy addition of new monsters

many monster types across different regions

data-driven monster definitions

reusable behavior modules

region/biome-based spawning

manageable scaling without hardcoding every species

Key design principle

Species should be data.
Behavior should be modular.
Systems should own rules.

That means:

monster stats live in definitions

shared systems handle movement/combat/spawning

monster files stay thin

Recommended Development Method

Chosen workflow:

Option 4 — Hybrid + Surgical Patch Method

Use:

step-by-step coaching for important learning pieces

complete file patches for boring or heavy sections

small controlled edits, not giant rewrites

Do not:

start over

attempt a massive refactor in one pass

request a whole replacement project immediately

Current Best Migration Strategy

Do not fully refactor yet.

Instead, use the spider as the first voxel-native entity template.

Correct migration order

make spider a real damageable entity

register spider so combat can hit it

unify combat result between spider hit and block hit

move visuals/UI helpers out of legacy ownership

migrate cows later

add spawning/regions later

retire world.js only after new systems are proven

Best Immediate Milestone
Make the spider feel alive and killable

This is the next practical step.

Goal:

player can attack spider

spider has HP

spider takes damage

spider shows HP text/bar

spider can die and be removed cleanly

This is the first important bridge between:

combat

entities

voxel terrain

It is also the safest beginner-friendly step.

Next Chat Goal

In the next chat, continue with the hybrid surgical patch workflow.

First coding task

Implement spider as the first real voxel-native combat entity:

add health fields

add takeDamage()

add death handling

make combat able to hit spider

add simple HP display

Only after that:

unify nearest hit between spider and block

Short Summary

Wiper Land already has:

working voxel terrain

block destruction/regeneration

player voxel collision

working combat foundation

a spider test entity that proves voxel entity collision works

The project should not restart.

The correct path is:

keep current project

use small guided patches

turn spider into the first true scalable entity

gradually migrate from legacy world to voxel-native architecture

3/15 11:32pm
Wiper Land — Current State Notes
Current status

The game is in a playable state, and movement/controller changes made today improved feel enough to keep moving forward.

There is still some mysterious intermittent lag / frame stutter in the game. It is not being fixed right now. Based on today's debugging, it may be related to bursty main-thread work such as voxel regeneration, chunk rebuilds, or another short hitch in the update/render path, but the exact root cause is still unresolved.

For now, the lag is being treated as a known issue to revisit later.

What we changed today
1. Regeneration / block restore investigation

Investigated the lag that happens when many blocks regenerate around the same time.

Identified that regen bursts can likely cause chunk rebuild spikes and visible stutter.

Added / discussed fixes to reduce regen bunching and make regeneration behavior safer to tune.

Clarified how to temporarily disable regen or slow regen timing for debugging.

2. Step-up movement for 1x1x1 blocks

Reworked the player stepping logic so the character can walk onto 1-block voxel steps without needing to jump.

Iterated through several versions until one felt good enough in-game.

Adjusted stair movement so stepping up feels a bit slower and heavier instead of giving a boosted feeling.

3. Camera feel while stepping

Tuned the stair/camera feel multiple times.

Reduced harsh snapping / bounce and landed on a version that feels acceptable for now.

The camera is not considered perfect, but it is good enough to move on.

4. Mouse spike / sudden over-turn bug

Investigated the issue where the camera would occasionally turn more than expected.

Found that mouse delta spikes were getting accumulated between frames.

Patched input handling to clamp extreme mouse deltas and reset stale deltas on pointer-lock / focus changes.

Result: the bad camera whip is controlled, even though an underlying occasional frame hitch may still exist.

Known issues being deferred

Intermittent frame stutter / mysterious lag still exists.

Root cause has not been fully isolated.

This is intentionally deferred until later.

Current priority is architecture cleanup and bridging systems with the spider entity, not performance work.

Current priority going forward

Focus should shift away from micro-fixing movement/perf and back toward structure.

Main next focus

Clean up / improve project architecture.

Bridge the current architecture with the spider entity.

Make the spider work cleanly within the newer system direction instead of as a disconnected special case.

Suggested goals for next coding session

Review current architecture boundaries.

Decide how the spider entity should plug into the architecture cleanly.

Refactor any spider-specific logic that is too coupled to older code paths.

Define a cleaner entity flow for update, combat, movement, and world interaction.

Only return to lag investigation after architecture / spider integration is in a better place.

Reminder for future me

Do not get pulled back into performance rabbit holes immediately next session. The current intention is:

accept the current lag for now

continue architecture work

connect / bridge the spider entity properly

revisit the mysterious stutter later with a more deliberate profiling pass