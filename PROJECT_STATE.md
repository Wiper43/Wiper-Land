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