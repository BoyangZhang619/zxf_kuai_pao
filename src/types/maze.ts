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

/** 道具类型 */
export type ItemType = 'jerky' | 'sugarWater'

/** 地上的道具 */
export interface GroundItem {
  type: ItemType
  row: number
  col: number
}

/** 猫的活跃 buff */
export interface CatBuffs {
  /** 加速结束时间戳 (0=无) */
  speedBoostUntil: number
  /** 穿墙结束时间戳 (0=无) */
  wallPhaseUntil: number
  /** 进食暂停结束时间戳 (0=无) */
  eatingUntil: number
}

/** 可配置的游戏参数 */
export interface GameConfig {
  catSpawnDelay: number
  catMoveInterval: number
  mazeSize: number
  wallDensity: number
  trapCount: number
  trapStunDuration: number
  jerkyCount: number
  sugarWaterCount: number
  showItemToasts: boolean
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
  trapColor: string
  backgroundColor: string
  trailColor: string
}
