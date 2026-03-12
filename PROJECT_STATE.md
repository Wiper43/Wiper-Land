# Wiper Land – Project State

Engine:
Three.js + Vite

Phase 1 Completed:
Movement sandbox with:
- WASD movement
- mouse look
- jump + gravity
- capsule collision
- box collision
- test arena

Core Files:

main.js – game loop
renderer.js – scene setup
world.js – arena + colliders
player.js – controller + physics
input.js – keyboard + mouse
ui.js – HUD

Next Phase:
Phase 2 – Combat Prototype

Goals:
- raycast attack system
- ability framework
- damage system
- enemy dummy


phase 2 part 2:
Wiper Land — Project State (Start of Phase 2)

Project: Wiper Land browser game prototype

Stack:

Three.js

Vite

JavaScript

Current Branch:

phase2-combat

Previous Stable Branch:

phase1-collision2.0
Core Systems Working
Movement Sandbox (Phase 1 complete)

Player controller supports:

WASD movement

Mouse look (pointer lock)

Jump

Gravity

Capsule-style collision

Box / wall collision

Floor collision

Acceleration + friction movement

Player cannot walk through blocks or arena walls.

Combat Prototype (Phase 2 progress)

Basic combat system implemented:

Raycast Attack

Left click performs:

camera center raycast
↓
range limited to 3 units
↓
checks walls/blocks first
↓
enemy takes damage if visible

Rules:

Attack range = 3 world units

Blocks block attacks

Nearest hit object receives damage

Enemy System

Currently implemented enemy:

Cow Dummy

Features:

Built from box meshes

Health: 50 HP

Health bar above head

Health bar shrinks with damage

Color flash on hit

Removed from scene on death

Movement behavior:

Random wandering

Picks new direction every ~2 seconds

Movement speed ≈ 1.2 units/sec

Automatically rotates to movement direction

Clamped inside arena bounds

Arena bounds:

x: -18 → 18
z: -18 → 18
Arena World

World contains:

Floor plane

Grid helper

Arena walls

Test blocks

Blocks currently:

static

collidable

not destructible (yet)

UI

Simple UI implemented:

Crosshair:

+

Controls hint:

WASD move
Space jump
Left click attack
File Structure
src/

main.js
renderer.js
world.js
player.js
input.js
ui.js
physics.js (unused)

Main loop flow:

animate()
   ↓
player.update()
   ↓
enemy.update()
   ↓
render()
Combat Pipeline
mouse click
↓
raycast from camera
↓
check blockers
↓
check enemies
↓
apply damage
↓
update health bar
↓
enemy death
Next Planned Systems

Next milestone features:

1️⃣ Destructible Blocks

Blocks gain:

health
takeDamage()
destroy()

Attacks should damage nearest object:

enemy OR block

This enables:

breakable cover

tactical positioning

more Diablo-style combat feel

2️⃣ Hit Feedback

Add:

hit marker

floating damage numbers

sound / particle effects

3️⃣ Ability System

First real ability:

Firebolt projectile

Ability structure idea:

abilities/
  firebolt.js
  dash.js
  shockwave.js
4️⃣ Enemy AI (later)

Future enemy behavior:

aggro player

chase player

attack player

avoid obstacles

Current Combat Feel Goal

Target combat style:

Diablo abilities
+
Overwatch aiming

Meaning:

first-person targeting

abilities on cooldown

skillshots and projectiles

movement still matters

Controls
W A S D  → move
Mouse    → look
Space    → jump
LeftClick → basic attack
Next Chat Starting Prompt

Paste this in the next chat:

Continuing Wiper Land Phase 2 combat prototype.

Current state:
- movement sandbox complete
- raycast attack working
- moving cow dummy enemy
- health bars implemented
- attack range = 3 units
- walls block attacks

Next feature:
destructible blocks.