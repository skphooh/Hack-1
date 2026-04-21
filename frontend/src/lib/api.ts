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

// ===== 型定義 =====

export interface WorkResponse {
  id: string
  user_id: string
  title: string
  genre: string | null
  is_official: boolean
  price: number
  thumbnail_url: string | null
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
