<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { GameConfig, Direction } from './types/maze'
import GameControls from './components/GameControls.vue'
import MazeBoard from './components/MazeBoard.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { gameInfo } from './composables/useGameInfo'

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

function handleStart() { gameKey.value++; isPlaying.value = true }
function handleRestart() { gameKey.value++ }
function handleApply(newConfig: GameConfig) { Object.assign(config, newConfig); gameKey.value++; isPlaying.value = false }
function handleGameOver() { isPlaying.value = false }

// ============ 移动端方向键 ============
function tapDir(dir: Direction) {
  const keyMap: Record<Direction, string> = {
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { code: keyMap[dir], key: keyMap[dir], bubbles: true }))
}
</script>

<template>
  <div class="app-root" :class="{ mobile: isTouchDevice }">
    <header class="app-header">
      <h1>张雪峰快跑</h1>
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

    <!-- 桌面端键盘提示 -->
    <div v-if="!isTouchDevice" class="controls-hint">
      <kbd>↑ ↓ ← →</kbd> 移动 &nbsp; <kbd>E</kbd> 拾取/饮用 &nbsp; <kbd>Q</kbd> 放下
    </div>

    <!-- 移动端固定底部栏 -->
    <div v-if="isTouchDevice" class="mobile-bar">
      <!-- 左侧：方向键 -->
      <div class="mobile-left">
        <div class="dpad">
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
      </div>

      <!-- 中间：道具操作按钮（MazeBoard Teleport 到这里） -->
      <div id="mobile-actions" class="mobile-actions" />

      <!-- 右侧：游戏信息 -->
      <div class="mobile-info">
        <div class="mi-row">
          <span class="mi-label">步数</span>
          <span class="mi-value">{{ gameInfo.moves }}</span>
        </div>
        <div class="mi-row">
          <span class="mi-label">时间</span>
          <span class="mi-value">{{ gameInfo.elapsed }}</span>
        </div>
        <div class="mi-row">
          <span class="mi-label mi-status">
            <template v-if="gameInfo.catPhasing">👻穿墙</template>
            <template v-else-if="gameInfo.catEating">🍖进食</template>
            <template v-else-if="gameInfo.catSpeedy">⚡加速</template>
            <template v-else-if="gameInfo.catActive">追击中</template>
            <template v-else>😴未醒</template>
          </span>
        </div>
        <div class="mi-row" v-if="gameInfo.inventory">
          <span class="mi-badge">📦 持有</span>
        </div>
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
  gap: 10px;
  padding: 12px 8px 20px;
  height: 100%;
  box-sizing: border-box;
}

.app-root.mobile {
  padding-bottom: 150px;
}

.app-header { text-align: center; }
.app-header h1 {
  margin: 0;
  font-size: clamp(20px, 5vw, 26px);
  letter-spacing: 1px;
  color: #1a1a2e;
}

/* 桌面端键盘提示 */
.controls-hint {
  text-align: center; font-size: 13px; color: #aaa; padding-bottom: 4px;
}
kbd {
  display: inline-block; padding: 1px 6px; font-size: 12px; font-family: inherit;
  background: #f0f0f0; border: 1px solid #d0d0d0; border-radius: 4px; margin: 0 2px;
}

/* ===== 移动端固定底部栏 ===== */
.mobile-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  border-top: 1px solid #e0e0e0;
  z-index: 50;
  gap: 6px;
  user-select: none;
  -webkit-user-select: none;
}

.mobile-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* 方向键 */
.dpad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.dpad-row { display: flex; align-items: center; gap: 2px; }
.dpad-btn {
  width: 42px; height: 42px;
  border: 2px solid #d0d0d0; border-radius: 10px;
  background: #fff; font-size: 18px; font-weight: 700; color: #444;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.1s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.dpad-btn:active { background: #e8e8e8; border-color: #1a1a2e; color: #1a1a2e; transform: scale(0.9); }
.dpad-center { width: 42px; height: 42px; }

/* 道具按钮区域 */
.mobile-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

/* 右侧信息 */
.mobile-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  flex-shrink: 0;
  min-width: 64px;
  padding-right: 4px;
}
.mi-row { display: flex; align-items: center; gap: 4px; }
.mi-label { font-size: 10px; color: #999; text-transform: uppercase; }
.mi-value { font-size: 15px; font-weight: 700; color: #333; font-variant-numeric: tabular-nums; }
.mi-status { font-size: 11px; color: #666; }
.mi-badge { font-size: 11px; font-weight: 600; color: #f39800; background: #fff8f0; padding: 2px 8px; border-radius: 10px; border: 1px solid #f0d8a0; }
</style>
