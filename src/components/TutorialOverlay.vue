<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()

function onConfirm() {
  localStorage.setItem('escape-zhang-tutorial', '1')
  emit('close')
}
</script>

<template>
  <div class="tutorial-backdrop">
    <div class="tutorial-card">
      <h2>🎮 游戏玩法</h2>
      <div class="tutorial-body">
        <div class="tut-item">
          <span class="tut-icon">🚶</span>
          <div><strong>你是老鼠</strong><br>用方向键/WASD移动，到达出口 🚪 即可逃离</div>
        </div>
        <div class="tut-item">
          <span class="tut-icon"><img src="/zhangxuefeng.png" class="tut-img" alt="张雪峰" /></span>
          <div><strong>张雪峰（猫）</strong><br>每N步后出现，BFS最短路径追击你！</div>
        </div>
        <div class="tut-item">
          <span class="tut-icon">⚡</span>
          <div><strong>陷阱</strong><br>踩中停滞N秒，张雪峰也会被陷阱困住</div>
        </div>
        <div class="tut-item">
          <span class="tut-icon"><img src="/qiaolezi.jpg" class="tut-img" alt="巧乐兹" /></span>
          <div><strong>巧乐兹（🍖）</strong><br>张雪峰吃→停3秒+5秒双倍速<br>你可拾取(E键)/放下(Q键)做诱饵</div>
        </div>
        <div class="tut-item">
          <span class="tut-icon"><img src="/xuebi.jpg" class="tut-img" alt="雪碧" /></span>
          <div><strong>雪碧（🧪）</strong><br>张雪峰喝→穿墙1秒<br>你喝(E键)→消除5面墙+1秒窄视野</div>
        </div>
      </div>
      <button class="tut-btn" @click="onConfirm">已了解，开始游戏</button>
    </div>
  </div>
</template>

<style scoped>
.tutorial-backdrop {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
}
.tutorial-card {
  background: #fff; border-radius: 16px;
  padding: 24px 28px;
  max-width: 420px; width: calc(100vw - 48px);
  max-height: calc(100dvh - 64px); overflow-y: auto;
  box-shadow: 0 12px 60px rgba(0,0,0,0.25);
}
.tutorial-card h2 { margin: 0 0 16px; font-size: 22px; text-align: center; }
.tutorial-body { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
.tut-item { display: flex; gap: 12px; align-items: flex-start; }
.tut-icon { font-size: 28px; flex-shrink: 0; width: 40px; text-align: center; }
.tut-img { width: 36px; height: 36px; object-fit: contain; border-radius: 4px; }
.tut-item strong { color: #1a1a2e; font-size: 14px; }
.tut-item div { font-size: 13px; color: #666; line-height: 1.5; }
.tut-btn {
  display: block; width: 100%; padding: 12px;
  font-size: 16px; font-weight: 700; color: #fff;
  background: #1a1a2e; border: none; border-radius: 10px;
  cursor: pointer; transition: background 0.15s;
}
.tut-btn:hover { background: #2d2d4a; }
</style>
