<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Cell, Position, Direction, GamePhase, GameConfig } from '../types/maze'
import { generateMaze, canMove, dijkstraNextStep, movePosition } from '../composables/useMazeGenerator'
import { useStyle } from '../composables/useStyle'

const props = defineProps<{ config: GameConfig }>()
const emit = defineEmits<{
  won: [moves: number, time: number]
  caught: [moves: number]
}>()

const { theme } = useStyle()

// ============ 游戏状态 ============
const phase = ref<GamePhase>('playing')
const maze = ref<Cell[][]>([])
const mousePos = ref<Position>({ row: 0, col: 0 })
const exitPos = ref<Position>({ row: 0, col: 0 })
const catPos = ref<Position | null>(null)
const catActive = ref(false)
const moves = ref(0)
const startTime = ref(0)
const endTime = ref(0)
const trail = ref<Set<string>>(new Set())
const trapSet = ref<Set<string>>(new Set())
const elapsed = ref('00:00')
const gameOverMessage = ref('')
const firstMoveMade = ref(false)

// 陷阱停滞计时
const mouseStunnedUntil = ref(0)
const catStunnedUntil = ref(0)

// 陷阱权重 = 1 + ceil(stunDuration / moveInterval)
const trapWeight = computed(() => {
  return 1 + Math.ceil(props.config.trapStunDuration / Math.max(0.1, props.config.catMoveInterval))
})

let catTimer: ReturnType<typeof setInterval> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

// ============ 初始化 ============
function initGame() {
  const result = generateMaze(props.config.mazeSize, props.config.wallDensity, props.config.trapCount)
  maze.value = result.maze
  mousePos.value = { ...result.start }
  exitPos.value = { ...result.goal }
  trapSet.value = new Set(result.traps)
  catPos.value = null
  catActive.value = false
  moves.value = 0
  startTime.value = Date.now()
  endTime.value = 0
  trail.value = new Set()
  trail.value.add(`${result.start.row},${result.start.col}`)
  phase.value = 'playing'
  gameOverMessage.value = ''
  firstMoveMade.value = false
  mouseStunnedUntil.value = 0
  catStunnedUntil.value = 0
  stopCatTimer()
  startClock()
}

// ============ 时钟 ============
function startClock() {
  stopClock()
  clockTimer = setInterval(() => {
    if (phase.value === 'playing') {
      const sec = Math.floor((Date.now() - startTime.value) / 1000)
      elapsed.value = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0')
    }
  }, 200)
}
function stopClock() { if (clockTimer) { clearInterval(clockTimer); clockTimer = null } }

// ============ 猫计时器 ============
function startCatTimer() {
  stopCatTimer()
  catTimer = setInterval(() => {
    if (phase.value === 'playing' && catActive.value && catPos.value) moveCat()
  }, props.config.catMoveInterval * 1000)
}
function stopCatTimer() { if (catTimer) { clearInterval(catTimer); catTimer = null } }

// ============ 猫 AI（权重 Dijkstra） ============
function spawnCat() {
  catPos.value = { row: 0, col: 0 }
  catActive.value = true
  startCatTimer()
  moveCat()
}

function moveCat() {
  if (!catPos.value || !catActive.value || phase.value !== 'playing') return
  // 陷阱停滞检查
  if (Date.now() < catStunnedUntil.value) return

  const nextDir = dijkstraNextStep(
    maze.value, catPos.value, mousePos.value, props.config.mazeSize,
    trapSet.value, trapWeight.value,
  )
  if (nextDir) {
    catPos.value = movePosition(catPos.value, nextDir)
    // 踩到陷阱 → 停滞
    if (trapSet.value.has(`${catPos.value.row},${catPos.value.col}`)) {
      catStunnedUntil.value = Date.now() + props.config.trapStunDuration * 1000
    }
    if (catPos.value.row === mousePos.value.row && catPos.value.col === mousePos.value.col) {
      triggerCaught()
    }
  }
}

// ============ 老鼠移动 ============
function moveMouse(dir: Direction) {
  if (phase.value !== 'playing') return
  // 陷阱停滞检查
  if (Date.now() < mouseStunnedUntil.value) return

  if (canMove(maze.value, mousePos.value, dir, props.config.mazeSize)) {
    mousePos.value = movePosition(mousePos.value, dir)
    moves.value++
    trail.value.add(`${mousePos.value.row},${mousePos.value.col}`)
    firstMoveMade.value = true

    // 踩到陷阱 → 停滞
    if (trapSet.value.has(`${mousePos.value.row},${mousePos.value.col}`)) {
      mouseStunnedUntil.value = Date.now() + props.config.trapStunDuration * 1000
    }

    if (!catActive.value && moves.value >= props.config.catSpawnDelay) spawnCat()

    if (catPos.value && catPos.value.row === mousePos.value.row && catPos.value.col === mousePos.value.col) {
      triggerCaught(); return
    }
    if (mousePos.value.row === exitPos.value.row && mousePos.value.col === exitPos.value.col) {
      triggerWin()
    }
  }
}

