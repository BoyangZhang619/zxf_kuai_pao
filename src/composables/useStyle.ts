import { reactive, readonly } from 'vue'
import type { StyleTheme } from '../types/maze'

/** 默认简约风格 */
const defaultTheme: StyleTheme = {
  name: 'minimal',
  label: '简约黑白',
  wallColor: '#1a1a2e',
  pathColor: '#f8f9fa',
  playerColor: '#4a90d9',
  goalColor: '#e07b5a',
  backgroundColor: '#ffffff',
  trailColor: 'rgba(74, 144, 217, 0.15)',
}

/** 预设风格库（后续扩展） */
const presetThemes: Record<string, StyleTheme> = {
  minimal: defaultTheme,
  dark: {
    name: 'dark',
    label: '暗夜模式',
    wallColor: '#0f0f1a',
    pathColor: '#1a1a2e',
    playerColor: '#66b3ff',
    goalColor: '#ff6b6b',
    backgroundColor: '#16213e',
    trailColor: 'rgba(102, 179, 255, 0.18)',
  },
  forest: {
    name: 'forest',
    label: '森林绿',
    wallColor: '#2d5016',
    pathColor: '#e8f5e0',
    playerColor: '#f39800',
    goalColor: '#d9414e',
    backgroundColor: '#f5f9f0',
    trailColor: 'rgba(243, 152, 0, 0.12)',
  },
}

const state = reactive({
  current: { ...defaultTheme },
  available: { ...presetThemes },
})

export function useStyle() {
  /** 设置当前主题 */
  function setTheme(name: string) {
    const theme = presetThemes[name]
    if (theme) {
      Object.assign(state.current, theme)
    }
  }

  /** 获取所有可用主题名 */
  function getThemeNames() {
    return Object.keys(presetThemes).map((k) => ({
      name: presetThemes[k].name,
      label: presetThemes[k].label,
    }))
  }

  return {
    theme: readonly(state.current),
    setTheme,
    getThemeNames,
  }
}
