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