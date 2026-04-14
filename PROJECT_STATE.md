# Wiper Land - Current Globe Snapshot

Date: 2026-04-13

## World Size

- `SPHERE_RADIUS = 1024`
- `FACE_RES = 128`
- `SHELL_DEPTH = 1`
- `LAYER_SCALE = 1.0`
- cube-sphere planet with 6 faces
- current shell is the walkable sea-level baseline

What that means in practice:
- the globe is physically very large
- surface detail is intentionally coarse right now for performance
- each face is `128 x 128` surface cells before globe projection

## Shell Ideology

The current design idea is:
- the shell is the true planet body
- everything above it is future terrain thickness
- the shell should become immune to destruction
- explosions and digging should stop when they reach the shell

Current prototype status:
- the world is still visually close to a thin shell
- this shell is the foundation for the future heightmapped terrain system
- the long-term plan is `immutable shell + destructible terrain above shell`

## North And South

The globe currently has:
- a labeled north pole tower
- a labeled south pole tower
- a wide red beam on the north pole
- a wide white beam on the south pole
- a top compass that points to north and south

The player currently starts near the south pole:
- spawn position is approximately `(0, -(SPHERE_RADIUS + 2), 0)`

## How Movement Works

Character movement on the globe currently works by:
- computing the radial `up` direction from the planet core to the player
- keeping a transported tangent frame attached to the player
- rotating that frame by the minimal rotation from old `up` to new `up`
- applying mouse yaw around the local `up`
- using tangent `forward` and `right` directions for `W A S D`

Important movement facts:
- `MOVE_SPEED = 6.5`
- fly mode multiplier is currently `300`
- movement is globe-surface based, not flat-world based
- the controller now uses transported orientation instead of rebuilding a fresh tangent basis every frame

## Terrain Status

Current terrain is still an early prototype:
- destructible surface shell blocks
- approximate Earth-style continent coloring
- cloud blocks above the surface
- no real mountain ranges yet
- no river carving yet
- no true heightmapped terrain layer yet

Long-term terrain target:
- immutable shell
- destructible heightmapped terrain above it
- crater deformation that clamps at shell depth
- mountains, valleys, rivers, and coastlines generated from terrain fields

## Entity Status

Entities and systems currently present:
- player
- spell combat system
- fire bomb system
- entity system runtime exists
- pole towers and pole beacons as world markers
- cloud blocks as destructible world elements

Important note:
- the long-term architecture supports monsters, wildlife, factions, and ecosystem simulation
- but the current globe prototype is still more focused on globe traversal, combat sandbox behavior, and world rendering than a full live ecosystem

## Navigation / AI Direction

Current architecture direction for AI:
- do not use full 3D voxel navigation for the whole globe
- use surface-based navigation on the planet
- monsters should path over a coarse surface graph
- local terrain damage should only trigger local nav rebuilds

This is the chosen performance-safe path for:
- enemies reaching the player
- enemies attacking each other
- terrain-breaking monsters
- future spawn zones / ecosystems

## Visual / World Settings

Current notable settings:
- approximate Earth-style continents and ocean colors
- red north pole beam
- white south pole beam
- globe map overlay on `M`
- compass with red `N` and white `S`
- very fast fly mode for large-world traversal
- no starfield background

## Pole-To-Pole Walking Time

Approximate walking time from south pole to north pole, assuming:
- the player walks straight along a great-circle route
- no stopping
- no obstacles
- current shell radius and current walk speed

Estimate:
- pole-to-pole distance is about `pi * 1024 = 3217` world units
- at `MOVE_SPEED = 6.5`, travel time is about `495` seconds
- that is about `8.25 minutes` of continuous straight walking

This is only a movement estimate for the current shell baseline.
Real travel time will change once terrain elevation, slopes, rivers, combat interruptions, and traversal abilities are added.

---
