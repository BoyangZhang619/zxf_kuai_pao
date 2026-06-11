<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Cell, Position, Direction, GamePhase } from '../types/maze'
import type { StyleTheme } from '../types/maze'
import { generateMaze, canMove } from '../composables/useMazeGenerator'
import { useStyle } from '../composables/useStyle'

const props = defineProps<{
  size: number
}>()

const emit = defineEmits<{
  won: [moves: number, time: number]
}>()

const { theme } = useStyle()

// ============ 游戏状态 ============
const phase = ref<GamePhase>('playing')
const maze = ref<Cell[][]>([])
const playerPos = ref<Position>({ row: 0, col: 0 })
const goalPos = ref<Position>({ row: props.size - 1, col: props.size - 1 })
const moves = ref(0)
const startTime = ref(0)
const endTime = ref(0)
const trail = ref<Set<string>>(new Set())
const hasWon = ref(false)

const elapsed = ref('00:00')

let timerInterval: ReturnType<typeof setInterval> | null = null

// ============ 迷宫中所有可用的方向常量 ============
const ALL_DIRS: { key: Direction; dr: number; dc: number }[] = [
  { key: 'up', dr: -1, dc: 0 },
  { key: 'down', dr: 1, dc: 0 },
  { key: 'left', dr: 0, dc: -1 },
  { key: 'right', dr: 0, dc: 1 },
]

// ============ 初始化游戏 ============
function initGame() {
  const result = generateMaze(props.size)
  maze.value = result.maze
  playerPos.value = { ...result.start }
  goalPos.value = { ...result.goal }
  moves.value = 0
  startTime.value = Date.now()
  endTime.value = 0
  trail.value = new Set()
  trail.value.add(`${result.start.row},${result.start.col}`)
  hasWon.value = false
  phase.value = 'playing'

  startTimer()
}

function startTimer() {
  stopTimer()
  timerInterval = setInterval(() => {
    if (phase.value === 'playing') {
      const sec = Math.floor((Date.now() - startTime.value) / 1000)
      const m = Math.floor(sec / 60)
      const s = sec % 60
      elapsed.value = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
    }
  }, 200)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// ============ 玩家移动 ============
function movePlayer(dir: Direction) {
  if (phase.value !== 'playing' || hasWon.value) return

  if (canMove(maze.value, playerPos.value, dir, props.size)) {
    const dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0
    const dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
    playerPos.value = {
      row: playerPos.value.row + dr,
      col: playerPos.value.col + dc,
    }
    moves.value++
    trail.value.add(`${playerPos.value.row},${playerPos.value.col}`)

    // 检查是否到达终点
    if (
      playerPos.value.row === goalPos.value.row &&
      playerPos.value.col === goalPos.value.col
    ) {
      hasWon.value = true
      phase.value = 'won'
      endTime.value = Date.now()
      stopTimer()
      const time = Math.floor((endTime.value - startTime.value) / 1000)
      setTimeout(() => {
        emit('won', moves.value, time)
      }, 600)
    }
  }
}

// ============ 键盘事件 ============
function handleKeydown(e: KeyboardEvent) {
  const keyMap: Record<string, Direction> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    W: 'up',
    s: 'down',
    S: 'down',
    a: 'left',
    A: 'left',
    d: 'right',
    D: 'right',
  }

  const dir = keyMap[e.key]
  if (dir) {
    e.preventDefault()
    movePlayer(dir)
  }
}

// ============ 格子尺寸响应式计算 ============
const boardSizePx = computed(() => {
  // 自适应：取 viewport 宽高较小者来适配
  const maxBoard = Math.min(window.innerWidth - 40, window.innerHeight - 240, 640)
  return Math.floor(maxBoard / props.size) * props.size
})

const cellSizePx = computed(() => {
  return boardSizePx.value / props.size
})

// ============ 格子的 CSS 类（隐藏墙体 → 透明 border） ============
function cellClasses(cell: Cell): Record<string, boolean> {
  const classes: Record<string, boolean> = {
    'maze-cell': true,
  }
  if (!cell.walls.top) classes['no-top'] = true
  if (!cell.walls.right) classes['no-right'] = true
  if (!cell.walls.bottom) classes['no-bottom'] = true
  if (!cell.walls.left) classes['no-left'] = true
  return classes
}

function isOnTrail(row: number, col: number): boolean {
  return trail.value.has(`${row},${col}`)
}

// ============ 生命周期 ============
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  initGame()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  stopTimer()
})

// 尺寸变化时重新生成
watch(() => props.size, () => {
  initGame()
})

