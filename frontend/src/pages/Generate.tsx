// 生成ページ（フロー①: 写真・イラスト→3D変換）
import { useCallback, useRef, useState } from 'react'
import { Sparkles, Download, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Dropzone } from '../components/Dropzone'
import { Viewer3D } from '../components/Viewer3D'
import { useGenerateStore } from '../stores/generateStore'
import { estimateDepth, startGenerate, fetchTaskStatus } from '../lib/api'
import { useAuthState } from '../components/useAuthState'

/** ステップインジケーターのラベル */
const STEPS = ['画像選択', 'プレビュー確認', '3D生成中', '完成！']

export default function Generate() {
  const { user } = useAuthState()
  const {
    step, previewUrl, depthUrl, taskStatus,
    setStep, setPreviewUrl, setDepthUrl, setWork, setTaskStatus, setError, reset,
  } = useGenerateStore()

  const [mode, setMode] = useState<'photo' | 'anime'>('photo')
  const [title, setTitle] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** 画像選択時: プレビュー表示 + Depth推定 */
  const handleFile = useCallback(async (file: File) => {
    // ローカルプレビュー
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setStep('depth_preview')

    // Depth推定（プレビュー）
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await estimateDepth(form)
      setDepthUrl(res.depth_image_url)
    } catch {
      // Depth推定失敗は致命的ではないため無視
    }
  }, [setPreviewUrl, setStep, setDepthUrl])

  /** 生成開始ボタン押下 */
  const handleGenerate = useCallback(async () => {
    if (!user || !previewUrl) return
    setStep('uploading')

    try {
      // DataURLからBlobに変換
      const blob = await fetch(previewUrl).then((r) => r.blob())
      const form = new FormData()
      form.append('file', blob, 'upload.png')
      form.append('title', title || 'うちの子')
      form.append('mode', mode)

      const newWork = await startGenerate(form)
      setWork(newWork)
      setStep('generating')

      // ポーリング開始（3秒ごと）
      pollingRef.current = setInterval(async () => {
        if (!newWork.task_id) return
        try {
          const status = await fetchTaskStatus(newWork.task_id)
          setTaskStatus(status)
          if (status.status === 'done') {
            clearInterval(pollingRef.current!)
            setStep('done')
          } else if (status.status === 'failed') {
            clearInterval(pollingRef.current!)
            setError('3D生成に失敗しました。別の画像で試してみてください。')
            setStep('error')
          }
        } catch {
          // ポーリングエラーは一時的なものとして継続
        }
      }, 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました')
      setStep('error')
    }
  }, [user, previewUrl, title, mode, setStep, setWork, setTaskStatus, setError])

  /** STLダウンロード */
  const handleDownload = useCallback(() => {
    if (!taskStatus?.stl_url) return
    const a = document.createElement('a')
    a.href = taskStatus.stl_url
    a.download = `${title || 'uchi-no-ko'}.stl`
    a.click()
  }, [taskStatus, title])

  const currentStepIndex = {
    idle: 0, depth_preview: 1, uploading: 2, generating: 2, done: 3, error: 0,
  }[step] ?? 0

  return (
    <main style={{ paddingTop: 80, minHeight: '100vh' }}>
      <div className="page-container section">
        {/* ページタイトル */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 12 }}>
            <span className="gradient-text">うちの子</span>を3Dにする
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            写真またはイラストを1枚アップするだけで、STLデータが生成されます
          </p>
        </div>

        {/* ステップインジケーター */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 0,
            marginBottom: 48,
            overflowX: 'auto',
          }}
        >
          {STEPS.map((label, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                      i <= currentStepIndex
                        ? 'var(--gradient-button)'
                        : 'var(--color-bg-glass)',
                    border: `2px solid ${i <= currentStepIndex ? 'transparent' : 'var(--color-border)'}`,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: i <= currentStepIndex ? 'white' : 'var(--color-text-muted)',
                    transition: 'all 0.3s',
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    marginTop: 6,
                    color: i <= currentStepIndex ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    width: 40,
                    height: 2,
                    background: i < currentStepIndex ? 'var(--gradient-button)' : 'var(--color-border)',
                    marginBottom: 24,
                    transition: 'background 0.3s',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* メインコンテンツ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
          {/* 左カラム: 入力 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ログイン促進 */}
            {!user && (
              <div
                className="glass-card"
                style={{ padding: 20, borderColor: 'rgba(244, 114, 182, 0.4)', textAlign: 'center' }}
              >
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  ⚠️ 生成するには Google ログインが必要です
                </p>
              </div>
            )}

            {/* モード切替 */}
            <div
              className="glass-card"
              style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                画像の種類
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['photo', 'anime'] as const).map((m) => (
                  <button
                    key={m}
                    id={`mode-${m}`}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${mode === m ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                      background: mode === m ? 'rgba(167, 139, 250, 0.12)' : 'transparent',
                      color: mode === m ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {m === 'photo' ? '📷 実写・コスプレ' : '🎨 アニメ・イラスト'}
                  </button>
                ))}
              </div>
            </div>

            {/* タイトル入力 */}
            <div className="glass-card" style={{ padding: 20 }}>
              <label
                htmlFor="work-title"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 8, color: 'var(--color-text-secondary)' }}
              >
                作品タイトル（任意）
              </label>
              <input
                id="work-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 私の推し / うちの子 2024"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* ドロップゾーン */}
            {(step === 'idle' || step === 'depth_preview') && (
              <Dropzone onFile={handleFile} disabled={!user} />
            )}

            {/* 生成ボタン */}
            {step === 'depth_preview' && (
              <button
                id="start-generate-btn"
                onClick={handleGenerate}
                className="btn-primary"
                style={{ justifyContent: 'center', width: '100%', padding: '16px' }}
              >
                <Sparkles size={18} />
                3D生成スタート！
              </button>
            )}

            {/* リセットボタン */}
            {(step === 'done' || step === 'error') && (
              <button
                id="reset-btn"
                onClick={reset}
                className="btn-outline"
                style={{ justifyContent: 'center', width: '100%' }}
              >
                <RefreshCw size={16} />
                もう一度作る
              </button>
            )}
          </div>

          {/* 右カラム: プレビュー */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Depthプレビュー */}
            {depthUrl && step !== 'done' && (
              <div className="glass-card" style={{ padding: 16 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  🔍 Depth プレビュー（即時）
                </p>
                <img
                  src={depthUrl}
                  alt="Depthマップ"
                  style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
                />
              </div>
            )}

            {/* 元画像プレビュー */}
            {previewUrl && step !== 'done' && (
              <div className="glass-card" style={{ padding: 16 }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  📷 アップロード画像
                </p>
                <img
                  src={previewUrl}
                  alt="アップロード画像"
                  style={{ width: '100%', borderRadius: 'var(--radius-md)', maxHeight: 300, objectFit: 'contain' }}
                />
              </div>
            )}

            {/* 生成中インジケーター */}
            {(step === 'uploading' || step === 'generating') && (
              <div
                className="glass-card animate-glow"
                style={{ padding: 40, textAlign: 'center' }}
              >
                <Loader2
                  size={48}
                  color="var(--color-accent-primary)"
                  style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}
                />
                <p style={{ fontWeight: 600 }}>
                  {step === 'uploading' ? 'アップロード中...' : '3Dモデルを生成中...'}
                </p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 8 }}>
                  {mode === 'anime'
                    ? 'Wonder3D が処理中です（3〜8分）'
                    : 'Tripo3D が処理中です（1〜3分）'}
                </p>
                {taskStatus && taskStatus.progress > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        height: 6,
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 100,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${taskStatus.progress}%`,
                          height: '100%',
                          background: 'var(--gradient-button)',
                          borderRadius: 100,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                      {taskStatus.progress}%
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 完成！ */}
            {step === 'done' && taskStatus?.glb_url && (
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={20} color="#34d399" />
                  <span style={{ fontWeight: 600, color: '#34d399' }}>3D生成完了！</span>
                </div>
                <Viewer3D glbUrl={taskStatus.glb_url} height={350} />
                {taskStatus.stl_url && (
                  <div style={{ padding: 16 }}>
                    <button
                      id="download-stl-btn"
                      onClick={handleDownload}
                      className="btn-primary"
                      style={{ justifyContent: 'center', width: '100%' }}
                    >
                      <Download size={18} />
                      STLをダウンロード
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* エラー */}
            {step === 'error' && (
              <div
                className="glass-card"
                style={{ padding: 32, textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.4)' }}
              >
                <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>
                  生成に失敗しました
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  別の画像を試してみてください
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  )
}
