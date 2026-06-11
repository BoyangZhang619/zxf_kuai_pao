<script setup lang="ts">
import { ref } from 'vue'
import { useStyle } from '../composables/useStyle'

const props = defineProps<{
  size: number
  disabled: boolean
}>()

const emit = defineEmits<{
  start: [size: number]
  restart: []
}>()

const { theme, setTheme, getThemeNames } = useStyle()

const selectedSize = ref(props.size)
const showThemeMenu = ref(false)

const themeNames = getThemeNames()

function handleStart() {
  emit('start', selectedSize.value)
}

function handleRestart() {
  emit('restart')
}

function selectTheme(name: string) {
  setTheme(name)
  showThemeMenu.value = false
}
</script>

<template>
  <div class="game-controls">
    <div class="controls-row">
      <!-- 难度选择 -->
      <div class="control-group">
        <label class="control-label">迷宫边长</label>
        <div class="size-selector">
          <input
            v-model.number="selectedSize"
            type="range"
            min="10"
            max="30"
            step="2"
            class="size-slider"
            :disabled="disabled"
          />
          <span class="size-value">{{ selectedSize }} × {{ selectedSize }}</span>
        </div>
      </div>

      <!-- 按钮组 -->
      <div class="control-group">
        <button
          class="btn btn-primary"
          @click="handleStart"
          :disabled="disabled"
        >
          {{ disabled ? '游戏中...' : '生成迷宫' }}
        </button>
        <button
          class="btn btn-secondary"
          @click="handleRestart"
          :disabled="!disabled"
        >
          重新开始
        </button>
      </div>

      <!-- 风格主题 -->
      <div class="control-group theme-group">
        <label class="control-label">风格主题</label>
        <div class="theme-picker">
          <button
            v-for="t in themeNames"
            :key="t.name"
            class="theme-chip"
            :class="{ active: theme.name === t.name }"
            @click="selectTheme(t.name)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="controls-hint">
      <kbd>↑ ↓ ← →</kbd> 或 <kbd>W A S D</kbd> 控制猫咪移动
    </div>
  </div>
</template>

<style scoped>
.game-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 640px;
}

.controls-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  justify-content: center;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.control-label {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 尺寸滑块 */
.size-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.size-slider {
  width: 120px;
  accent-color: #1a1a2e;
  cursor: pointer;
}

.size-value {
  font-size: 15px;
  font-weight: 700;
  min-width: 68px;
  color: #333;
  font-variant-numeric: tabular-nums;
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

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-primary {
  background: #1a1a2e;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #2d2d4a;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #fff;
  color: #1a1a2e;
  border-color: #ccc;
}

.btn-secondary:hover:not(:disabled) {
  border-color: #1a1a2e;
  transform: translateY(-1px);
}

/* 主题选择 */
.theme-group {
  min-width: 160px;
}

.theme-picker {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

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

.theme-chip:hover {
  border-color: #999;
  color: #333;
}

.theme-chip.active {
  background: #1a1a2e;
  color: #fff;
  border-color: #1a1a2e;
}

/* 操作提示 */
.controls-hint {
  text-align: center;
  font-size: 13px;
  color: #aaa;
}

kbd {
  display: inline-block;
  padding: 1px 6px;
  font-size: 12px;
  font-family: inherit;
  background: #f0f0f0;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  margin: 0 2px;
}
</style>
