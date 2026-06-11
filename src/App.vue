<script setup lang="ts">
import { ref } from 'vue'
import GameControls from './components/GameControls.vue'
import MazeBoard from './components/MazeBoard.vue'

const mazeSize = ref(16)
const gameKey = ref(0)
const isPlaying = ref(false)

function handleStart(size: number) {
  mazeSize.value = size
  gameKey.value++
  isPlaying.value = true
}

function handleRestart() {
  gameKey.value++
}

function handleWon(moves: number, time: number) {
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
      :size="mazeSize"
      :disabled="isPlaying"
      @start="handleStart"
      @restart="handleRestart"
    />

    <MazeBoard
      :key="gameKey"
      :size="mazeSize"
      @won="handleWon"
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
