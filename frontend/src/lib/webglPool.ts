/**
 * WebGLコンテキストのグローバル上限管理（LRU方式）
 *
 * モバイルブラウザは同時に持てるWebGLコンテキスト数に制限がある（iOS Safari: 約8）。
 * 上限に達したら最も長く放置されているカードを先にアンマウントして新しいものを起動する。
 */

const MAX_CONTEXTS =
  typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? 9   // モバイル: 従来通り9
    : 16  // デスクトップ: 余裕あり

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
