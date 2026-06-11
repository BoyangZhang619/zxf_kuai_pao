<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { GameConfig } from './types/maze'
import GameControls from './components/GameControls.vue'
import MazeBoard from './components/MazeBoard.vue'
import SettingsPanel from './components/SettingsPanel.vue'

// ============ 默认配置 ============
const defaultConfig: GameConfig = {
  catSpawnDelay: 5,
  catMoveInterval: 0.5,
  mazeSize: 16,
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
</script>

<template>
  <div class="app-root">
    <header class="app-header">
      <h1>🐱 猫抓老鼠 🐭</h1>
      <p class="app-subtitle">迷宫追逐 · 简约风格</p>
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
  gap: 18px;
  padding: 20px 16px 40px;
  min-height: 100vh;
  box-sizing: border-box;
}

.app-header {
  text-align: center;
}

.app-header h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: 1px;
  color: #1a1a2e;
}

.app-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #999;
}
</style>