defineExpose({ initGame })
</script>

<template>
  <div class="maze-game" :style="{ '--cell-size': cellSizePx + 'px' }">
    <!-- HUD 信息栏 -->
    <div class="maze-hud">
      <div class="hud-item">
        <span class="hud-label">步数</span>
        <span class="hud-value">{{ moves }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">时间</span>
        <span class="hud-value">{{ elapsed }}</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">迷宫大小</span>
        <span class="hud-value">{{ size }}×{{ size }}</span>
      </div>
    </div>

    <!-- 迷宫棋盘 -->
    <div
      v-if="maze.length > 0"
      class="maze-board"
      :style="{
        width: boardSizePx + 'px',
        height: boardSizePx + 'px',
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
        '--path-color': theme.pathColor,
        '--trail-color': theme.trailColor,
      }"
    >
      <template v-for="r in size" :key="'row-' + r">
        <div
          v-for="c in size"
          :key="'cell-' + r + '-' + c"
          :class="cellClasses(maze[r - 1][c - 1])"
          :style="{
            '--wall-color': theme.wallColor,
          }"
        >
          <!-- 已走过的路径标记 -->
          <div
            v-if="isOnTrail(r - 1, c - 1)"
            class="trail-mark"
          />

          <!-- 玩家（猫）方块 -->
          <div
            v-if="playerPos.row === r - 1 && playerPos.col === c - 1"
            class="player-block"
            :style="{ '--player-color': theme.playerColor }"
          >
            🐱
          </div>

          <!-- 目标（老鼠）方块 -->
          <div
            v-if="goalPos.row === r - 1 && goalPos.col === c - 1 && !(playerPos.row === r - 1 && playerPos.col === c - 1)"
            class="goal-block"
            :style="{ '--goal-color': theme.goalColor }"
          >
            🐭
          </div>
        </div>
      </template>
    </div>

    <!-- 胜利提示 -->
    <Transition name="fade">
      <div v-if="hasWon" class="win-overlay">
        <div class="win-card">
          <h2>🎉 抓住了！</h2>
          <p>猫咪成功抓住了老鼠！</p>
          <div class="win-stats">
            <div>
              <strong>{{ moves }}</strong>
              <small>步数</small>
            </div>
            <div>
              <strong>{{ elapsed }}</strong>
              <small>用时</small>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.maze-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  position: relative;
}

/* ===== HUD ===== */
.maze-hud {
  display: flex;
  gap: 24px;
  padding: 8px 20px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.hud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 52px;
}

.hud-label {
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hud-value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  font-variant-numeric: tabular-nums;
}

/* ===== 棋盘 ===== */
.maze-board {
  display: grid;
  background: var(--path-color);
  border: 2px solid #1a1a2e;
  border-radius: 2px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

/* ===== 单元格 ===== */
.maze-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border-top: 1px solid var(--wall-color);
  border-right: 1px solid var(--wall-color);
  border-bottom: 1px solid var(--wall-color);
  border-left: 1px solid var(--wall-color);
}

.maze-cell.no-top {
  border-top-color: transparent;
}

.maze-cell.no-right {
  border-right-color: transparent;
}

.maze-cell.no-bottom {
  border-bottom-color: transparent;
}

.maze-cell.no-left {
  border-left-color: transparent;
}

/* 路径追踪 */
.trail-mark {
  position: absolute;
  inset: 1px;
  background: var(--trail-color);
  border-radius: 2px;
  pointer-events: none;
}

/* 玩家 */
.player-block {
  position: absolute;
  inset: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--cell-size) * 0.55);
  z-index: 2;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.25));
  animation: player-bob 0.4s ease-in-out;
}

/* 目标 */
.goal-block {
  position: absolute;
  inset: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--cell-size) * 0.5);
  z-index: 1;
  opacity: 0.8;
}

@keyframes player-bob {
  0% {
    transform: scale(0.6);
  }
  60% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

/* ===== 胜利弹层 ===== */
.win-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  z-index: 10;
}

.win-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px 36px;
  text-align: center;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
}

.win-card h2 {
  margin: 0 0 6px;
  font-size: 24px;
}

.win-card p {
  color: #666;
  margin: 0 0 16px;
}

.win-stats {
  display: flex;
  gap: 32px;
  justify-content: center;
}

.win-stats div {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.win-stats strong {
  font-size: 28px;
  color: #333;
}

.win-stats small {
  font-size: 12px;
  color: #999;
}

/* ===== Transition ===== */
.fade-enter-active {
  transition: opacity 0.4s ease;
}
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