function triggerWin() {
  phase.value = 'won'; endTime.value = Date.now()
  stopCatTimer(); stopClock()
  gameOverMessage.value = '老鼠成功逃出迷宫！'
  setTimeout(() => emit('won', moves.value, Math.floor((endTime.value - startTime.value) / 1000)), 600)
}
function triggerCaught() {
  phase.value = 'caught'; endTime.value = Date.now()
  stopCatTimer(); stopClock()
  gameOverMessage.value = '猫抓住了老鼠！'
  setTimeout(() => emit('caught', moves.value), 600)
}

// ============ 键盘 ============
function handleKeydown(e: KeyboardEvent) {
  const km: Record<string, Direction> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
  }
  const dir = km[e.key]
  if (dir) { e.preventDefault(); moveMouse(dir) }
}

// ============ 渲染计算 ============
const boardSizePx = computed(() => {
  const max = Math.min(window.innerWidth - 40, window.innerHeight - 260, 640)
  return Math.floor(max / props.config.mazeSize) * props.config.mazeSize
})
const cellSizePx = computed(() => boardSizePx.value / props.config.mazeSize)

function cellClasses(cell: Cell) {
  return {
    'maze-cell': true,
    'no-top': !cell.walls.top, 'no-right': !cell.walls.right,
    'no-bottom': !cell.walls.bottom, 'no-left': !cell.walls.left,
  }
}
function isOnTrail(r: number, c: number) { return trail.value.has(`${r},${c}`) }
function isTrap(r: number, c: number) { return trapSet.value.has(`${r},${c}`) }
function isGoal(r: number, c: number) { return exitPos.value.row === r && exitPos.value.col === c }
function isMouseStunned() { return Date.now() < mouseStunnedUntil.value }
function isCatStunned() { return Date.now() < catStunnedUntil.value }

onMounted(() => { window.addEventListener('keydown', handleKeydown); initGame() })
onUnmounted(() => { window.removeEventListener('keydown', handleKeydown); stopCatTimer(); stopClock() })
watch(() => props.config, () => initGame(), { deep: true })
defineExpose({ initGame })
</script>

