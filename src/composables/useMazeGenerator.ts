import type { Cell, Position, Direction, GroundItem } from '../types/maze'

// ============ 迷宫生成 ============

function createCell(row: number, col: number): Cell {
  return { row, col, walls: { top: true, right: true, bottom: true, left: true } }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function removeWall(a: Cell, b: Cell, dir: Direction): void {
  switch (dir) {
    case 'up': a.walls.top = false; b.walls.bottom = false; break
    case 'down': a.walls.bottom = false; b.walls.top = false; break
    case 'left': a.walls.left = false; b.walls.right = false; break
    case 'right': a.walls.right = false; b.walls.left = false; break
  }
}

function getUnvisitedNeighbors(
  cell: Cell, visited: boolean[][], size: number,
): Direction[] {
  const { row, col } = cell
  const dirs: Direction[] = []
  if (row > 0 && !visited[row - 1][col]) dirs.push('up')
  if (row < size - 1 && !visited[row + 1][col]) dirs.push('down')
  if (col > 0 && !visited[row][col - 1]) dirs.push('left')
  if (col < size - 1 && !visited[row][col + 1]) dirs.push('right')
  return dirs
}

function getNeighbor(cell: Cell, grid: Cell[][], dir: Direction, size: number): Cell | null {
  const { row, col } = cell
  switch (dir) {
    case 'up': return row > 0 ? grid[row - 1][col] : null
    case 'down': return row < size - 1 ? grid[row + 1][col] : null
    case 'left': return col > 0 ? grid[row][col - 1] : null
    case 'right': return col < size - 1 ? grid[row][col + 1] : null
  }
}

function carvePassages(grid: Cell[][], size: number): void {
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const stack: Cell[] = [grid[0][0]]
  visited[0][0] = true

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const neighbors = getUnvisitedNeighbors(current, visited, size)
    if (neighbors.length === 0) { stack.pop(); continue }
    const dir = shuffle(neighbors)[0]
    const next = getNeighbor(current, grid, dir, size)!
    removeWall(current, next, dir)
    visited[next.row][next.col] = true
    stack.push(next)
  }
}

function createLoops(grid: Cell[][], size: number, density: number): void {
  const removableWalls: { cell: Cell; dir: Direction; neighbor: Cell }[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c]
      if (c < size - 1 && cell.walls.right) removableWalls.push({ cell, dir: 'right', neighbor: grid[r][c + 1] })
      if (r < size - 1 && cell.walls.bottom) removableWalls.push({ cell, dir: 'down', neighbor: grid[r + 1][c] })
    }
  }
  const removeRatio = 0.05 + ((100 - density) / 100) * 0.35
  const removeCount = Math.floor(removableWalls.length * removeRatio)
  for (const { cell, dir, neighbor } of shuffle(removableWalls).slice(0, removeCount)) {
    removeWall(cell, neighbor, dir)
  }
}

function isReachable(maze: Cell[][], start: Position, goal: Position, size: number): boolean {
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const queue: Position[] = [start]
  visited[start.row][start.col] = true
  while (queue.length > 0) {
    const { row, col } = queue.shift()!
    if (row === goal.row && col === goal.col) return true
    for (const [dir, dr, dc] of [['up', -1, 0], ['down', 1, 0], ['left', 0, -1], ['right', 0, 1]] as [Direction, number, number][]) {
      const nr = row + dr; const nc = col + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        const wk = dir === 'up' ? 'top' : dir === 'down' ? 'bottom' : dir === 'left' ? 'left' : 'right'
        if (!maze[row][col].walls[wk]) { visited[nr][nc] = true; queue.push({ row: nr, col: nc }) }
      }
    }
  }
  return false
}

function checkRightHandRuleFails(maze: Cell[][], start: Position, goal: Position, size: number): boolean {
  const dirs = [{ d: 'up' as Direction, dr: -1, dc: 0 }, { d: 'right' as Direction, dr: 0, dc: 1 }, { d: 'down' as Direction, dr: 1, dc: 0 }, { d: 'left' as Direction, dr: 0, dc: -1 }]
  let facing = 1, row = start.row, col = start.col
  const vc: number[][] = Array.from({ length: size }, () => Array(size).fill(0))
  for (let s = 0; s < size * size * 4; s++) {
    if (++vc[row][col] > 2) return true
    if (row === goal.row && col === goal.col) return false
    for (let i = 0; i < 4; i++) {
      const { d, dr, dc } = dirs[(facing + 1 + i) % 4]
      const wk = d === 'up' ? 'top' : d === 'down' ? 'bottom' : d === 'left' ? 'left' : 'right'
      if (!maze[row][col].walls[wk]) {
        const nr = row + dr; const nc = col + dc
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) { row = nr; col = nc; facing = (facing + 1 + i) % 4; break }
      }
    }
  }
  return true
}

// ============ 陷阱放置 ============

/**
 * 在迷宫中随机放置陷阱
 * 不会放在起点、终点，且尽量分散
 */
function placeTraps(size: number, count: number, start: Position, goal: Position): Set<string> {
  const traps = new Set<string>()
  const maxTraps = Math.min(count, size * size - 2)
  const candidates: Position[] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r === start.row && c === start.col) || (r === goal.row && c === goal.col)) continue
      candidates.push({ row: r, col: c })
    }
  }

  const chosen = shuffle(candidates).slice(0, maxTraps)
  for (const p of chosen) traps.add(`${p.row},${p.col}`)
  return traps
}

// ============ 道具放置 ============

