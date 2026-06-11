import type { Cell, Position } from '../types/maze'

/**
 * 迷宫生成器
 *
 * 算法分两步：
 * 1. 随机 DFS 生成完美迷宫（生成树，只有唯一路径）
 * 2. 随机拆除额外墙壁创建环路，打破右手法则
 *
 * 最终迷宫特点：
 * - 起点到终点存在多条不同路径
 * - 右手法则（沿右墙走）无法保证到达终点
 * - 保留迷宫的主体结构和难度
 */

/** 创建一个四面都有墙的格子 */
function createCell(row: number, col: number): Cell {
  return {
    row,
    col,
    walls: { top: true, right: true, bottom: true, left: true },
  }
}

/** 获取未访问的邻居 */
function getUnvisitedNeighbors(
  cell: Cell,
  grid: Cell[][],
  visited: boolean[][],
  size: number,
): Direction[] {
  const { row, col } = cell
  const dirs: Direction[] = []

  if (row > 0 && !visited[row - 1][col]) dirs.push('up')
  if (row < size - 1 && !visited[row + 1][col]) dirs.push('down')
  if (col > 0 && !visited[row][col - 1]) dirs.push('left')
  if (col < size - 1 && !visited[row][col + 1]) dirs.push('right')

  return dirs
}

/** Fisher-Yates 洗牌 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 拆除两个相邻格子之间的墙壁 */
function removeWall(a: Cell, b: Cell, dir: Direction): void {
  switch (dir) {
    case 'up':
      a.walls.top = false
      b.walls.bottom = false
      break
    case 'down':
      a.walls.bottom = false
      b.walls.top = false
      break
    case 'left':
      a.walls.left = false
      b.walls.right = false
      break
    case 'right':
      a.walls.right = false
      b.walls.left = false
      break
  }
}

/** 获取格子在某方向上的邻居 */
function getNeighbor(
  cell: Cell,
  grid: Cell[][],
  dir: Direction,
  size: number,
): Cell | null {
  const { row, col } = cell
  switch (dir) {
    case 'up':
      return row > 0 ? grid[row - 1][col] : null
    case 'down':
      return row < size - 1 ? grid[row + 1][col] : null
    case 'left':
      return col > 0 ? grid[row][col - 1] : null
    case 'right':
      return col < size - 1 ? grid[row][col + 1] : null
  }
}

/**
 * 第一步：随机 DFS 生成完美迷宫（生成树）
 */
function carvePassages(grid: Cell[][], size: number): void {
  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  )

  const stack: Cell[] = []
  const start = grid[0][0]
  visited[0][0] = true
  stack.push(start)

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const neighbors = getUnvisitedNeighbors(current, grid, visited, size)

    if (neighbors.length === 0) {
      stack.pop()
      continue
    }

    const dir = shuffle(neighbors)[0]
    const next = getNeighbor(current, grid, dir, size)!

    removeWall(current, next, dir)
    visited[next.row][next.col] = true
    stack.push(next)
  }
}

/**
 * 第二步：拆除额外墙壁创建环路
 * @param density 墙壁密度 0-100，数值越高保留越多墙
 *   - density 100 → 几乎不拆额外墙（最密，接近完美迷宫）
 *   - density 0   → 拆除最多墙（最开阔）
 *
 * 拆墙比例公式：removeRatio = 5% + (100 - density)/100 × 35%
 *   - density 100: 5% 最少环路
 *   - density 50:  22.5% 平衡
 *   - density 0:   40% 最多环路
 */
function createLoops(grid: Cell[][], size: number, density: number): void {
  const removableWalls: { cell: Cell; dir: Direction; neighbor: Cell }[] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c]
      if (c < size - 1 && cell.walls.right) {
        removableWalls.push({ cell, dir: 'right', neighbor: grid[r][c + 1] })
      }
      if (r < size - 1 && cell.walls.bottom) {
        removableWalls.push({ cell, dir: 'down', neighbor: grid[r + 1][c] })
      }
    }
  }

  // 密度 → 拆墙比例：高密度 = 低拆除率
  const removeRatio = 0.05 + ((100 - density) / 100) * 0.35
  const removeCount = Math.floor(removableWalls.length * removeRatio)

  const toRemove = shuffle(removableWalls).slice(0, removeCount)

  for (const { cell, dir, neighbor } of toRemove) {
    removeWall(cell, neighbor, dir)
  }
}

/**
 * 验证从起点能否到达终点（BFS）
 */
function isReachable(maze: Cell[][], start: Position, goal: Position, size: number): boolean {
  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  )
  const queue: Position[] = [start]
  visited[start.row][start.col] = true

  while (queue.length > 0) {
    const { row, col } = queue.shift()!
    if (row === goal.row && col === goal.col) return true

    const cell = maze[row][col]
    const directions: [Direction, number, number][] = [
      ['up', -1, 0],
      ['down', 1, 0],
      ['left', 0, -1],
      ['right', 0, 1],
    ]

    for (const [dir, dr, dc] of directions) {
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        const wallKey = dir === 'up' ? 'top' : dir === 'down' ? 'bottom' : dir === 'left' ? 'left' : 'right'
        if (!cell.walls[wallKey]) {
          visited[nr][nc] = true
          queue.push({ row: nr, col: nc })
        }
      }
    }
  }
  return false
}

