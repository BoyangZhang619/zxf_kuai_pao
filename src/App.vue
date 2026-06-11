<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { GameConfig, Direction } from './types/maze'
import GameControls from './components/GameControls.vue'
import MazeBoard from './components/MazeBoard.vue'
import SettingsPanel from './components/SettingsPanel.vue'

// ============ 检测触屏设备 ============
const isTouchDevice =
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent)

// ============ 默认配置 ============
const defaultConfig: GameConfig = {
  catSpawnDelay: 5,
  catMoveInterval: 0.5,
  mazeSize: 16,
  wallDensity: 60,
  trapCount: 4,
  trapStunDuration: 1,
  jerkyCount: 3,
  sugarWaterCount: 3,
}

const config = reactive<GameConfig>({ ...defaultConfig })
const gameKey = ref(0)
const isPlaying = ref(false)
const showSettings = ref(false)

// ============ 操作 ============
function handleStart() {
  gameKey.value++
  isPlaying.value = true
}

function handleRestart() {
  gameKey.value++
}

function handleApply(newConfig: GameConfig) {
  Object.assign(config, newConfig)
  gameKey.value++
  isPlaying.value = false
}

function handleGameOver() {
  isPlaying.value = false
}

// ============ 移动端方向键 ============
function tapDir(dir: Direction) {
  const keyMap: Record<Direction, string> = {
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { code: keyMap[dir], key: keyMap[dir], bubbles: true }))
}
</script>

<template>
  <div class="app-root">
    <header class="app-header">
      <h1>🐱 猫抓老鼠 🐭</h1>
    </header>

    <GameControls
      :config="config"
      :disabled="isPlaying"
      @start="handleStart"
      @restart="handleRestart"
      @open-settings="showSettings = true"
    />

    <MazeBoard
      :key="gameKey"
      :config="config"
      @won="handleGameOver"
      @caught="handleGameOver"
    />

    <!-- 桌面端键盘提示（放底部） -->
    <div v-if="!isTouchDevice" class="controls-hint">
      <kbd>↑ ↓ ← →</kbd> 移动 &nbsp; <kbd>E</kbd> 拾取/饮用 &nbsp; <kbd>Q</kbd> 放下
    </div>

    <!-- 移动端十字方向键 -->
    <div v-if="isTouchDevice" class="dpad">
      <div class="dpad-row">
        <button class="dpad-btn" @pointerdown.prevent="tapDir('up')" aria-label="上">↑</button>
      </div>
      <div class="dpad-row">
        <button class="dpad-btn" @pointerdown.prevent="tapDir('left')" aria-label="左">←</button>
        <span class="dpad-center" />
        <button class="dpad-btn" @pointerdown.prevent="tapDir('right')" aria-label="右">→</button>
      </div>
      <div class="dpad-row">
        <button class="dpad-btn" @pointerdown.prevent="tapDir('down')" aria-label="下">↓</button>
      </div>
    </div>

    <SettingsPanel
      :config="config"
      :visible="showSettings"
      @close="showSettings = false"
      @apply="handleApply"
    />
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 16px 12px 28px;
  min-height: 100vh;
  min-height: 100dvh;
  box-sizing: border-box;
}

.app-header {
  text-align: center;
}

.app-header h1 {
  margin: 0;
  font-size: clamp(22px, 5vw, 28px);
  letter-spacing: 1px;
  color: #1a1a2e;
}

/* 桌面端键盘提示 */
.controls-hint {
  text-align: center;
  font-size: 13px;
  color: #aaa;
  padding-bottom: 4px;
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

/* ===== 移动端十字方向键 ===== */
.dpad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  user-select: none;
  -webkit-user-select: none;
}

.dpad-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dpad-btn {
  width: 52px;
  height: 52px;
  border: 2px solid #d0d0d0;
  border-radius: 12px;
  background: #fff;
  font-size: 22px;
  font-weight: 700;
  color: #444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.dpad-btn:active {
  background: #e8e8e8;
  border-color: #1a1a2e;
  color: #1a1a2e;
  transform: scale(0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dpad-center {
  width: 52px;
  height: 52px;
}

/* 移动端宽度自适应 */
@media (max-width: 480px) {
  .app-root {
    padding: 10px 6px 16px;
    gap: 10px;
  }

  .dpad-btn {
    width: 46px;
    height: 46px;
    font-size: 20px;
    border-radius: 10px;
  }

  .dpad-center {
    width: 46px;
    height: 46px;
  }
}
</style>
