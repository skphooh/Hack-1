// Zustand ストア: 3D生成フローの状態管理
import { create } from 'zustand'
import type { TaskStatusResponse, WorkResponse } from '../lib/api'

/** 生成フローのステップ */
export type GenerateStep = 'idle' | 'uploading' | 'depth_preview' | 'generating' | 'done' | 'error'

interface GenerateState {
  /** 現在のステップ */
  step: GenerateStep
  /** アップロードされた画像のプレビューURL */
  previewUrl: string | null
  /** Depthマップ画像URL */
  depthUrl: string | null
  /** 作成された作品情報 */
  work: WorkResponse | null
  /** 生成ジョブのステータス */
  taskStatus: TaskStatusResponse | null
  /** エラーメッセージ */
  error: string | null

  // アクション
  setStep: (step: GenerateStep) => void
  setPreviewUrl: (url: string | null) => void
  setDepthUrl: (url: string | null) => void
  setWork: (work: WorkResponse | null) => void
  setTaskStatus: (status: TaskStatusResponse | null) => void
  setError: (error: string | null) => void
  /** フローをリセットして最初に戻る */
  reset: () => void
}

export const useGenerateStore = create<GenerateState>((set) => ({
  step: 'idle',
  previewUrl: null,
  depthUrl: null,
  work: null,
  taskStatus: null,
  error: null,

  setStep: (step) => set({ step }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setDepthUrl: (depthUrl) => set({ depthUrl }),
  setWork: (work) => set({ work }),
  setTaskStatus: (taskStatus) => set({ taskStatus }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      step: 'idle',
      previewUrl: null,
      depthUrl: null,
      work: null,
      taskStatus: null,
      error: null,
    }),
}))