/**
 * 验证右手法则是否会失败
 * 右手法则：始终贴着右墙走。在有环路的迷宫中，右手法则会陷入环路。
 * 这里我们做简化检测：尝试右手法则走，如果经过同一个格子超过2次说明陷入环路。
 */
function checkRightHandRuleFails(maze: Cell[][], start: Position, goal: Position, size: number): boolean {
  // 四个方向：上右下左（顺时针）
  const dirs: { d: Direction; dr: number; dc: number }[] = [
    { d: 'up', dr: -1, dc: 0 },
    { d: 'right', dr: 0, dc: 1 },
    { d: 'down', dr: 1, dc: 0 },
    { d: 'left', dr: 0, dc: -1 },
  ]

  let facing = 1 // 初始朝右
  let row = start.row
  let col = start.col
  const visitCount: number[][] = Array.from({ length: size }, () =>
    Array(size).fill(0),
  )

  for (let steps = 0; steps < size * size * 4; steps++) {
    visitCount[row][col]++
    if (visitCount[row][col] > 2) return true // 陷入环路，右手法则失败

    if (row === goal.row && col === goal.col) return false // 到达终点

    // 右手法则：尝试向右转（即当前方向顺时针转90度）
    for (let i = 0; i < 4; i++) {
      const tryDir = (facing + 1 + i) % 4 // 右、前、左、后
      const { d, dr, dc } = dirs[tryDir]
      const cell = maze[row][col]
      const wallKey =
        d === 'up' ? 'top' : d === 'down' ? 'bottom' : d === 'left' ? 'left' : 'right'

      if (!cell.walls[wallKey]) {
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          row = nr
          col = nc
          facing = tryDir
          break
        }
      }
    }
  }

  return true // 走了太多步，右手法则失败
}

/**
 * 主入口：生成一个多路径、反右手法则的迷宫
 */
export function generateMaze(size: number, density: number = 50): { maze: Cell[][]; start: Position; goal: Position } {
  // 初始化全墙格子
  const grid: Cell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (__, c) => createCell(r, c)),
  )

  // 第一步：DFS 生成完美迷宫
  carvePassages(grid, size)

  // 第二步：创建环路（密度参数控制拆墙比例）
  createLoops(grid, size, density)

  // 起点和终点
  const start: Position = { row: 0, col: 0 }
  const goal: Position = { row: size - 1, col: size - 1 }

  // 打开入口和出口
  grid[0][0].walls.top = false
  grid[size - 1][size - 1].walls.bottom = false

  // 验证可到达性
  if (!isReachable(grid, start, goal, size)) {
    return generateMaze(size, density)
  }

  // 如果右手法则能直接到达终点，再多拆一些墙
  if (!checkRightHandRuleFails(grid, start, goal, size)) {
    createLoops(grid, size, Math.max(0, density - 20))
    if (!isReachable(grid, start, goal, size)) {
      return generateMaze(size, density)
    }
  }

  return { maze: grid, start, goal }
}

/**
 * 判断玩家能否向某个方向移动
 */
export function canMove(
  maze: Cell[][],
  pos: Position,
  dir: Direction,
  size: number,
): boolean {
  const cell = maze[pos.row][pos.col]
  const wallKey =
    dir === 'up' ? 'top' : dir === 'down' ? 'bottom' : dir === 'left' ? 'left' : 'right'

  if (cell.walls[wallKey]) return false

  switch (dir) {
    case 'up':
      return pos.row > 0
    case 'down':
      return pos.row < size - 1
    case 'left':
      return pos.col > 0
    case 'right':
      return pos.col < size - 1
  }
}

/** 方向到坐标偏移 */
const DIR_DELTAS: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
}

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

/**
 * BFS 寻路：返回从 from 到 to 的下一步方向
 * 这是猫的 AI 核心——每一步都朝老鼠走最短路径
 */
export function bfsNextStep(
  maze: Cell[][],
  from: Position,
  to: Position,
  size: number,
): Direction | null {
  if (from.row === to.row && from.col === to.col) return null

  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  )
  visited[from.row][from.col] = true

  interface QueueItem {
    pos: Position
    firstStep: Direction
  }

  const queue: QueueItem[] = []

  // 将四个方向的初始步入队
  for (const dir of ALL_DIRECTIONS) {
    if (canMove(maze, from, dir, size)) {
      const { dr, dc } = DIR_DELTAS[dir]
      const nr = from.row + dr
      const nc = from.col + dc
      if (nr === to.row && nc === to.col) return dir
      visited[nr][nc] = true
      queue.push({ pos: { row: nr, col: nc }, firstStep: dir })
    }
  }

  let head = 0
  while (head < queue.length) {
    const { pos, firstStep } = queue[head++]
    if (pos.row === to.row && pos.col === to.col) return firstStep

    for (const dir of ALL_DIRECTIONS) {
      if (canMove(maze, pos, dir, size)) {
        const { dr, dc } = DIR_DELTAS[dir]
        const nr = pos.row + dr
        const nc = pos.col + dc
        if (!visited[nr][nc]) {
          if (nr === to.row && nc === to.col) return firstStep
          visited[nr][nc] = true
          queue.push({ pos: { row: nr, col: nc }, firstStep })
        }
      }
    }
  }

  return null // 无路径（不应该发生）
}

/**
 * 根据方向移动位置
 */
export function movePosition(pos: Position, dir: Direction): Position {
  const { dr, dc } = DIR_DELTAS[dir]
  return { row: pos.row + dr, col: pos.col + dc }
}
