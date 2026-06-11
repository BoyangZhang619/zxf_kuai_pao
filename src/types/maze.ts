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
export type GamePhase = 'config' | 'playing' | 'won'

/** 方向 */
export type Direction = 'up' | 'down' | 'left' | 'right'

/** 游戏完整状态 */
export interface GameState {
  phase: GamePhase
  size: number
  maze: Cell[][]
  playerPos: Position
  goalPos: Position
  moves: number
  startTime: number | null
  endTime: number | null
}

/** 风格主题配置 */
export interface StyleTheme {
  name: string
  label: string
  /** 墙壁颜色 */
  wallColor: string
  /** 路径颜色 */
  pathColor: string
  /** 玩家（猫）颜色 */
  playerColor: string
  /** 目标（老鼠）颜色 */
  goalColor: string
  /** 背景颜色 */
  backgroundColor: string
  /** 玩家已走过的路径高亮色 */
  trailColor: string
}
