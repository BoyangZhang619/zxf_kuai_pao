<script setup lang="ts">
import { ref, watch } from 'vue'
import type { GameConfig } from '../types/maze'
import { useStyle } from '../composables/useStyle'

const props = defineProps<{
  config: GameConfig
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  apply: [config: GameConfig]
}>()

const local = ref<GameConfig>({ ...props.config })

const { theme, setTheme, getThemeNames } = useStyle()
const themeNames = getThemeNames()

// 每次打开面板时同步外部配置
watch(() => props.visible, (v) => {
  if (v) local.value = { ...props.config }
})

function handleApply() {
  emit('apply', { ...local.value })
  emit('close')
}

function handleCancel() {
  local.value = { ...props.config }
  emit('close')
}
</script>

<template>
  <Transition name="panel">
    <div v-if="visible" class="settings-backdrop" @click.self="handleCancel">
      <div class="settings-panel">
        <div class="panel-header">
          <h3>⚙️ 游戏设置</h3>
          <button class="close-btn" @click="handleCancel" aria-label="关闭">✕</button>
        </div>

        <div class="panel-body">
          <!-- ====== 猫的设置 ====== -->
          <section class="setting-section">
            <h4 class="section-title">🐱 猫的行为</h4>

            <!-- 猫出现延迟步数 -->
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">猫出现步数</span>
                <span class="setting-desc">老鼠走多少步后，猫从起点开始追击</span>
              </div>
              <div class="stepper">
                <button class="stepper-btn" @click="local.catSpawnDelay = Math.max(1, local.catSpawnDelay - 1)">−</button>
                <span class="stepper-value">{{ local.catSpawnDelay }}</span>
                <button class="stepper-btn" @click="local.catSpawnDelay = Math.min(20, local.catSpawnDelay + 1)">+</button>
              </div>
            </div>

            <!-- 猫移动间隔 -->
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">猫移动间隔</span>
                <span class="setting-desc">猫每多少秒移动一步（BFS 最短路径）</span>
              </div>
              <div class="stepper">
                <button class="stepper-btn" @click="local.catMoveInterval = Math.max(0.1, +(local.catMoveInterval - 0.1).toFixed(1))">−</button>
                <span class="stepper-value">{{ local.catMoveInterval.toFixed(1) }}s</span>
                <button class="stepper-btn" @click="local.catMoveInterval = Math.min(3, +(local.catMoveInterval + 0.1).toFixed(1))">+</button>
              </div>
            </div>
          </section>

          <!-- ====== 迷宫设置 ====== -->
          <section class="setting-section">
            <h4 class="section-title">🧩 迷宫</h4>

            <!-- 迷宫边长 -->
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">迷宫边长</span>
                <span class="setting-desc">{{ local.mazeSize }} × {{ local.mazeSize }} 格</span>
              </div>
              <div class="slider-wrap">
                <input
                  v-model.number="local.mazeSize"
                  type="range"
                  min="10"
                  max="30"
                  step="2"
                  class="styled-slider"
                />
                <span class="slider-val">{{ local.mazeSize }}</span>
              </div>
            </div>

            <!-- 墙壁密度 -->
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">墙壁密度</span>
                <span class="setting-desc">
                  {{ local.wallDensity >= 80 ? '较密 · 路径少' : local.wallDensity >= 40 ? '适中' : '较疏 · 多岔路' }}
                </span>
              </div>
              <div class="slider-wrap">
                <input
                  v-model.number="local.wallDensity"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  class="styled-slider"
                />
                <span class="slider-val">{{ local.wallDensity }}</span>
              </div>
            </div>
          </section>

          <!-- ====== 风格主题 ====== -->
          <section class="setting-section">
            <h4 class="section-title">🎨 风格主题</h4>

            <div class="theme-grid">
              <button
                v-for="t in themeNames"
                :key="t.name"
                class="theme-card"
                :class="{ active: theme.name === t.name }"
                @click="setTheme(t.name)"
              >
                <span class="theme-name">{{ t.label }}</span>
                <span v-if="theme.name === t.name" class="theme-check">✓</span>
              </button>
            </div>
          </section>
        </div>

        <div class="panel-footer">
          <button class="btn btn-cancel" @click="handleCancel">取消</button>
          <button class="btn btn-apply" @click="handleApply">应用并重新开始</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ===== 背景遮罩 ===== */
.settings-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}

/* ===== 面板 ===== */
.settings-panel {
  background: #fff;
  border-radius: 16px;
  width: 420px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  box-shadow: 0 12px 60px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #eee;
}
.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1a1a2e;
}
.close-btn {
  width: 32px; height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 16px;
  color: #888;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.close-btn:hover { background: #e8e8e8; color: #333; }

/* ===== 主体 ===== */
.panel-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

/* ===== 设置行 ===== */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.setting-desc {
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}

/* ===== 步进器 ===== */
.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}
.stepper-btn {
  width: 36px; height: 34px;
  border: none;
  background: #f8f9fa;
  font-size: 18px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition: all 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stepper-btn:hover { background: #e8e8e8; color: #1a1a2e; }
.stepper-value {
  min-width: 44px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  padding: 0 4px;
  font-variant-numeric: tabular-nums;
}

/* ===== 滑块 ===== */
.slider-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.styled-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100px;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
  outline: none;
  cursor: pointer;
}
.styled-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #1a1a2e;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  transition: transform 0.12s;
}
.styled-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.slider-val {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  min-width: 24px;
  font-variant-numeric: tabular-nums;
}

/* ===== 主题卡片 ===== */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}

.theme-card {
  position: relative;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  color: #666;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.theme-card:hover { border-color: #999; color: #333; }

.theme-card.active {
  border-color: #1a1a2e;
  background: #f8f8fb;
  color: #1a1a2e;
}

.theme-check {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 12px;
  color: #1a1a2e;
}

/* ===== 底部按钮 ===== */
.panel-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 24px 20px;
  border-top: 1px solid #eee;
}
.btn {
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-cancel {
  background: #f5f5f5;
  color: #666;
}
.btn-cancel:hover { background: #e8e8e8; }
.btn-apply {
  background: #1a1a2e;
  color: #fff;
}
.btn-apply:hover { background: #2d2d4a; transform: translateY(-1px); }

/* ===== 过渡动画 ===== */
.panel-enter-active { transition: all 0.3s ease; }
.panel-leave-active { transition: all 0.2s ease; }
.panel-enter-from { opacity: 0; }
.panel-enter-from .settings-panel { transform: scale(0.92) translateY(20px); }
.panel-leave-to   { opacity: 0; }
.panel-leave-to .settings-panel   { transform: scale(0.95) translateY(10px); }
</style>
