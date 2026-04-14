# Wiper Land

Wiper Land is a globe-first action prototype built with `Three.js` and `Vite`.

The project started as a voxel combat sandbox, but the long-term direction is now clearer:
- cube-sphere planet foundation
- Earth-like globe presentation
- destructible terrain above an immutable shell
- surface-based monster navigation
- lightweight ecosystem and spawn zones
- modular combat, equipment, and UI systems

## Current Direction

The target design is:
- **immutable shell** as the real planet body
- **heightmapped terrain** above that shell for mountains, valleys, rivers, and coastlines
- **localized terrain destruction** for craters and shell exposure
- **surface graph navigation** for monsters instead of full 3D voxel pathfinding
- **heatzone spawning** and faction-based ecosystem behavior
- **equipment and inventory UI** layered on top of the combat sandbox

This direction is intended to keep the game feeling alive without letting terrain, AI, and destruction costs spiral out of control.

## Current Prototype Features

Right now the prototype already includes:
- globe-first cube-sphere world
- radial gravity and spherical movement
- destructible surface blocks
- pole beacons and compass guidance
- orbit-style globe map overlay
- approximate Earth-style continents and oceans
- spell combat and fire bomb attacks
- fly mode for rapid traversal and debugging

## Controls

- `W A S D` move along the surface
- `Mouse` look
- `Space` jump or lift in fly mode
- `Shift` dive in fly mode
- `F` toggle fly mode
- `X` fly toward the core
- `G` break the targeted block
- `Left Click` charge and release fire bomb
- `Right Click` cast the selected spell
- `M` open the globe map overlay

## Near-Term Architecture Goals

### Terrain
- replace the current thin shell surface with destructible heightmapped terrain
- treat the shell as the unbreakable sea-level / bedrock floor
- support mountain ranges, riverbeds, coastlines, and craters

### AI Navigation
- move monsters on a coarse surface graph
- rebuild nav only in local terrain-damaged areas
- let monsters break small amounts of terrain when needed

### World Simulation
- use biome and heatzone-driven spawn logic
- let factions fight each other and create a lightweight ecosystem
- keep far-away simulation abstract to avoid performance spikes

### Player Progression
- add inventory, equipment slots, weapon/armor handling, and item-driven stats

## Project Structure

```text
src/
  game/           runtime wiring and frame update order
  world/
    sphere/       cube-sphere math, terrain, appearance, meshing
    navigation/   surface graph pathing and nav chunk rebuilds
    spawning/     heatzones, spawn budgets, ecosystem systems
  entities/       monsters, wildlife, movement, and AI
  combat/         spells, explosions, damage systems
  equipment/      inventory, slots, item definitions, loot
  ui/             HUD, map, overlays, inventory/equipment panels
  environment/    birds, wind, ambience helpers
  audio/          biome, river, wind, and combat sound systems
```

## Getting Started

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Architecture Reference

The full architecture plan now lives in [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md).

## Reference Inspiration

The globe math and general cube-sphere direction were originally inspired by:
https://github.com/ddupont808/planetcraft
