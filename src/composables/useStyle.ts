import { reactive, readonly } from 'vue'
import type { StyleTheme } from '../types/maze'

const defaultTheme: StyleTheme = {
  name: 'minimal',
  label: '简约黑白',
  wallColor: '#1a1a2e',
  pathColor: '#f8f9fa',
  mouseColor: '#4a90d9',
  catColor: '#e05a3d',
  exitColor: '#4caf50',
  trapColor: '#e74c3c',
  backgroundColor: '#ffffff',
  trailColor: 'rgba(74, 144, 217, 0.12)',
}

const presetThemes: Record<string, StyleTheme> = {
  minimal: defaultTheme,
  dark: {
    name: 'dark',
    label: '暗夜模式',
    wallColor: '#0f0f1a',
    pathColor: '#1a1a2e',
    mouseColor: '#66b3ff',
    catColor: '#ff6b6b',
    exitColor: '#5ecc6e',
    trapColor: '#ff4444',
    backgroundColor: '#16213e',
    trailColor: 'rgba(102, 179, 255, 0.18)',
  },
  forest: {
    name: 'forest',
    label: '森林绿',
    wallColor: '#2d5016',
    pathColor: '#e8f5e0',
    mouseColor: '#f39800',
    catColor: '#d9414e',
    exitColor: '#2196f3',
    trapColor: '#c0392b',
    backgroundColor: '#f5f9f0',
    trailColor: 'rgba(243, 152, 0, 0.12)',
  },
}

/** 将主题同步到 document.documentElement 全局 CSS 变量 */
function applyThemeToRoot(theme: StyleTheme) {
  const root = document.documentElement
  root.style.setProperty('--maze-wall', theme.wallColor)
  root.style.setProperty('--maze-path', theme.pathColor)
  root.style.setProperty('--maze-mouse', theme.mouseColor)
  root.style.setProperty('--maze-cat', theme.catColor)
  root.style.setProperty('--maze-exit', theme.exitColor)
  root.style.setProperty('--maze-trap', theme.trapColor)
  root.style.setProperty('--maze-bg', theme.backgroundColor)
  root.style.setProperty('--maze-trail', theme.trailColor)
  root.style.setProperty('--page-bg', theme.backgroundColor)
}

const state = reactive({
  current: { ...defaultTheme },
  available: { ...presetThemes },
})

// 初始化全局主题
applyThemeToRoot(defaultTheme)

export function useStyle() {
  function setTheme(name: string) {
    const theme = presetThemes[name]
    if (theme) {
      Object.assign(state.current, theme)
      applyThemeToRoot(theme)
    }
  }

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
