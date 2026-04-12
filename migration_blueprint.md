Migration blueprint from current project

Here is the clean migration order.

Stage 1

Create game/game.js and move top-level ownership there.

Do not delete world.js yet.

Stage 2

Create entities/entitySystem.js and register spider there.

Spider becomes the first voxel-native entity.

Stage 3

Move spider HP, death, anchor, and hit shape into the common entity contract.

Stage 4

Create combat/attackResolver.js and unify:

current entity ray hit

current block DDA hit

Nearest hit wins.

Stage 5

Move floating text and beam visuals out of legacy world into fx/.

Stage 6

Create spawning/spawnSystem.js for spiders first.

Stage 7

Create world/regions.js and regionSampler.js.

Start with simple tags only.

Stage 8

Migrate cows into the same entity contract.

Stage 9

Delete or hollow out world.js until it becomes unnecessary.

This migration order is consistent with your existing architecture notes: build core contracts first, use spider as the first real voxel-native entity, then unify combat, move spawning, migrate cows, and only remove legacy world at the end.

Best first practical version of this blueprint

Do not build the whole blueprint at once.

Build this small but correct version first:

src/
  game/
    game.js

  world/
    blockWorld.js
    chunk.js
    mesher.js
    terrain.js
    regions.js

  entities/
    entitySystem.js
    entityFactory.js
    entityMovement.js
    monsters/
      monsterDefs.js
      spider.js

  combat/
    combatSystem.js
    attackResolver.js
    raycastEntities.js
    raycastBlocks.js

  spawning/
    spawnSystem.js
    spawnPools.js

  fx/
    floatingText.js

  ui/
    healthBars.js

That is enough to prove the architecture without overbuilding, which matches the larger Wiper Land principle of proving gameplay first and scaling around it after.

Final recommendation

If you want the single best architecture principle to protect this project, it is this:

Species should be data, behavior should be modular, and systems should own rules instead of individual monster files.

That is the combination that will let you:

add lots of monsters

give them region-specific behavior

support variants

scale spawn logic

keep code manageable

And it fits your ecosystem goals too, where packs, herds, elders, cubs, alphas, predators, prey, and regional creatures all need reusable structures instead of hardcoded one-offs.