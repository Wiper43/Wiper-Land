# Wiper Land

Wiper Land is a browser-based 3D voxel combat prototype built with `Three.js` and `Vite`.

The current game is a first-person arena sandbox where you can move through a destructible block world, fight hostile creatures, and test an evolving combat and entity system. The project is also in the middle of a larger architecture migration from older prototype-style game logic toward a cleaner system-based structure.

## What It Is

Wiper Land currently combines:

- first-person movement and camera controls
- a chunked voxel terrain system
- destructible and regenerating blocks
- player attacks with melee and spell-style combat
- enemy entities with health, damage, and UI feedback
- round-based zombie cow encounters

This repo is both a playable prototype and a foundation for a larger survival / arena-style game.

## Current Features

### Gameplay

- WASD movement
- mouse look with pointer lock
- jumping and gravity
- left-click direct attack
- right-click spell attacks
- enemy health and damage
- floating damage text
- wave-based enemy spawning
- victory / survival overlay flow

### World

- chunked voxel terrain
- procedural block generation
- block breaking
- block regeneration with safety checks near the player
- ray-based block hit tracing
- player collision against voxel terrain

### Systems In Progress

- modular entity system
- modular combat pipeline
- spawn system expansion
- migration away from legacy `src/world.js`
- cleaner ownership boundaries between world, combat, entities, and UI

## Tech Stack

- `JavaScript`
- `Three.js`
- `Vite`

## Getting Started

### Install dependencies

```bash
npm install
```

### Run the game locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Controls

- `W A S D` move
- `Mouse` look
- `Space` jump
- `Left Click` direct attack
- `Right Click` selected spell attack
- `F` debug voxel break test

## Project Structure

```text
src/
  game/         runtime assembly and update order
  world/        voxel terrain, chunks, blocks, meshing, terrain
  entities/     enemies, shared entity helpers, behaviors
  combat/       attack resolution and damage flow
  spawning/     wave and spawn management
  loot/         drops and loot tables
  ui/           overlays, floating text, health bars
```

## Architecture Direction

The project is actively moving toward a system-based layout where:

- `Game` owns runtime wiring and update order
- `BlockWorld` owns chunks, terrain, and block queries
- `EntitySystem` owns living dynamic actors
- `CombatSystem` owns attack resolution and damage routing
- `SpawnSystem` owns enemy population flow

That direction is already visible in the current `src/game`, `src/world`, `src/entities`, `src/combat`, and `src/spawning` folders, even though some legacy prototype code still exists alongside the newer structure.

## Current State

Right now, Wiper Land is best described as:

> a playable combat prototype inside an evolving voxel world

The codebase already supports real gameplay, but it is also being reshaped into a cleaner foundation for adding:

- more enemy types
- region or biome-driven spawning
- better AI behaviors
- expanded combat interactions
- more scalable world systems

## Notes

- `README.md` is the polished public overview.
- `PROJECT_STATE.md` contains detailed development notes and progress history.
- `PROJECT_ARCHITECTURE.md` describes the longer-term system design direction.

## Roadmap

Planned near-term improvements include:

- deeper entity migration into the new system layout
- combat unification between entities and voxel blocks
- better spawn rules and enemy variety
- continued cleanup of legacy world ownership
- more polished survival / arena gameplay loops

## License

Currently listed as `ISC` in `package.json`.
