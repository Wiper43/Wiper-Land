import * as THREE from 'three'
import { createTextSprite, disposeTextSprite } from '../../ui/floatingText.js'
import { flashMeshes, updateHealthBarText, updateHealthBarBorder } from '../../ui/healthBars.js'
import { horizontalDistance, canMoveTo, canMoveToVoxel, rotateTowardsAngle, randomRange, applyGravityAndGrounding } from '../entityMovement.js'

// ============================================================
// COW ENTITY
// Full zombie-cow combat entity.
// Accepts a `game` object instead of the legacy `world` object.
//
// game must expose:
//   game.scene
//   game.colliders
//   game.navGrid
//   game.spawnFloatingDamage(pos, amount, color)
//   game.spawnAttackBeam(from, to, color, life)
//   game.damagePlayer(player, amount, sourcePos, push)
// ============================================================

const COW_COLLIDER_HALF = new THREE.Vector3(0.5, 0.5, 0.5)
const COW_AGGRO_RANGE = 18
const COW_STOP_DISTANCE = 4.25
const COW_MOVE_SPEED = 2.35
const COW_TURN_SPEED = 7.5
const COW_IDLE_SWAY_SPEED = 2.0
const COW_IDLE_SWAY_AMOUNT = 0.02
const COW_LEG_SWING_SPEED = 10.5
const COW_LEG_SWING_AMOUNT = 0.45
const COW_PATH_RECALC_INTERVAL = 1.0
const COW_WAYPOINT_REACH_DISTANCE = 1.1
const COW_STUCK_TIME = 0.85
const COW_STUCK_MOVE_EPSILON = 0.12
const COW_PATH_COOLDOWN_AFTER_STUCK = 0.45
const COW_ATTACK_DAMAGE = 10
const COW_ATTACK_COOLDOWN = 1.1
const COW_ATTACK_PUSH = 10
const COW_ATTACK_BEAM_LIFE = 0.18
const COW_IDLE_ROAM_RADIUS = 3.25
const COW_IDLE_ROAM_INTERVAL_MIN = 1.5
const COW_IDLE_ROAM_INTERVAL_MAX = 3.5
const COW_IDLE_ROAM_REACH_DISTANCE = 0.5

