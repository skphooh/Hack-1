/**
 * WebGLコンテキストのグローバル上限管理（LRU方式）
 *
 * モバイルブラウザの実用上限は6前後（iOS Safari: ~8、安全マージン込みで6）。
 * 上限に達したら最も長く放置されているカードを先に退去させる。
 */

// 同時 Canvas 数の上限。8 は PC・モバイルともに安定して動作する値。
export const MAX_CONTEXTS = 8

type Slot = { evict: () => void; lastActive: number }
const pool = new Map<string, Slot>()

/** コンテキスト取得。上限に達していたら最古のものを退去させる */
export function acquireContext(id: string, onEvict: () => void): void {
  if (pool.has(id)) {
    pool.get(id)!.lastActive = Date.now()
    return
  }
  if (pool.size >= MAX_CONTEXTS) {
    let lruId = ''
    let lruTime = Infinity
    pool.forEach((slot, sid) => {
      if (slot.lastActive < lruTime) { lruTime = slot.lastActive; lruId = sid }
    })
    if (lruId) {
      pool.get(lruId)!.evict()
      pool.delete(lruId)
    }
  }
  pool.set(id, { evict: onEvict, lastActive: Date.now() })
}

/** コンテキスト解放（コンポーネントのアンマウント時） */
export function releaseContext(id: string): void {
  pool.delete(id)
}

/** プール全消去（WorkDetailなど専用ページへの遷移時に呼ぶ） */
export function clearPool(): void {
  pool.forEach(slot => slot.evict())
  pool.clear()
}
