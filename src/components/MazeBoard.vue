<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Cell, Position, Direction, GamePhase, GameConfig, GroundItem, ItemType, CatBuffs } from '../types/maze'
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
const groundItems = ref<GroundItem[]>([])
const inventory = ref<ItemType | null>(null)
const elapsed = ref('00:00')
const gameOverMessage = ref('')
const firstMoveMade = ref(false)

// 停滞与 buff
const mouseStunnedUntil = ref(0)
const catStunnedUntil = ref(0)
const catBuffs = ref<CatBuffs>({ speedBoostUntil: 0, wallPhaseUntil: 0, eatingUntil: 0 })
const mouseVisionUntil = ref(0)

// 猫速度倍率
const catSpeedMultiplier = computed(() => catBuffs.value.speedBoostUntil > Date.now() ? 2 : 1)
const trapWeight = computed(() => 1 + Math.ceil(props.config.trapStunDuration / Math.max(0.1, props.config.catMoveInterval)))

let catTimer: ReturnType<typeof setTimeout> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

// ============ 初始化 ============
function initGame() {
  const result = generateMaze(
    props.config.mazeSize, props.config.wallDensity, props.config.trapCount,
    props.config.jerkyCount, props.config.sugarWaterCount,
  )
  maze.value = result.maze
  mousePos.value = { ...result.start }
  exitPos.value = { ...result.goal }
  trapSet.value = new Set(result.traps)
  groundItems.value = result.items
  inventory.value = null
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
  catBuffs.value = { speedBoostUntil: 0, wallPhaseUntil: 0, eatingUntil: 0 }
  mouseVisionUntil.value = 0
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

// ============ 猫计时器（动态间隔） ============
function scheduleCatMove() {
  if (phase.value !== 'playing' || !catActive.value) return
  if (catBuffs.value.eatingUntil > Date.now()) {
    // 进食中，等进食结束后再排程
    catTimer = setTimeout(() => scheduleCatMove(), 200)
    return
  }
  const interval = (props.config.catMoveInterval / catSpeedMultiplier.value) * 1000
  catTimer = setTimeout(() => {
    moveCat()
    scheduleCatMove()
  }, interval)
}
function stopCatTimer() { if (catTimer) { clearTimeout(catTimer); catTimer = null } }

// ============ 猫 AI ============
function spawnCat() {
  catPos.value = { row: 0, col: 0 }
  catActive.value = true
  scheduleCatMove()
  moveCat()
}

function moveCat() {
  if (!catPos.value || !catActive.value || phase.value !== 'playing') return
  if (Date.now() < catStunnedUntil.value) return
  if (Date.now() < catBuffs.value.eatingUntil) return

  const now = Date.now()

  // 穿墙模式：无视墙壁直接向老鼠移动
  if (now < catBuffs.value.wallPhaseUntil) {
    const dr = mousePos.value.row - catPos.value.row
    const dc = mousePos.value.col - catPos.value.col
    const dirs: Direction[] = Math.abs(dc) >= Math.abs(dr)
      ? (dc > 0 ? ['right', 'left'] : ['left', 'right']) as Direction[]
      : (dr > 0 ? ['down', 'up'] : ['up', 'down']) as Direction[]
    for (const dir of dirs) {
      const next = movePosition(catPos.value, dir)
      if (next.row >= 0 && next.row < props.config.mazeSize && next.col >= 0 && next.col < props.config.mazeSize) {
        catPos.value = next
        break
      }
    }
  } else {
    // 正常 Dijkstra
    const nextDir = dijkstraNextStep(
      maze.value, catPos.value, mousePos.value, props.config.mazeSize,
      trapSet.value, trapWeight.value,
    )
    if (nextDir) catPos.value = movePosition(catPos.value, nextDir)
  }

  if (!catPos.value) return

  // 踩陷阱
  if (trapSet.value.has(`${catPos.value.row},${catPos.value.col}`)) {
    catStunnedUntil.value = now + props.config.trapStunDuration * 1000
  }

  // 遇到道具
  checkCatItem()

  // 抓到老鼠？
  if (catPos.value.row === mousePos.value.row && catPos.value.col === mousePos.value.col) {
    triggerCaught()
  }
}

function checkCatItem() {
  if (!catPos.value) return
  const idx = groundItems.value.findIndex(it => it.row === catPos.value!.row && it.col === catPos.value!.col)
  if (idx === -1) return
  const item = groundItems.value[idx]
  groundItems.value.splice(idx, 1)
  const now = Date.now()

  if (item.type === 'jerky') {
    // 猫吃肉干：停3秒 + 5秒双倍速
    catBuffs.value.eatingUntil = now + 3000
    catBuffs.value.speedBoostUntil = Math.max(catBuffs.value.speedBoostUntil, now) + 5000 // 可叠加
  } else if (item.type === 'sugarWater') {
    // 猫喝糖水：穿墙1秒
    catBuffs.value.wallPhaseUntil = Math.max(catBuffs.value.wallPhaseUntil, now) + 1000
  }
}

// ============ 老鼠移动 & 道具 ============
function moveMouse(dir: Direction) {
  if (phase.value !== 'playing') return
  if (Date.now() < mouseStunnedUntil.value) return

  if (canMove(maze.value, mousePos.value, dir, props.config.mazeSize)) {
    mousePos.value = movePosition(mousePos.value, dir)
    moves.value++
    trail.value.add(`${mousePos.value.row},${mousePos.value.col}`)
    firstMoveMade.value = true

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

// ---- 老鼠道具操作 ----
function pickupItem() {
  if (inventory.value) return
  const idx = groundItems.value.findIndex(it => it.row === mousePos.value.row && it.col === mousePos.value.col)
  if (idx === -1 || groundItems.value[idx].type !== 'jerky') return
  inventory.value = 'jerky'
  groundItems.value.splice(idx, 1)
}

function dropItem() {
  if (!inventory.value) return
  // 不能放在有东西的格子上
  const occupied = groundItems.value.some(it => it.row === mousePos.value.row && it.col === mousePos.value.col)
  if (occupied) return
  groundItems.value.push({ type: inventory.value, row: mousePos.value.row, col: mousePos.value.col })
  inventory.value = null
}

function drinkSugarWater() {
  const idx = groundItems.value.findIndex(it => it.row === mousePos.value.row && it.col === mousePos.value.col && it.type === 'sugarWater')
  if (idx === -1) return
  groundItems.value.splice(idx, 1)

  // 消除 5×5 内随机 5 面墙
  destroyWalls5x5()

  // 视野缩小 1 秒
  mouseVisionUntil.value = Date.now() + 1000
}

function destroyWalls5x5() {
  const { row, col } = mousePos.value
  const size = props.config.mazeSize
  const wallCandidates: { cell: Cell; dir: Direction; neighbor: Cell }[] = []

  for (let r = Math.max(0, row - 2); r <= Math.min(size - 1, row + 2); r++) {
    for (let c = Math.max(0, col - 2); c <= Math.min(size - 1, col + 2); c++) {
      const cell = maze.value[r][c]
      if (c < size - 1 && cell.walls.right) {
        wallCandidates.push({ cell, dir: 'right', neighbor: maze.value[r][c + 1] })
      }
      if (r < size - 1 && cell.walls.bottom) {
        wallCandidates.push({ cell, dir: 'down', neighbor: maze.value[r + 1][c] })
      }
    }
  }

  // Fisher-Yates shuffle + pick 5
  for (let i = wallCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[wallCandidates[i], wallCandidates[j]] = [wallCandidates[j], wallCandidates[i]]
  }
  const toRemove = wallCandidates.slice(0, 5)

  for (const { cell, dir, neighbor } of toRemove) {
    switch (dir) {
      case 'right': cell.walls.right = false; neighbor.walls.left = false; break
      case 'down': cell.walls.bottom = false; neighbor.walls.top = false; break
    }
  }
}

// ============ 胜利/失败 ============
function triggerWin() {
  phase.value = 'won'; endTime.value = Date.now(); stopCatTimer(); stopClock()
  gameOverMessage.value = '老鼠成功逃出迷宫！'
  setTimeout(() => emit('won', moves.value, Math.floor((endTime.value - startTime.value) / 1000)), 600)
}
function triggerCaught() {
  phase.value = 'caught'; endTime.value = Date.now(); stopCatTimer(); stopClock()
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

// ============ 渲染辅助 ============
const boardSizePx = computed(() => {
  const max = Math.min(window.innerWidth - 40, window.innerHeight - 290, 640)
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
function isGroundItem(r: number, c: number) { return groundItems.value.some(it => it.row === r && it.col === c) }
function getGroundItem(r: number, c: number) { return groundItems.value.find(it => it.row === r && it.col === c) }
function isMouseStunned() { return Date.now() < mouseStunnedUntil.value }
function isCatStunned() { return Date.now() < catStunnedUntil.value }
function isCatEating() { return Date.now() < catBuffs.value.eatingUntil }
function hasCatSpeed() { return Date.now() < catBuffs.value.speedBoostUntil }
function hasCatWallPhase() { return Date.now() < catBuffs.value.wallPhaseUntil }
function isVisionReduced() { return Date.now() < mouseVisionUntil.value }
function canPickup() { return !inventory.value && groundItems.value.some(it => it.row === mousePos.value.row && it.col === mousePos.value.col && it.type === 'jerky') }
function canDrop() { return !!inventory.value && !groundItems.value.some(it => it.row === mousePos.value.row && it.col === mousePos.value.col) }
function canDrink() { return groundItems.value.some(it => it.row === mousePos.value.row && it.col === mousePos.value.col && it.type === 'sugarWater') }

// 视野遮罩位置
const visionMaskStyle = computed(() => {
  if (!isVisionReduced()) return { display: 'none' }
  const cx = (mousePos.value.col + 0.5) * cellSizePx.value
  const cy = (mousePos.value.row + 0.5) * cellSizePx.value
  const r = 2.5 * cellSizePx.value
  return {
    background: `radial-gradient(circle ${r}px at ${cx}px ${cy}px, transparent 0%, transparent 48%, rgba(0,0,0,0.85) 50%)`,
  }
})

onMounted(() => { window.addEventListener('keydown', handleKeydown); initGame() })
onUnmounted(() => { window.removeEventListener('keydown', handleKeydown); stopCatTimer(); stopClock() })
watch(() => props.config, () => initGame(), { deep: true })
defineExpose({ initGame, pickupItem, dropItem, drinkSugarWater })
</script>

<template>
  <div class="maze-game" :style="{ '--cell-size': cellSizePx + 'px' }">
    <!-- HUD -->
    <div class="maze-hud">
      <div class="hud-item"><span class="hud-label">步数</span><span class="hud-value">{{ moves }}</span></div>
      <div class="hud-item"><span class="hud-label">时间</span><span class="hud-value">{{ elapsed }}</span></div>
      <div class="hud-item">
        <span class="hud-label cat-indicator" :class="{ active: catActive }">
          <template v-if="hasCatWallPhase()">👻 猫穿墙中</template>
          <template v-else-if="isCatEating()">🍖 猫进食中</template>
          <template v-else>{{ catActive ? '🐱 追击中' : '😴 猫未醒' }}</template>
        </span>
        <span class="hud-value hud-small">
          <template v-if="hasCatSpeed()">⚡双倍速</template>
          <template v-else>{{ catActive ? '第' + moves + '步激活' : moves + '/' + config.catSpawnDelay }}</template>
        </span>
      </div>
      <div class="hud-item" v-if="inventory || trapSet.size > 0">
        <span class="hud-label">物品栏</span>
        <span class="hud-value hud-small">
          {{ inventory === 'jerky' ? '🍖 肉干 [可放下]' : '空' }}
        </span>
      </div>
    </div>

    <!-- 棋盘 -->
    <div class="maze-board-wrap">
      <div v-if="!firstMoveMade" class="fog-overlay"><span>走出第一步探索迷宫...</span></div>

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
          <div v-for="c in config.mazeSize" :key="'cell-' + r + '-' + c" :class="cellClasses(maze[r - 1][c - 1])">
            <div v-if="isOnTrail(r - 1, c - 1)" class="trail-mark" />
            <div v-if="isTrap(r - 1, c - 1)" class="trap-mark">⚡</div>
            <div v-if="isGoal(r - 1, c - 1)" class="exit-cell">🚪</div>

            <!-- 地上道具 -->
            <div v-if="isGroundItem(r - 1, c - 1) && !(mousePos.row === r - 1 && mousePos.col === c - 1) && !(catPos && catPos.row === r - 1 && catPos.col === c - 1)"
              class="item-mark" :class="getGroundItem(r - 1, c - 1)?.type">
              {{ getGroundItem(r - 1, c - 1)?.type === 'jerky' ? '🍖' : '🧪' }}
            </div>

            <div v-if="mousePos.row === r - 1 && mousePos.col === c - 1"
              class="mouse-block" :class="{ stunned: isMouseStunned() }">🐭</div>
            <div v-if="catPos && catPos.row === r - 1 && catPos.col === c - 1 && !(mousePos.row === r - 1 && mousePos.col === c - 1)"
              class="cat-block"
              :class="{ stunned: isCatStunned(), eating: isCatEating(), phasing: hasCatWallPhase(), speedy: hasCatSpeed() }">🐱</div>
          </div>
        </template>
      </div>

      <!-- 老鼠视野缩小遮罩 -->
      <div v-if="isVisionReduced()" class="vision-mask" :style="visionMaskStyle" />
    </div>

    <!-- 状态标签 -->
    <div v-if="isMouseStunned() && firstMoveMade" class="status-toast trap">⚡ 被陷阱困住！</div>
    <div v-if="isCatEating()" class="status-toast eat">🍖 猫在吃肉干 (3秒)...</div>
    <div v-if="hasCatSpeed() && !isCatEating()" class="status-toast speed">⚡ 猫双倍速中！</div>
    <div v-if="hasCatWallPhase()" class="status-toast phase">👻 猫穿墙中！</div>
    <div v-if="isVisionReduced()" class="status-toast vision">👁 视野缩小 (5×5) 1秒...</div>

    <!-- 移动端操作按钮 -->
    <div v-if="'ontouchstart' in window || navigator.maxTouchPoints > 0" class="action-buttons">
      <button v-if="canPickup()" class="act-btn pickup" @pointerdown.prevent="pickupItem">📦 拾取肉干</button>
      <button v-if="canDrink()" class="act-btn drink" @pointerdown.prevent="drinkSugarWater">🧪 饮用糖水</button>
      <button v-if="canDrop()" class="act-btn drop" @pointerdown.prevent="dropItem">📍 放下肉干</button>
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
.maze-game { display: flex; flex-direction: column; align-items: center; gap: 12px; position: relative; }

/* HUD */
.maze-hud { display: flex; gap: 16px; padding: 8px 18px; background: var(--maze-path, #f8f9fa); border-radius: 10px; border: 1px solid #e0e0e0; flex-wrap: wrap; justify-content: center; }
.hud-item { display: flex; flex-direction: column; align-items: center; min-width: 48px; }
.hud-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
.hud-label.cat-indicator.active { color: #e05a3d; font-weight: 700; }
.hud-value { font-size: 18px; font-weight: 700; color: #333; font-variant-numeric: tabular-nums; }
.hud-small { font-size: 12px; font-weight: 500; color: #888; }

/* 棋盘 */
.maze-board-wrap { position: relative; }
.fog-overlay { position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center; color: #999; font-size: 15px; font-weight: 600; pointer-events: none; }
.maze-board { display: grid; background: var(--maze-path, #f8f9fa); border: 2px solid var(--maze-wall, #1a1a2e); border-radius: 2px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); position: relative; overflow: hidden; transition: filter 0.5s ease; }
.maze-board.blurred { filter: blur(12px); }

.maze-cell { width: var(--cell-size); height: var(--cell-size); position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border-top: 1px solid var(--maze-wall, #1a1a2e); border-right: 1px solid var(--maze-wall, #1a1a2e); border-bottom: 1px solid var(--maze-wall, #1a1a2e); border-left: 1px solid var(--maze-wall, #1a1a2e); }
.maze-cell.no-top { border-top-color: transparent; } .maze-cell.no-right { border-right-color: transparent; }
.maze-cell.no-bottom { border-bottom-color: transparent; } .maze-cell.no-left { border-left-color: transparent; }

.trail-mark { position: absolute; inset: 1px; background: var(--maze-trail, rgba(74,144,217,0.12)); border-radius: 2px; pointer-events: none; }
.trap-mark { position: absolute; inset: 2px; z-index: 1; display: flex; align-items: center; justify-content: center; font-size: calc(var(--cell-size) * 0.4); opacity: 0.5; pointer-events: none; }

/* 地上道具 */
.item-mark { position: absolute; inset: 2px; z-index: 1; display: flex; align-items: center; justify-content: center; font-size: calc(var(--cell-size) * 0.45); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2)); pointer-events: none; }
.item-mark.jerky { animation: float 1.2s infinite alternate; }
.item-mark.sugarWater { animation: float 1.5s infinite alternate; }
@keyframes float { from { transform: translateY(0); } to { transform: translateY(-3px); } }

/* 实体 */
.mouse-block, .cat-block, .exit-cell { position: absolute; inset: 2px; display: flex; align-items: center; justify-content: center; z-index: 2; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25)); }
.mouse-block { font-size: calc(var(--cell-size) * 0.55); animation: pop-in 0.35s ease; }
.mouse-block.stunned { filter: drop-shadow(0 0 6px var(--maze-trap, #e74c3c)); animation: shake 0.3s infinite; }
.cat-block { font-size: calc(var(--cell-size) * 0.55); z-index: 3; animation: pop-in 0.3s ease; }
.cat-block.stunned { filter: drop-shadow(0 0 6px var(--maze-trap, #e74c3c)); animation: shake 0.3s infinite; }
.cat-block.eating { filter: drop-shadow(0 0 8px #f39800); animation: nom 0.5s infinite; }
.cat-block.phasing { filter: drop-shadow(0 0 10px #9b59b6); animation: phase-pulse 0.4s infinite; }
.cat-block.speedy { filter: drop-shadow(0 0 6px #e74c3c); }
.exit-cell { font-size: calc(var(--cell-size) * 0.5); z-index: 1; opacity: 0.7; }

@keyframes pop-in { 0% { transform: scale(0.5); } 70% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
@keyframes nom { 0%,100% { transform: scale(1); } 50% { transform: scale(0.85); } }
@keyframes phase-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

/* 视野遮罩 */
.vision-mask { position: absolute; inset: 0; z-index: 8; pointer-events: none; border-radius: 2px; }

/* 状态 toast */
.status-toast { font-size: 12px; font-weight: 600; padding: 4px 14px; border-radius: 20px; background: #fff; animation: pulse 0.8s infinite alternate; }
.status-toast.trap { color: var(--maze-trap, #e74c3c); border: 1px solid var(--maze-trap, #e74c3c); }
.status-toast.eat { color: #f39800; border: 1px solid #f39800; }
.status-toast.speed { color: #e74c3c; border: 1px solid #e74c3c; }
.status-toast.phase { color: #9b59b6; border: 1px solid #9b59b6; }
.status-toast.vision { color: #3498db; border: 1px solid #3498db; }
@keyframes pulse { from { opacity: 0.7; } to { opacity: 1; } }

/* 移动端操作按钮 */
.action-buttons { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.act-btn { font-size: 14px; font-weight: 600; padding: 10px 18px; border-radius: 10px; border: 2px solid transparent; cursor: pointer; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.12s; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.act-btn:active { transform: scale(0.93); }
.act-btn.pickup { border-color: #f39800; color: #f39800; }
.act-btn.drink { border-color: #9b59b6; color: #9b59b6; }
.act-btn.drop { border-color: #666; color: #666; }

/* 弹层 */
.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.72); backdrop-filter: blur(4px); border-radius: 4px; z-index: 10; }
.overlay-card { background: #fff; border-radius: 16px; padding: 28px 36px; text-align: center; box-shadow: 0 8px 40px rgba(0,0,0,0.15); }
.overlay-card h2 { margin: 0 0 6px; font-size: 24px; }
.overlay-card p { color: #666; margin: 0 0 16px; }
.overlay-card.won { border: 2px solid var(--maze-exit, #4caf50); }
.overlay-card.caught { border: 2px solid var(--maze-cat, #e05a3d); }
.overlay-stats { display: flex; gap: 32px; justify-content: center; }
.overlay-stats strong { font-size: 28px; color: #333; }
.overlay-stats small { font-size: 12px; color: #999; display: block; }

.fade-enter-active { transition: opacity 0.4s ease; } .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
