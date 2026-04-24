// FastAPI サーバーへのAPIクライアント
// Firebase Auth の IDトークンを自動附与する

import { auth } from './firebase'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/** 認証トークン付きヘッダーを生成する */
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

/** 汎用GETリクエスト */
export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const headers = await getAuthHeaders()
  const res = await fetch(url.toString(), { headers })
  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  return res.json()
}

/** 汎用POSTリクエスト（JSON） */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  return res.json()
}

/** FormData POSTリクエスト（ファイルアップロード用） */
export async function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: form,
  })
  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  return res.json()
}

/** 汎用DELETEリクエスト */
export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  return res.json()
}

// ===== エンドポイント別APIメソッド =====

/** 作品一覧取得 */
export const fetchWorks = (params?: Record<string, string>) =>
  apiGet<WorkListResponse>('/api/works', params)

/** 作品詳細取得 */
export const fetchWork = (id: string) =>
  apiGet<WorkResponse>(`/api/works/${id}`)

/** 作品削除（本人のみ） */
export const deleteWork = (id: string) =>
  apiDelete<{ message: string }>(`/api/works/${id}`)

/** 3D生成ジョブ開始 */
export const startGenerate = (form: FormData) =>
  apiPostForm<WorkResponse>('/api/generate', form)

/** ジョブステータスポーリング */
export const fetchTaskStatus = (taskId: string) =>
  apiGet<TaskStatusResponse>(`/api/task/${taskId}`)

/** Depth推定（プレビュー用） */
export const estimateDepth = (form: FormData) =>
  apiPostForm<DepthResponse>('/api/depth', form)

/** いいねトグル */
export const toggleLike = (workId: string) =>
  apiPost<LikeResponse>(`/api/works/${workId}/like`, {})

/**
 * ストラップ穴追加 → STLファイルを直接Blobで受け取る
 * @returns ダウンロード用のURL (blob:)
 */
export async function addStrapHole(
  workId: string,
  params: {
    offset_x?: number   // モデル幅の%（-50〜50）
    offset_y?: number   // モデル奥行きの%（-50〜50）
    depth_mm?: number   // 上端からの深さmm
    radius_mm?: number  // 穴の半径mm（1.0=直径2mm）
  } = {}
): Promise<string> {
  const headers = await getAuthHeaders()
  const q = new URLSearchParams()
  if (params.offset_x  !== undefined) q.set('offset_x',  String(params.offset_x))
  if (params.offset_y  !== undefined) q.set('offset_y',  String(params.offset_y))
  if (params.depth_mm  !== undefined) q.set('depth_mm',  String(params.depth_mm))
  if (params.radius_mm !== undefined) q.set('radius_mm', String(params.radius_mm))
  const res = await fetch(`${API_BASE}/api/works/${workId}/strap-hole?${q.toString()}`, {
    method: 'POST',
    headers,
  })
  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

/**
 * 台座追加 → STLファイルを直接Blobで受け取る
 * @returns ダウンロード用のURL (blob:)
 */
export async function addBase(
  workId: string,
  params: {
    height_mm?:  number  // 台座の高さmm
    margin_pct?: number  // 余白%
  } = {}
): Promise<string> {
  const headers = await getAuthHeaders()
  const q = new URLSearchParams()
  if (params.height_mm  !== undefined) q.set('height_mm',  String(params.height_mm))
  if (params.margin_pct !== undefined) q.set('margin_pct', String(params.margin_pct))
  const res = await fetch(`${API_BASE}/api/works/${workId}/base?${q.toString()}`, {
    method: 'POST',
    headers,
  })
  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

/** ターンアラウンドプレビュー生成 */
export const generateTurnaroundPreview = (form: FormData) =>
  apiPostForm<TurnaroundPreviewResponse>('/api/generate/turnaround/preview', form)

/** ターンアラウンドから3D生成 */
export const startGenerateTurnaround = (form: FormData) =>
  apiPostForm<WorkResponse>('/api/generate/turnaround', form)

// ===== 型定義 =====

export interface WorkResponse {
  id: string
  user_id: string
  title: string
  genre: string | null
  is_official: boolean
  price: number
  thumbnail_url: string | null
  turnaround_url: string | null
  stl_url: string | null
  glb_url: string | null
  task_id: string | null
  status: string
  likes_count: number
  downloads: number
  created_at: string
  author_firebase_uid: string | null
}

export interface WorkListResponse {
  items: WorkResponse[]
  total: number
  page: number
  per_page: number
}

export interface TaskStatusResponse {
  task_id: string
  status: string
  progress: number
  glb_url: string | null
  stl_url: string | null
  error: string | null
}

export interface DepthResponse {
  depth_image_url: string
}

export interface LikeResponse {
  liked: boolean
  likes_count: number
}

// PostProcessResponse は廃止（APIがSTLバイナリを直接返すようになった）
// addStrapHole / addBase は blob URL (string) を返す

/**
 * Render のスリープ解除用 ping。
 * 無料プランは 15 分無通信でスリープするため、アプリ起動時に叩いておく。
 */
export async function wakeBackend(): Promise<void> {
  try {
    await fetch(`${API_BASE}/health`)
  } catch {
    // fire-and-forget — 失敗しても無視
  }
}

export interface TurnaroundPreviewResponse {
  turnaround_url: string
}