export function createCow(game, position = new THREE.Vector3(), audio = {}) {
  const { scene, colliders } = game

  const group = new THREE.Group()

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1 })

  function makeMesh(geometry, material) {
    return new THREE.Mesh(geometry, material.clone())
  }

  const body = makeMesh(new THREE.BoxGeometry(2.2, 1.2, 1.1), whiteMat)
  body.position.set(0, 1.4, 0)
  group.add(body)

  const spot1 = makeMesh(new THREE.BoxGeometry(0.5, 0.35, 0.05), blackMat)
  spot1.position.set(-0.3, 1.5, 0.58)
  group.add(spot1)

  const spot2 = makeMesh(new THREE.BoxGeometry(0.45, 0.4, 0.05), blackMat)
  spot2.position.set(0.5, 1.25, -0.58)
  group.add(spot2)

  const head = makeMesh(new THREE.BoxGeometry(0.85, 0.75, 0.75), whiteMat)
  head.position.set(1.45, 1.5, 0)
  group.add(head)

  const nose = makeMesh(new THREE.BoxGeometry(0.25, 0.3, 0.45), pinkMat)
  nose.position.set(1.95, 1.35, 0)
  group.add(nose)

  const legRoots = []
  const legPositions = [
    [0.7, 0.55, 0.35],
    [0.7, 0.55, -0.35],
    [-0.7, 0.55, 0.35],
    [-0.7, 0.55, -0.35],
  ]

  for (const [lx, ly, lz] of legPositions) {
    const legRoot = new THREE.Group()
    legRoot.position.set(lx, ly + 0.55, lz)
    const leg = makeMesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), blackMat)
    leg.position.set(0, -0.55, 0)
    legRoot.add(leg)
    group.add(legRoot)
    legRoots.push(legRoot)
  }

  const tail = makeMesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), blackMat)
  tail.position.set(-1.08, 1.55, 0)
  tail.rotation.z = -0.35
  group.add(tail)

  const horn1 = makeMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), blackMat)
  horn1.position.set(1.68, 1.93, 0.22)
  group.add(horn1)

  const horn2 = makeMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), blackMat)
  horn2.position.set(1.68, 1.93, -0.22)
  group.add(horn2)

  group.position.copy(position)
  scene.add(group)

  const box = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position.x, position.y + 0.5, position.z),
    new THREE.Vector3(COW_COLLIDER_HALF.x * 2, COW_COLLIDER_HALF.y * 2, COW_COLLIDER_HALF.z * 2)
  )

  const collider = { mesh: group, box, isDynamic: true }
  colliders.push(collider)

  const healthBar = createTextSprite(`Cow HP: 50 / 50`, {
    fontSize: 38,
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    defaultBorderColor: 'rgba(255,255,255,0.2)',
    defaultBorderWidth: 2,
    minWorldWidth: 1.7,
    worldHeight: 0.34,
  })
  healthBar.position.set(position.x, position.y + 3.0, position.z)
  scene.add(healthBar)

  let mooSound = null

  function ensureCowSound() {
    if (mooSound) return mooSound
    if (!audio.listener) return null
    mooSound = new THREE.PositionalAudio(audio.listener)
    mooSound.setRefDistance(18)
    mooSound.setVolume(0.8)
    group.add(mooSound)
    return mooSound
  }

  function setSoundBuffer(buffer) {
    if (!buffer) return
    const sound = ensureCowSound()
    if (!sound) return
    sound.setBuffer(buffer)
    sound.setRefDistance(18)
    sound.setVolume(0.45)
  }

  if (audio.mooBuffer) setSoundBuffer(audio.mooBuffer)

  const entity = {
    type: 'cow',
    name: 'cow dummy',
    isLiving: true,
    mesh: group,
    collider,
    health: 50,
    maxHealth: 50,
    isDead: false,
    canTakeDamage: true,
    blocksAttack: true,
    healthText: healthBar,
    labelHeight: 3.0,
    velocity: new THREE.Vector3(),
    grounded: false,
    moveTime: 0,
    cowVolume: 0.45,
    aggroRange: COW_AGGRO_RANGE,
    stopDistance: COW_STOP_DISTANCE,
    moveSpeed: COW_MOVE_SPEED,
    path: [],
    pathIndex: 0,
    pathRecalcTimer: 0,
    lastPlayerNavTarget: new THREE.Vector3(),
    homePosition: position.clone(),
    idleRoamTarget: null,
    idleRoamTimer: 0.8,
    isAggroed: false,
    debugState: 'idle',
    debugWaypoint: null,
    lastPosition: position.clone(),
    stuckTimer: 0,
    repathCooldown: 0,
    attackCooldown: 0,

    get mooSound() { return mooSound },
    setSoundBuffer,

    getAnchorPosition() {
      return new THREE.Vector3(
        this.mesh.position.x,
        this.mesh.position.y + this.labelHeight,
        this.mesh.position.z
      )
    },

    takeDamage(amount, info = {}) {
      if (this.isDead) return

      this.health -= amount
      if (this.health < 0) this.health = 0

      flashMeshes(this.mesh)

      const damagePos = info.hitPoint
        ? info.hitPoint.clone().add(new THREE.Vector3(0, 0.45, 0))
        : this.getAnchorPosition()

      game.spawnFloatingDamage(damagePos, amount, '#ffb347')
      updateHealthBarText(this, 'Cow HP')

      if (mooSound && mooSound.buffer) {
        try {
          if (mooSound.isPlaying) mooSound.stop()
          mooSound.play()
        } catch (err) {
          console.warn('Could not play cow sound:', err)
        }
      }

      if (this.health <= 0) {
        this.isDead = true
        scene.remove(this.mesh)

        if (this.healthText) {
          scene.remove(this.healthText)
          disposeTextSprite(this.healthText)
        }

        const colliderIndex = colliders.indexOf(this.collider)
        if (colliderIndex !== -1) colliders.splice(colliderIndex, 1)
      }
    },

    setAggroState(nextAggro) {
      if (this.isAggroed === nextAggro) return
      this.isAggroed = nextAggro
      updateHealthBarBorder(this, nextAggro ? 'rgba(255, 70, 70, 0.95)' : null)
    },

    chooseIdleRoamTarget() {
      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = Math.random() * Math.PI * 2
        const radius = 0.8 + Math.random() * (COW_IDLE_ROAM_RADIUS - 0.8)
        const candidate = new THREE.Vector3(
          this.homePosition.x + Math.cos(angle) * radius,
          this.mesh.position.y,
          this.homePosition.z + Math.sin(angle) * radius
        )
        if (!canMoveTo(colliders, this.collider, candidate, COW_COLLIDER_HALF)) continue
        const cell = game.navGrid.worldToCell(candidate)
        if (game.navGrid.isBlocked(cell.col, cell.row)) continue
        this.idleRoamTarget = candidate
        return
      }
      this.idleRoamTarget = null
    },

    updateIdleRoam(deltaTime) {
      this.idleRoamTimer -= deltaTime

      if (!this.idleRoamTarget && this.idleRoamTimer <= 0) {
        this.chooseIdleRoamTarget()
        this.idleRoamTimer = randomRange(COW_IDLE_ROAM_INTERVAL_MIN, COW_IDLE_ROAM_INTERVAL_MAX)
      }

      if (!this.idleRoamTarget) return false

      const moveResult = this.moveTowardsPoint(deltaTime, this.idleRoamTarget)

      if (
        moveResult.reached ||
        horizontalDistance(this.mesh.position, this.idleRoamTarget) <= COW_IDLE_ROAM_REACH_DISTANCE
      ) {
        this.idleRoamTarget = null
        this.idleRoamTimer = randomRange(COW_IDLE_ROAM_INTERVAL_MIN, COW_IDLE_ROAM_INTERVAL_MAX)
      }

      if (!moveResult.moved && !moveResult.reached) {
        this.idleRoamTarget = null
        this.idleRoamTimer = 0.75
      }

      return moveResult.moved
    },

    clearPath() {
      this.path.length = 0
      this.pathIndex = 0
      this.pathRecalcTimer = 0
      this.debugWaypoint = null
    },

    animateLegs(deltaTime, moving) {
      if (legRoots.length === 0) return
      if (moving) {
        const swing = Math.sin(this.moveTime * COW_LEG_SWING_SPEED) * COW_LEG_SWING_AMOUNT
        legRoots[0].rotation.z = swing
        legRoots[1].rotation.z = -swing
        legRoots[2].rotation.z = -swing
        legRoots[3].rotation.z = swing
      } else {
        const settleSpeed = Math.min(1, deltaTime * 10)
        for (const legRoot of legRoots) {
          legRoot.rotation.z += (0 - legRoot.rotation.z) * settleSpeed
        }
      }
    },

    updateStuckState(deltaTime, moved) {
      const movedDistance = horizontalDistance(this.mesh.position, this.lastPosition)
      if (moved || movedDistance > COW_STUCK_MOVE_EPSILON) {
        this.stuckTimer = 0
        this.lastPosition.copy(this.mesh.position)
        return false
      }
      this.stuckTimer += deltaTime
      this.lastPosition.copy(this.mesh.position)
      return this.stuckTimer >= COW_STUCK_TIME
    },

    onStuck(player) {
      this.debugState = 'stuck'
      this.clearPath()
      this.repathCooldown = COW_PATH_COOLDOWN_AFTER_STUCK

      if (player?.position) {
        const newPath = game.navGrid.findPath(this.mesh.position, player.position, { maxSearch: 2500 })
        if (newPath.length > 1) {
          const firstDistance = horizontalDistance(this.mesh.position, newPath[0])
          this.path = newPath
          this.pathIndex = firstDistance <= COW_WAYPOINT_REACH_DISTANCE ? 1 : 0
          this.debugWaypoint = this.path[this.pathIndex] || null
        } else {
          this.path = newPath
          this.pathIndex = 0
          this.debugWaypoint = this.path[0] || null
        }
        this.pathRecalcTimer = COW_PATH_RECALC_INTERVAL
        this.lastPlayerNavTarget.copy(player.position)
      }
    },

    moveTowardsPoint(deltaTime, targetPoint) {
      const toTarget = new THREE.Vector3(
        targetPoint.x - this.mesh.position.x,
        0,
        targetPoint.z - this.mesh.position.z
      )
      const distance = toTarget.length()
      if (distance <= 0.0001) return { moved: false, reached: true }

      toTarget.normalize()
      const moveDistance = Math.min(this.moveSpeed * deltaTime, distance)
      const moveStep = toTarget.clone().multiplyScalar(moveDistance)
      const targetYaw = Math.atan2(toTarget.x, toTarget.z) - Math.PI / 2
      const fullTarget = this.mesh.position.clone().add(moveStep)

      if (
        canMoveTo(colliders, this.collider, fullTarget, COW_COLLIDER_HALF) &&
        canMoveToVoxel(game.blockWorld, fullTarget, COW_COLLIDER_HALF.x, COW_COLLIDER_HALF.z)
      ) {
        this.mesh.rotation.y = rotateTowardsAngle(this.mesh.rotation.y, targetYaw, COW_TURN_SPEED * deltaTime)
        this.mesh.position.copy(fullTarget)
        return { moved: true, reached: distance <= COW_WAYPOINT_REACH_DISTANCE, slideAxis: null }
      }

      const xOnlyTarget = this.mesh.position.clone().add(new THREE.Vector3(moveStep.x, 0, 0))
      const zOnlyTarget = this.mesh.position.clone().add(new THREE.Vector3(0, 0, moveStep.z))
      const canSlideX = Math.abs(moveStep.x) > 0.0001 &&
        canMoveTo(colliders, this.collider, xOnlyTarget, COW_COLLIDER_HALF) &&
        canMoveToVoxel(game.blockWorld, xOnlyTarget, COW_COLLIDER_HALF.x, COW_COLLIDER_HALF.z)
      const canSlideZ = Math.abs(moveStep.z) > 0.0001 &&
        canMoveTo(colliders, this.collider, zOnlyTarget, COW_COLLIDER_HALF) &&
        canMoveToVoxel(game.blockWorld, zOnlyTarget, COW_COLLIDER_HALF.x, COW_COLLIDER_HALF.z)

      if (canSlideX || canSlideZ) {
        let slideTarget = null
        let slideAxis = null

        if (canSlideX && canSlideZ) {
          if (Math.abs(moveStep.x) >= Math.abs(moveStep.z)) {
            slideTarget = xOnlyTarget; slideAxis = 'x'
          } else {
            slideTarget = zOnlyTarget; slideAxis = 'z'
          }
        } else if (canSlideX) {
          slideTarget = xOnlyTarget; slideAxis = 'x'
        } else {
          slideTarget = zOnlyTarget; slideAxis = 'z'
        }

        const slideDir = new THREE.Vector3(
          slideTarget.x - this.mesh.position.x, 0, slideTarget.z - this.mesh.position.z
        )
        if (slideDir.lengthSq() > 0.0001) {
          slideDir.normalize()
          const slideYaw = Math.atan2(slideDir.x, slideDir.z) - Math.PI / 2
          this.mesh.rotation.y = rotateTowardsAngle(this.mesh.rotation.y, slideYaw, COW_TURN_SPEED * deltaTime)
        }

        this.mesh.position.copy(slideTarget)
        return {
          moved: true,
          reached: horizontalDistance(this.mesh.position, targetPoint) <= COW_WAYPOINT_REACH_DISTANCE,
          slideAxis,
        }
      }

      return { moved: false, reached: false, slideAxis: null }
    },

    update(deltaTime, camera, player) {
      if (this.isDead) return

      applyGravityAndGrounding(this, deltaTime, game.blockWorld, COW_COLLIDER_HALF.x, COW_COLLIDER_HALF.z)

      this.moveTime += deltaTime
      this.pathRecalcTimer -= deltaTime
      this.repathCooldown -= deltaTime
      this.attackCooldown -= deltaTime
      this.debugState = 'idle'
      this.debugWaypoint = null

      let isMoving = false
      let attemptedMove = false

      if (player?.position) {
        const flatToPlayer = new THREE.Vector3(
          player.position.x - this.mesh.position.x,
          0,
          player.position.z - this.mesh.position.z
        )
        const distanceToPlayer = flatToPlayer.length()
        const withinAggro = distanceToPlayer <= this.aggroRange
        const withinStopDistance = distanceToPlayer <= this.stopDistance
        this.setAggroState(withinAggro)

        if (withinAggro && !withinStopDistance) {
          this.debugState = 'aggro'
          this.idleRoamTarget = null

          const directClear = game.navGrid.hasLineOfSight(this.mesh.position, player.position)
          const playerMovedEnough = this.lastPlayerNavTarget.distanceToSquared(player.position) > 1.5 * 1.5

          if (directClear) {
            this.debugState = 'direct-chase'
            this.clearPath()
            attemptedMove = true
            const directMove = this.moveTowardsPoint(deltaTime, player.position)
            isMoving = directMove.moved
            if (directMove.slideAxis) this.debugState = `direct-slide-${directMove.slideAxis}`
            this.debugWaypoint = player.position.clone()
          } else {
            const shouldRepath =
              this.repathCooldown <= 0 &&
              (this.path.length === 0 || this.pathIndex >= this.path.length || this.pathRecalcTimer <= 0 || playerMovedEnough)

            if (shouldRepath) {
              this.path = game.navGrid.findPath(this.mesh.position, player.position, { maxSearch: 2500 })
              this.pathIndex = 0
              while (
                this.pathIndex < this.path.length &&
                horizontalDistance(this.mesh.position, this.path[this.pathIndex]) <= COW_WAYPOINT_REACH_DISTANCE
              ) {
                this.pathIndex++
              }
              this.pathRecalcTimer = COW_PATH_RECALC_INTERVAL
              this.lastPlayerNavTarget.copy(player.position)
            }

            this.debugState = 'pathing'

            while (this.pathIndex < this.path.length) {
              const waypoint = this.path[this.pathIndex]
              this.debugWaypoint = waypoint
              const flatDistance = horizontalDistance(this.mesh.position, waypoint)
              if (flatDistance <= COW_WAYPOINT_REACH_DISTANCE) { this.pathIndex++; continue }
              attemptedMove = true
              const moveResult = this.moveTowardsPoint(deltaTime, waypoint)
              isMoving = moveResult.moved
              if (moveResult.slideAxis) this.debugState = `path-slide-${moveResult.slideAxis}`
              if (moveResult.reached) this.pathIndex++
              break
            }

            if (!isMoving && attemptedMove && this.updateStuckState(deltaTime, isMoving)) {
              this.onStuck(player)
            } else if (isMoving) {
              this.stuckTimer = 0
            }

            if (!isMoving && this.pathIndex >= this.path.length && this.repathCooldown <= 0 && this.pathRecalcTimer <= 0) {
              this.path = game.navGrid.findPath(this.mesh.position, player.position, { maxSearch: 2500 })
              this.pathIndex = 0
              this.pathRecalcTimer = COW_PATH_RECALC_INTERVAL
              this.lastPlayerNavTarget.copy(player.position)
            }
          }
        } else if (withinStopDistance) {
          this.debugState = 'attack-range'
          this.idleRoamTarget = null
          this.clearPath()
          this.stuckTimer = 0

          const faceOnly = new THREE.Vector3(
            player.position.x - this.mesh.position.x, 0, player.position.z - this.mesh.position.z
          )
          if (faceOnly.lengthSq() > 0.0001) {
            faceOnly.normalize()
            const targetYaw = Math.atan2(faceOnly.x, faceOnly.z) - Math.PI / 2
            this.mesh.rotation.y = rotateTowardsAngle(this.mesh.rotation.y, targetYaw, COW_TURN_SPEED * deltaTime)
          }

          if (this.attackCooldown <= 0 && player && !player.isDead) {
            const beamStart = this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0))
            const beamEnd = player.position.clone().add(new THREE.Vector3(0, 1.0, 0))
            game.spawnAttackBeam(beamStart, beamEnd, 0xff4444, COW_ATTACK_BEAM_LIFE)
            game.damagePlayer(player, COW_ATTACK_DAMAGE, this.mesh.position, COW_ATTACK_PUSH)
            this.attackCooldown = COW_ATTACK_COOLDOWN
            this.debugState = 'attack-hit'
          }
        } else {
          this.debugState = 'idle-roam'
          this.setAggroState(false)
          this.clearPath()
          this.stuckTimer = 0
          isMoving = this.updateIdleRoam(deltaTime)
          if (this.idleRoamTarget) this.debugWaypoint = this.idleRoamTarget
        }
      } else {
        this.debugState = 'idle-roam'
        this.setAggroState(false)
        this.clearPath()
        this.stuckTimer = 0
        isMoving = this.updateIdleRoam(deltaTime)
        if (this.idleRoamTarget) this.debugWaypoint = this.idleRoamTarget
      }

      if (!attemptedMove) this.stuckTimer = 0

      if (!isMoving) {
        const sway = Math.sin(this.moveTime * COW_IDLE_SWAY_SPEED) * COW_IDLE_SWAY_AMOUNT
        this.mesh.rotation.y += sway * deltaTime * 6
      }

      this.animateLegs(deltaTime, isMoving)

      const center = new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z)
      this.collider.box.setFromCenterAndSize(
        center,
        new THREE.Vector3(COW_COLLIDER_HALF.x * 2, COW_COLLIDER_HALF.y * 2, COW_COLLIDER_HALF.z * 2)
      )
    },
  }

  return entity
}
