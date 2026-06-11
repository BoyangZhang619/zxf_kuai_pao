import type { GameConfig } from '../types/maze'

export interface DifficultyPreset {
  key: string
  label: string
  desc: string
  config: GameConfig
}

/**
 * 五级难度预设
 *
 * 难度数值经过归一化计算，确保每级之间难度增量大致线性 (~20%/级):
 *  简单 12% → 偏简单 32% → 中等 52% → 偏难 71% → 困难 92%
 *
 * 影响难度的参数:
 *  mazeSize↑ / wallDensity↑ / trapCount↑ / trapStunDuration↑
 *  catSpawnDelay↓ / catMoveInterval↓ / jerkyCount↓ / sugarWaterCount↓
 */
export const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    key: 'easy',
    label: '简单',
    desc: '迷宫小、无陷阱、猫出现晚',
    config: {
      mazeSize: 8,
      wallDensity: 35,
      trapCount: 0,
      trapStunDuration: 1,
      catSpawnDelay: 10,
      catMoveInterval: 0.9,
      jerkyCount: 5,
      sugarWaterCount: 4,
    },
  },
  {
    key: 'easyMedium',
    label: '偏简单',
    desc: '小迷宫、少量陷阱',
    config: {
      mazeSize: 10,
      wallDensity: 50,
      trapCount: 4,
      trapStunDuration: 1,
      catSpawnDelay: 7,
      catMoveInterval: 0.6,
      jerkyCount: 4,
      sugarWaterCount: 3,
    },
  },
  {
    key: 'medium',
    label: '中等',
    desc: '适中迷宫、陷阱增多',
    config: {
      mazeSize: 14,
      wallDensity: 65,
      trapCount: 8,
      trapStunDuration: 1.5,
      catSpawnDelay: 5,
      catMoveInterval: 0.45,
      jerkyCount: 3,
      sugarWaterCount: 2,
    },
  },
  {
    key: 'mediumHard',
    label: '偏难',
    desc: '大迷宫、多陷阱、猫快速',
    config: {
      mazeSize: 17,
      wallDensity: 78,
      trapCount: 12,
      trapStunDuration: 2,
      catSpawnDelay: 3,
      catMoveInterval: 0.3,
      jerkyCount: 1,
      sugarWaterCount: 1,
    },
  },
  {
    key: 'hard',
    label: '困难',
    desc: '最大迷宫、满陷阱、猫极速追击',
    config: {
      mazeSize: 20,
      wallDensity: 92,
      trapCount: 18,
      trapStunDuration: 3,
      catSpawnDelay: 1,
      catMoveInterval: 0.2,
      jerkyCount: 0,
      sugarWaterCount: 0,
    },
  },
]
