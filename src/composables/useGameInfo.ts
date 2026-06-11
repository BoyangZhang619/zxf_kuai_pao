import { reactive } from 'vue'

/** MazeBoard 与 App.vue 之间的共享游戏信息 */
export const gameInfo = reactive({
  moves: 0,
  elapsed: '00:00',
  catActive: false,
  firstMoveMade: false,
  inventory: null as string | null,
  catEating: false,
  catSpeedy: false,
  catPhasing: false,
  mouseStunned: false,
})

export function resetGameInfo() {
  gameInfo.moves = 0
  gameInfo.elapsed = '00:00'
  gameInfo.catActive = false
  gameInfo.firstMoveMade = false
  gameInfo.inventory = null
  gameInfo.catEating = false
  gameInfo.catSpeedy = false
  gameInfo.catPhasing = false
  gameInfo.mouseStunned = false
}
