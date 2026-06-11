/** 单个格子的墙壁状态 */
export interface Walls {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

/** 迷宫中的一个格子 */
export interface Cell {
  row: number
  col: number
  walls: Walls
}

/** 坐标位置 */
export interface Position {
  row: number
  col: number
}

/** 游戏阶段 */
export type GamePhase = 'config' | 'playing' | 'won' | 'caught'

/** 方向 */
export type Direction = 'up' | 'down' | 'left' | 'right'

/** 可配置的游戏参数 */
export interface GameConfig {
  /** 猫出现的延迟步数 */
  catSpawnDelay: number
  /** 猫移动间隔（秒） */
  catMoveInterval: number
  /** 迷宫边长 */
  mazeSize: number
}

/** 游戏完整状态 */
export interface GameState {
  phase: GamePhase
  size: number
  maze: Cell[][]
  mousePos: Position
  exitPos: Position
  catPos: Position | null
  catActive: boolean
  moves: number
  startTime: number | null
  endTime: number | null
}

/** 风格主题配置 */
export interface StyleTheme {
  name: string
  label: string
  wallColor: string
  pathColor: string
  mouseColor: string
  catColor: string
  exitColor: string
  backgroundColor: string
  trailColor: string
}