function placeItems(size: number, jerkyCount: number, sugarCount: number, start: Position, goal: Position, traps: Set<string>): GroundItem[] {
  const items: GroundItem[] = []
  const occupied = new Set<string>()
  occupied.add(`${start.row},${start.col}`)
  occupied.add(`${goal.row},${goal.col}`)
  for (const t of traps) occupied.add(t)

  const candidates: Position[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!occupied.has(`${r},${c}`)) candidates.push({ row: r, col: c })
    }
  }

  const chosen = shuffle(candidates)
  let placed = 0
  for (const p of chosen) {
    if (placed < jerkyCount) { items.push({ type: 'jerky', row: p.row, col: p.col }); placed++; occupied.add(`${p.row},${p.col}`) }
  }
  placed = 0
  for (const p of chosen) {
    if (!occupied.has(`${p.row},${p.col}`) && placed < sugarCount) {
      items.push({ type: 'sugarWater', row: p.row, col: p.col }); placed++; occupied.add(`${p.row},${p.col}`)
    }
  }
  return items
}

// ============ 迷宫生成入口 ============

export interface MazeResult {
  maze: Cell[][]
  start: Position
  goal: Position
  traps: Set<string>
  items: GroundItem[]
}

export function generateMaze(
  size: number, density: number = 50, trapCount: number = 0,
  jerkyCount: number = 0, sugarCount: number = 0,
): MazeResult {
  const grid: Cell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (__, c) => createCell(r, c)),
  )

  carvePassages(grid, size)
  createLoops(grid, size, density)

  const start: Position = { row: 0, col: 0 }
  const goal: Position = { row: size - 1, col: size - 1 }

  grid[0][0].walls.top = false
  grid[size - 1][size - 1].walls.bottom = false

  if (!isReachable(grid, start, goal, size)) {
    return generateMaze(size, density, trapCount, jerkyCount, sugarCount)
  }

  if (!checkRightHandRuleFails(grid, start, goal, size)) {
    createLoops(grid, size, Math.max(0, density - 20))
    if (!isReachable(grid, start, goal, size)) return generateMaze(size, density, trapCount, jerkyCount, sugarCount)
  }

  const traps = placeTraps(size, trapCount, start, goal)
  const items = placeItems(size, jerkyCount, sugarCount, start, goal, traps)

  return { maze: grid, start, goal, traps, items }
}

// ============ 移动判断 ============

const DIR_DELTAS: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 }, left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 },
}
const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

export function canMove(maze: Cell[][], pos: Position, dir: Direction, size: number): boolean {
  const cell = maze[pos.row][pos.col]
  const wk = dir === 'up' ? 'top' : dir === 'down' ? 'bottom' : dir === 'left' ? 'left' : 'right'
  if (cell.walls[wk]) return false
  switch (dir) {
    case 'up': return pos.row > 0
    case 'down': return pos.row < size - 1
    case 'left': return pos.col > 0
    case 'right': return pos.col < size - 1
  }
}

export function movePosition(pos: Position, dir: Direction): Position {
  const { dr, dc } = DIR_DELTAS[dir]
  return { row: pos.row + dr, col: pos.col + dc }
}

// ============ 权重 Dijkstra 寻路（猫 AI） ============

/** 简易最小堆 */
class MinHeap<T> {
  private data: { key: number; val: T }[] = []
  push(key: number, val: T) {
    this.data.push({ key, val })
    let i = this.data.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.data[p].key <= this.data[i].key) break
      ;[this.data[p], this.data[i]] = [this.data[i], this.data[p]]
      i = p
    }
  }
  pop(): { key: number; val: T } | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const last = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = last
      let i = 0
      while (true) {
        let smallest = i
        const l = i * 2 + 1; const r = i * 2 + 2
        if (l < this.data.length && this.data[l].key < this.data[smallest].key) smallest = l
        if (r < this.data.length && this.data[r].key < this.data[smallest].key) smallest = r
        if (smallest === i) break
        ;[this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]
        i = smallest
      }
    }
    return top
  }
  get size() { return this.data.length }
}

/**
 * 权重 Dijkstra：陷阱格权重 = 1 + ceil(stunDuration / moveInterval)
 * 猫 AI 使用此函数，自动绕开高权重陷阱
 */
export function dijkstraNextStep(
  maze: Cell[][],
  from: Position,
  to: Position,
  size: number,
  trapSet: Set<string>,
  trapWeight: number,
): Direction | null {
  if (from.row === to.row && from.col === to.col) return null

  const cost: number[][] = Array.from({ length: size }, () => Array(size).fill(Infinity))
  cost[from.row][from.col] = 0

  interface Entry { pos: Position; firstStep: Direction }
  const heap = new MinHeap<Entry>()

  // 初始步入队
  for (const dir of ALL_DIRECTIONS) {
    if (canMove(maze, from, dir, size)) {
      const next = movePosition(from, dir)
      const c = trapSet.has(`${next.row},${next.col}`) ? trapWeight : 1
      cost[next.row][next.col] = c
      heap.push(c, { pos: next, firstStep: dir })
    }
  }

  while (heap.size > 0) {
    const item = heap.pop()!
    const { key: curCost, val: { pos, firstStep } } = item
    if (curCost > cost[pos.row][pos.col]) continue

    if (pos.row === to.row && pos.col === to.col) return firstStep

    for (const dir of ALL_DIRECTIONS) {
      if (canMove(maze, pos, dir, size)) {
        const next = movePosition(pos, dir)
        const edgeCost = trapSet.has(`${next.row},${next.col}`) ? trapWeight : 1
        const newCost = curCost + edgeCost
        if (newCost < cost[next.row][next.col]) {
          cost[next.row][next.col] = newCost
          heap.push(newCost, { pos: next, firstStep })
        }
      }
    }
  }

  return null
}