<template>
  <div class="maze-game" :style="{ '--cell-size': cellSizePx + 'px' }">
    <!-- HUD -->
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
        <span class="hud-label cat-indicator" :class="{ active: catActive }">
          {{ catActive ? '🐱 追击中' : '😴 猫未醒' }}
        </span>
        <span class="hud-value hud-small">
          {{ catActive ? '第' + moves + '步激活' : moves + '/' + config.catSpawnDelay }}
        </span>
      </div>
      <div v-if="trapSet.size > 0" class="hud-item">
        <span class="hud-label">陷阱</span>
        <span class="hud-value hud-small">{{ trapSet.size }}个 · 停滞{{ config.trapStunDuration }}s</span>
      </div>
    </div>

    <!-- 棋盘 -->
    <div class="maze-board-wrap">
      <!-- 战争迷雾 -->
      <div v-if="!firstMoveMade" class="fog-overlay">
        <span>走出第一步探索迷宫...</span>
      </div>

      <div
        v-if="maze.length > 0"
        class="maze-board"
        :class="{ blurred: !firstMoveMade }"
        :style="{
          width: boardSizePx + 'px', height: boardSizePx + 'px',
          gridTemplateColumns: `repeat(${config.mazeSize}, 1fr)`,
          gridTemplateRows: `repeat(${config.mazeSize}, 1fr)`,
        }"
      >
        <template v-for="r in config.mazeSize" :key="'row-' + r">
          <div
            v-for="c in config.mazeSize"
            :key="'cell-' + r + '-' + c"
            :class="cellClasses(maze[r - 1][c - 1])"
          >
            <!-- 路径痕迹 -->
            <div v-if="isOnTrail(r - 1, c - 1)" class="trail-mark" />

            <!-- 陷阱 -->
            <div v-if="isTrap(r - 1, c - 1)" class="trap-mark">⚡</div>

            <!-- 出口 -->
            <div v-if="isGoal(r - 1, c - 1)" class="exit-cell">🚪</div>

            <!-- 老鼠 -->
            <div
              v-if="mousePos.row === r - 1 && mousePos.col === c - 1"
              class="mouse-block"
              :class="{ stunned: isMouseStunned() }"
              :title="isMouseStunned() ? '被陷阱困住！' : ''"
            >
              🐭
            </div>

            <!-- 猫 -->
            <div
              v-if="catPos && catPos.row === r - 1 && catPos.col === c - 1 && !(mousePos.row === r - 1 && mousePos.col === c - 1)"
              class="cat-block"
              :class="{ stunned: isCatStunned() }"
              :title="isCatStunned() ? '猫被陷阱困住！' : ''"
            >
              🐱
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 状态标签 -->
    <div v-if="isMouseStunned() && firstMoveMade" class="status-toast">
      ⚡ 老鼠被陷阱困住 {{ config.trapStunDuration }} 秒！
    </div>

    <!-- 游戏结束 -->
    <Transition name="fade">
      <div v-if="phase === 'won' || phase === 'caught'" class="overlay">
        <div class="overlay-card" :class="phase">
          <h2>{{ phase === 'won' ? '🎉 逃脱成功！' : '😿 被抓住了！' }}</h2>
          <p>{{ gameOverMessage }}</p>
          <div class="overlay-stats">
            <div><strong>{{ moves }}</strong><small>步数</small></div>
            <div><strong>{{ elapsed }}</strong><small>用时</small></div>
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
  display: flex; gap: 20px;
  padding: 8px 20px;
  background: var(--maze-path, #f8f9fa);
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  flex-wrap: wrap; justify-content: center;
}
.hud-item { display: flex; flex-direction: column; align-items: center; min-width: 56px; }
.hud-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
.hud-label.cat-indicator.active { color: #e05a3d; font-weight: 700; }
.hud-value { font-size: 18px; font-weight: 700; color: #333; font-variant-numeric: tabular-nums; }
.hud-small { font-size: 13px; font-weight: 500; color: #888; }

/* ===== 棋盘外框 ===== */
.maze-board-wrap { position: relative; }

.fog-overlay {
  position: absolute; inset: 0; z-index: 5;
  display: flex; align-items: center; justify-content: center;
  color: #999; font-size: 15px; font-weight: 600;
  pointer-events: none;
}

.maze-board {
  display: grid;
  background: var(--maze-path, #f8f9fa);
  border: 2px solid var(--maze-wall, #1a1a2e);
  border-radius: 2px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.1);
  position: relative; overflow: hidden;
  transition: filter 0.5s ease;
}
.maze-board.blurred { filter: blur(12px); }

/* ===== 单元格 ===== */
.maze-cell {
  width: var(--cell-size); height: var(--cell-size);
  position: relative; display: flex; align-items: center; justify-content: center;
  box-sizing: border-box;
  border-top: 1px solid var(--maze-wall, #1a1a2e);
  border-right: 1px solid var(--maze-wall, #1a1a2e);
  border-bottom: 1px solid var(--maze-wall, #1a1a2e);
  border-left: 1px solid var(--maze-wall, #1a1a2e);
}
.maze-cell.no-top    { border-top-color:    transparent; }
.maze-cell.no-right  { border-right-color:  transparent; }
.maze-cell.no-bottom { border-bottom-color: transparent; }
.maze-cell.no-left   { border-left-color:   transparent; }

.trail-mark {
  position: absolute; inset: 1px;
  background: var(--maze-trail, rgba(74,144,217,0.12));
  border-radius: 2px; pointer-events: none;
}

/* 陷阱 */
.trap-mark {
  position: absolute; inset: 2px; z-index: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: calc(var(--cell-size) * 0.4);
  opacity: 0.55;
  pointer-events: none;
}

/* 实体 */
.mouse-block, .cat-block, .exit-cell {
  position: absolute; inset: 2px;
  display: flex; align-items: center; justify-content: center;
  z-index: 2;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));
}
.mouse-block { font-size: calc(var(--cell-size) * 0.55); animation: pop-in 0.35s ease; }
.mouse-block.stunned { filter: drop-shadow(0 0 6px var(--maze-trap, #e74c3c)); animation: shake 0.3s infinite; }
.cat-block   { font-size: calc(var(--cell-size) * 0.55); z-index: 3; animation: pop-in 0.3s ease; }
.cat-block.stunned { filter: drop-shadow(0 0 6px var(--maze-trap, #e74c3c)); animation: shake 0.3s infinite; }
.exit-cell   { font-size: calc(var(--cell-size) * 0.5); z-index: 1; opacity: 0.7; }

@keyframes pop-in {
  0% { transform: scale(0.5); } 70% { transform: scale(1.12); } 100% { transform: scale(1); }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* 状态提示 */
.status-toast {
  font-size: 13px; font-weight: 600; color: var(--maze-trap, #e74c3c);
  padding: 6px 18px; background: #fff; border-radius: 20px;
  border: 1px solid var(--maze-trap, #e74c3c);
  animation: pulse 0.8s infinite alternate;
}
@keyframes pulse { from { opacity: 0.7; } to { opacity: 1; } }

/* 弹层 */
.overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.72); backdrop-filter: blur(4px);
  border-radius: 4px; z-index: 10;
}
.overlay-card {
  background: #fff; border-radius: 16px; padding: 28px 36px;
  text-align: center; box-shadow: 0 8px 40px rgba(0,0,0,0.15);
}
.overlay-card h2 { margin: 0 0 6px; font-size: 24px; }
.overlay-card p  { color: #666; margin: 0 0 16px; }
.overlay-card.won { border: 2px solid var(--maze-exit, #4caf50); }
.overlay-card.caught { border: 2px solid var(--maze-cat, #e05a3d); }
.overlay-stats { display: flex; gap: 32px; justify-content: center; }
.overlay-stats strong { font-size: 28px; color: #333; }
.overlay-stats small  { font-size: 12px; color: #999; display: block; }

.fade-enter-active { transition: opacity 0.4s ease; }
.fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
