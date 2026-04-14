# Wiper Land

Wiper Land is now a globe-first voxel prototype built with `Three.js` and `Vite`, inspired by the cube-sphere planet structure in `ddupont808/planetcraft`.

The project keeps the spell-combat sandbox from the earlier prototype, but the world foundation has been restarted around a curved voxel shell instead of a flat chunk grid.

## Current Focus

- cube-sphere globe terrain
- curved voxel chunk meshing
- radial gravity and spherical player movement
- destructible voxel blocks on the planet surface
- preserved combat spells and fire bomb attacks
- cleaner globe-first boot flow

## Controls

- `W A S D` move along the surface
- `Mouse` look
- `Space` jump or lift in fly mode
- `Shift` dive in fly mode
- `F` toggle fly mode
- `X` fly toward the core
- `G` break the targeted voxel block
- `Left Click` charge and release fire bomb
- `Right Click` cast the selected spell
- `M` open the map overlay

## Getting Started

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Project Structure

```text
src/
  game/           runtime assembly and frame update order
  world/
    sphere/       cube-sphere math, chunk addressing, terrain, meshing
    blocks.js     shared voxel/block definitions
    chunk.js      chunk storage and dirty-state helpers
  combat/         spells, ray attacks, fire bomb logic
  entities/       entity framework kept for future enemies and props
  ui/             overlays, floating text, health bars
```

## Architecture Notes

The restart is intentionally globe-first:

- `src/main.js` boots directly into the globe world.
- `src/game/game.js` wires a `SphereWorld` runtime instead of branching between flat and globe modes.
- `src/world/sphere/` is the authoritative planet pipeline.
- Combat systems stay modular so the spell sandbox survives the world rewrite.

## Reference

Planet math and overall direction were rebuilt with `planetcraft` as the reference implementation:
https://github.com/ddupont808/planetcraft
