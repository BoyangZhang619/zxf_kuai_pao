<script setup lang="ts">
import type { GameConfig } from '../types/maze'

defineProps<{
  config: GameConfig
  disabled: boolean
}>()

const emit = defineEmits<{
  start: []
  restart: []
  openSettings: []
}>()
</script>

<template>
  <div class="game-controls">
    <div class="controls-row">
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
      <span class="info-badge">张雪峰 {{ config.catSpawnDelay }}步后出现</span>
      <span class="info-badge">⏱ {{ config.catMoveInterval }}s/步</span>
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
</style>
