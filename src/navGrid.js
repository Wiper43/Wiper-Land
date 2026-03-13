// navGrid.js
// Lightweight grid navigation + A* pathfinding for Wiper Land.
// Designed for arena-style maps with Box3 colliders.
// Usage:
//   import { createNavGrid } from "./navGrid.js"
//   const navGrid = createNavGrid({ worldSize: 40, cellSize: 1 })
//   navGrid.rebuild(world.colliders)
//   const path = navGrid.findPath(enemy.mesh.position, player.position)

import * as THREE from 'three'

export function createNavGrid({
  worldSize = 40,
  cellSize = 1,
  origin = new THREE.Vector3(-20, 0, -20),
  agentRadius = 0.9,
  maxClimbStep = 1.25,
} = {}) {
  const cols = Math.max(1, Math.ceil(worldSize / cellSize))
  const rows = Math.max(1, Math.ceil(worldSize / cellSize))

  const grid = new Array(cols * rows).fill(0) // 0 = walkable, 1 = blocked

  function index(col, row) {
    return row * cols + col
  }

  function inBounds(col, row) {
    return col >= 0 && row >= 0 && col < cols && row < rows
  }

  function clear() {
    grid.fill(0)
  }

  function worldToCell(position) {
    const col = Math.floor((position.x - origin.x) / cellSize)
    const row = Math.floor((position.z - origin.z) / cellSize)
    return {
      col: clamp(col, 0, cols - 1),
      row: clamp(row, 0, rows - 1),
    }
  }

  function cellToWorld(col, row, y = 0) {
    return new THREE.Vector3(
      origin.x + col * cellSize + cellSize * 0.5,
      y,
      origin.z + row * cellSize + cellSize * 0.5
    )
  }

  function isBlocked(col, row) {
    if (!inBounds(col, row)) return true
    return grid[index(col, row)] === 1
  }

  function setBlocked(col, row, blocked = true) {
    if (!inBounds(col, row)) return
    grid[index(col, row)] = blocked ? 1 : 0
  }

  function rebuild(colliders = []) {
    clear()

    const padding = agentRadius

    for (const collider of colliders) {
      if (!collider?.box || collider.isDynamic) continue

      const size = new THREE.Vector3()
      collider.box.getSize(size)

      // Ignore very short blockers like floor-ish surfaces.
      if (size.y < maxClimbStep) continue

      const minX = collider.box.min.x - padding
      const maxX = collider.box.max.x + padding
      const minZ = collider.box.min.z - padding
      const maxZ = collider.box.max.z + padding

      const minCell = worldToCell(new THREE.Vector3(minX, 0, minZ))
      const maxCell = worldToCell(new THREE.Vector3(maxX, 0, maxZ))

      for (let row = minCell.row; row <= maxCell.row; row++) {
        for (let col = minCell.col; col <= maxCell.col; col++) {
          setBlocked(col, row, true)
        }
      }
    }
  }

  function hasLineOfSight(startPos, endPos) {
    const delta = new THREE.Vector3().subVectors(endPos, startPos)
    const distance = Math.max(0.0001, delta.length())
    const steps = Math.ceil(distance / (cellSize * 0.5))
    const sample = new THREE.Vector3()

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      sample.copy(startPos).lerp(endPos, t)
      const cell = worldToCell(sample)
      if (isBlocked(cell.col, cell.row)) {
        return false
      }
    }

    return true
  }

  function findNearestOpenCell(startCol, startRow, maxRadius = 6) {
    if (!isBlocked(startCol, startRow)) {
      return { col: startCol, row: startRow }
    }

    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let row = startRow - radius; row <= startRow + radius; row++) {
        for (let col = startCol - radius; col <= startCol + radius; col++) {
          if (!inBounds(col, row)) continue
          if (Math.abs(col - startCol) !== radius && Math.abs(row - startRow) !== radius) continue
          if (!isBlocked(col, row)) {
            return { col, row }
          }
        }
      }
    }

    return null
  }

  function neighbors(col, row) {
    const result = []

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue

        const nextCol = col + dx
        const nextRow = row + dz

        if (!inBounds(nextCol, nextRow) || isBlocked(nextCol, nextRow)) continue

        // Prevent corner cutting on diagonals.
        if (dx !== 0 && dz !== 0) {
          if (isBlocked(col + dx, row) || isBlocked(col, row + dz)) {
            continue
          }
        }

        result.push({
          col: nextCol,
          row: nextRow,
          cost: dx !== 0 && dz !== 0 ? Math.SQRT2 : 1,
        })
      }
    }

    return result
  }

  function heuristic(aCol, aRow, bCol, bRow) {
    const dx = Math.abs(bCol - aCol)
    const dy = Math.abs(bRow - aRow)
    const diagonal = Math.min(dx, dy)
    const straight = Math.abs(dx - dy)
    return diagonal * Math.SQRT2 + straight
  }

  function reconstructPath(cameFrom, currentKey, goalY = 0) {
    const cells = []
    let key = currentKey

    while (key) {
      const [col, row] = key.split(',').map(Number)
      cells.push({ col, row })
      key = cameFrom.get(key) || null
    }

    cells.reverse()

    const waypoints = cells.map((cell) => cellToWorld(cell.col, cell.row, goalY))
    return smoothPath(waypoints)
  }

  function smoothPath(waypoints) {
    if (waypoints.length <= 2) return waypoints

    const result = [waypoints[0]]
    let anchorIndex = 0

    for (let i = 2; i < waypoints.length; i++) {
      const anchor = waypoints[anchorIndex]
      const target = waypoints[i]

      if (!hasLineOfSight(anchor, target)) {
        result.push(waypoints[i - 1])
        anchorIndex = i - 1
      }
    }

    result.push(waypoints[waypoints.length - 1])
    return result
  }

  function findPath(startPos, goalPos, options = {}) {
    const maxSearch = options.maxSearch ?? 2000

    const startCellRaw = worldToCell(startPos)
    const goalCellRaw = worldToCell(goalPos)

    const startCell = findNearestOpenCell(startCellRaw.col, startCellRaw.row)
    const goalCell = findNearestOpenCell(goalCellRaw.col, goalCellRaw.row)

    if (!startCell || !goalCell) return []

    if (startCell.col === goalCell.col && startCell.row === goalCell.row) {
      return [cellToWorld(goalCell.col, goalCell.row, goalPos.y)]
    }

    const open = []
    const openMap = new Map()
    const cameFrom = new Map()
    const gScore = new Map()

    const startKey = `${startCell.col},${startCell.row}`
    const goalKey = `${goalCell.col},${goalCell.row}`

    const startNode = {
      col: startCell.col,
      row: startCell.row,
      g: 0,
      f: heuristic(startCell.col, startCell.row, goalCell.col, goalCell.row),
      key: startKey,
    }

    open.push(startNode)
    openMap.set(startKey, startNode)
    gScore.set(startKey, 0)

    let searched = 0

    while (open.length > 0 && searched < maxSearch) {
      searched++

      let bestIndex = 0
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIndex].f) {
          bestIndex = i
        }
      }

      const current = open.splice(bestIndex, 1)[0]
      openMap.delete(current.key)

      if (current.key === goalKey) {
        const path = reconstructPath(cameFrom, current.key, goalPos.y)
        if (path.length > 0) {
          path[path.length - 1] = goalPos.clone()
        }
        return path
      }

      for (const next of neighbors(current.col, current.row)) {
        const nextKey = `${next.col},${next.row}`
        const tentativeG = current.g + next.cost
        const knownG = gScore.get(nextKey)

        if (knownG !== undefined && tentativeG >= knownG) {
          continue
        }

        cameFrom.set(nextKey, current.key)
        gScore.set(nextKey, tentativeG)

        const node = {
          col: next.col,
          row: next.row,
          g: tentativeG,
          f: tentativeG + heuristic(next.col, next.row, goalCell.col, goalCell.row),
          key: nextKey,
        }

        if (openMap.has(nextKey)) {
          const existing = openMap.get(nextKey)
          existing.g = node.g
          existing.f = node.f
          existing.col = node.col
          existing.row = node.row
        } else {
          open.push(node)
          openMap.set(nextKey, node)
        }
      }
    }

    return []
  }

  function debugData() {
    return {
      cols,
      rows,
      cellSize,
      origin: origin.clone(),
      grid: grid.slice(),
    }
  }

  return {
    cols,
    rows,
    cellSize,
    origin,
    grid,
    clear,
    rebuild,
    worldToCell,
    cellToWorld,
    isBlocked,
    setBlocked,
    hasLineOfSight,
    findPath,
    debugData,
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
