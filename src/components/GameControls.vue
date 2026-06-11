<script setup lang="ts">
import type { GameConfig } from '../types/maze'
import { useStyle } from '../composables/useStyle'

defineProps<{
  config: GameConfig
  disabled: boolean
}>()

const emit = defineEmits<{
  start: []
  restart: []
  openSettings: []
}>()

const { theme, setTheme, getThemeNames } = useStyle()
const themeNames = getThemeNames()
</script>

<template>
  <div class="game-controls">
    <div class="controls-row">
      <!-- 按钮 -->
      <button class="btn btn-primary" @click="emit('start')" :disabled="disabled">
        {{ disabled ? '游戏中...' : '开始游戏' }}
      </button>
      <button class="btn btn-secondary" @click="emit('restart')" :disabled="!disabled">
        重新开始
      </button>
      <button class="btn btn-ghost" @click="emit('openSettings')">
        ⚙️ 设置
      </button>
    </div>

    <!-- 快捷信息 -->
    <div class="info-row">
      <span class="info-badge">{{ config.mazeSize }}×{{ config.mazeSize }}</span>
      <span class="info-badge">🐱 {{ config.catSpawnDelay }}步后出现</span>
      <span class="info-badge">⏱ {{ config.catMoveInterval }}s/步</span>

      <span class="info-divider">|</span>

      <button
        v-for="t in themeNames"
        :key="t.name"
        class="theme-chip"
        :class="{ active: theme.name === t.name }"
        @click="setTheme(t.name)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="controls-hint">
      <kbd>↑ ↓ ← →</kbd> 或 <kbd>W A S D</kbd> 控制老鼠移动
    </div>
  </div>
</template>

<style scoped>
.game-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 640px;
}

.controls-row {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

/* 按钮 */
.btn {
  font-size: 14px;
  font-weight: 600;
  padding: 8px 20px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary {
  background: #1a1a2e; color: #fff;
}
.btn-primary:hover:not(:disabled) { background: #2d2d4a; transform: translateY(-1px); }

.btn-secondary {
  background: #fff; color: #1a1a2e; border-color: #ccc;
}
.btn-secondary:hover:not(:disabled) { border-color: #1a1a2e; transform: translateY(-1px); }

.btn-ghost {
  background: transparent; color: #888; border-color: transparent;
}
.btn-ghost:hover { color: #333; background: #f5f5f5; }

/* 信息行 */
.info-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}
.info-badge {
  font-size: 12px;
  padding: 3px 10px;
  background: #f0f0f0;
  border-radius: 12px;
  color: #666;
  white-space: nowrap;
}
.info-divider {
  color: #ddd;
  margin: 0 2px;
}

/* 主题 */
.theme-chip {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1.5px solid #ddd;
  background: #fff;
  color: #666;
  cursor: pointer;
  transition: all 0.15s ease;
}
.theme-chip:hover { border-color: #999; color: #333; }
.theme-chip.active { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }

/* 操作提示 */
.controls-hint {
  text-align: center;
  font-size: 13px;
  color: #aaa;
}
kbd {
  display: inline-block;
  padding: 1px 6px;
  font-size: 12px; font-family: inherit;
  background: #f0f0f0; border: 1px solid #d0d0d0;
  border-radius: 4px; margin: 0 2px;
}
</style>
