import * as THREE from 'three'
import { createCow } from '../entities/monsters/cow.js'

// ============================================================
// SPAWN SYSTEM
// Owns: wave management, entity spawning, despawn rules.
// Replaces the inline wave logic from legacy world.js.
// ============================================================

const DEFAULT_WAVE_CONFIG = [1, 3, 10]

const DEFAULT_SPAWN_POSITIONS = [
  new THREE.Vector3(0, 0, -12),
  new THREE.Vector3(-10, 0, -10),
  new THREE.Vector3(0, 0, -12),
  new THREE.Vector3(10, 0, -10),
  new THREE.Vector3(-12, 0, -4),
  new THREE.Vector3(12, 0, -4),
  new THREE.Vector3(-8, 0, 8),
  new THREE.Vector3(8, 0, 8),
  new THREE.Vector3(0, 0, 12),
  new THREE.Vector3(-14, 0, 12),
  new THREE.Vector3(14, 0, 12),
  new THREE.Vector3(0, 0, -15),
]

export function createSpawnSystem(game, options = {}) {
  const waveConfig = options.waveConfig ?? DEFAULT_WAVE_CONFIG
  const spawnPositions = options.spawnPositions ?? DEFAULT_SPAWN_POSITIONS
  const audio = options.audio ?? {}

  let currentWaveIndex = -1
  let wavePhase = 'boot'   // boot | intermission | active | complete
  let waveDelayTimer = 0
  const cowEntities = []

  // --------------------------------------------------------
  // SPAWN A COW
  // --------------------------------------------------------
  function spawnCow(position) {
    const cow = createCow(game, position.clone(), audio)
    cow.cowVolume = game.cowVolume ?? 0.45

    if (cow.mooSound) cow.mooSound.setVolume(cow.cowVolume)
    if (audio.mooBuffer && typeof cow.setSoundBuffer === 'function') {
      cow.setSoundBuffer(audio.mooBuffer)
    }

    cowEntities.push(cow)
    game.entitySystem.add(cow)
    game.colliders.push(cow.collider)
    game.navGrid?.rebuild(game.colliders)

    return cow
  }

  // --------------------------------------------------------
  // WAVE STATE MACHINE
  // --------------------------------------------------------
  function getAliveCowCount() {
    return cowEntities.filter((c) => c && !c.isDead).length
  }

  function startWave(index) {
    currentWaveIndex = index
    wavePhase = 'active'

    const cowCount = waveConfig[index] ?? 0
    const spawnCount = Math.min(cowCount, spawnPositions.length)

    for (let i = 0; i < spawnCount; i++) {
      spawnCow(spawnPositions[i])
    }

    game.overlays?.showWaveMessage(
      `LEVEL ${index + 1} START`,
      `Defeat ${cowCount} zombie ${cowCount === 1 ? 'cow' : 'cows'}`,
      1.8
    )
  }

  function beginNextWaveDelay() {
    if (currentWaveIndex + 1 >= waveConfig.length) {
      game.overlays?.triggerVictory()
      wavePhase = 'complete'
      return
    }

    const nextWaveNumber = currentWaveIndex + 2
    wavePhase = 'intermission'
    waveDelayTimer = 2
    game.overlays?.showWaveMessage('ROUND OVER', `Level ${nextWaveNumber} starts in 2 seconds`, 1.8)
  }

  function update(deltaTime) {
    if (wavePhase === 'complete' || game.overlays?.isGameOver) return

    if (wavePhase === 'boot') {
      wavePhase = 'intermission'
      waveDelayTimer = 1.25
      game.overlays?.showWaveMessage('ZOMBIE COW ARENA', 'Level 1 starts now', 1.25)
      return
    }

    if (wavePhase === 'intermission') {
      waveDelayTimer -= deltaTime
      if (waveDelayTimer <= 0) {
        startWave(currentWaveIndex + 1)
      }
      return
    }

    if (wavePhase === 'active' && getAliveCowCount() === 0) {
      if (currentWaveIndex >= waveConfig.length - 1) {
        game.overlays?.triggerVictory()
        wavePhase = 'complete'
      } else {
        beginNextWaveDelay()
      }
    }
  }

  // --------------------------------------------------------
  // COW VOLUME / SOUND
  // --------------------------------------------------------
  function setCowVolume(volume) {
    const v = Math.max(0, Math.min(1, volume))
    for (const cow of cowEntities) {
      if (!cow || cow.isDead) continue
      cow.cowVolume = v
      if (cow.mooSound) cow.mooSound.setVolume(v)
    }
  }

  function setCowSoundBuffer(buffer) {
    for (const cow of cowEntities) {
      if (!cow || cow.isDead) continue
      if (typeof cow.setSoundBuffer === 'function') cow.setSoundBuffer(buffer)
    }
  }

  return {
    update,
    spawnCow,
    getAliveCowCount,
    setCowVolume,
    setCowSoundBuffer,
    get currentWaveIndex() { return currentWaveIndex },
    get wavePhase() { return wavePhase },
    get waveCount() { return waveConfig.length },
    cowEntities,
  }
}
