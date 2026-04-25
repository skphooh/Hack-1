// 生成ページ（フロー①: 写真・イラスト→3D変換）- ポップ・かわいいデザイン
import { useCallback, useRef, useState } from 'react'
import { Download, RefreshCw, CheckCircle, AlertCircle, Loader2, Printer } from 'lucide-react'
import { Dropzone } from '../components/Dropzone'
import { Viewer3D } from '../components/Viewer3D'
import { useGenerateStore } from '../stores/generateStore'
import {
  estimateDepth, startGenerate, fetchTaskStatus,
  addStrapHole, addBase,
  generateTurnaroundPreview, startGenerateTurnaround,
} from '../lib/api'
import { useAuthState } from '../components/useAuthState'

/** ステップインジケーターのラベルと絵文字 */
const STEPS = [
  { label: '画像を選んでね', emoji: '🖼️' },
  { label: 'プレビュー確認', emoji: '👀' },
  { label: '3D生成中…', emoji: '⚙️' },
  { label: 'できた！', emoji: '🎉' },
]

/** 紙吹雪エフェクトを生成する関数 */
function launchConfetti() {
  const colors = ['#FF6B9D', '#9B59B6', '#4ECDC4', '#FFE566', '#FFB347', '#FF85C2']
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div')
    el.className = 'confetti-particle'
    el.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: -10px;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${1.5 + Math.random() * 1.5}s;
      animation-delay: ${Math.random() * 0.8}s;
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 4000)
  }
}

export default function Generate() {
  const { user } = useAuthState()
  const {
    step, previewUrl, work, taskStatus,
    setStep, setPreviewUrl, setDepthUrl, setWork, setTaskStatus, setError, reset,
  } = useGenerateStore()

  const [title, setTitle] = useState('')
  const [quality, setQuality] = useState<'standard' | 'high'>('standard')
  const [postProcessing, setPostProcessing] = useState<'strap' | 'base' | null>(null)
  const [strapBlobUrl, setStrapBlobUrl] = useState<string | null>(null)
  const [baseBlobUrl, setBaseBlobUrl] = useState<string | null>(null)
  const [stlViewUrl, setStlViewUrl] = useState<string | null>(null)
  const [showStl, setShowStl] = useState(false)

  // ストラップ穴パラメータ
  const [holeOffsetY,  setHoleOffsetY]  = useState(0)
  const [holeDepthMm,  setHoleDepthMm]  = useState(5)
  const [holeRadiusMm, setHoleRadiusMm] = useState(1.0)

  // 台座パラメータ
  const [baseHeightMm,  setBaseHeightMm]  = useState(3)
  const [baseMarginPct, setBaseMarginPct] = useState(15)
  const [turnaroundUrl, setTurnaroundUrl] = useState<string | null>(null)
  const [turnaroundLoading, setTurnaroundLoading] = useState(false)
  const [turnaroundConfirming, setTurnaroundConfirming] = useState(false)
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
      form.append('quality', quality)

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
            launchConfetti() // 🎉 紙吹雪エフェクト！
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
  }, [user, previewUrl, title, quality, setStep, setWork, setTaskStatus, setError])

  /** STLダウンロード */
  const handleDownload = useCallback(() => {
    if (!taskStatus?.stl_url) return
    const a = document.createElement('a')
    a.href = taskStatus.stl_url
    a.download = `${title || 'uchi-no-ko'}.stl`
    a.click()
  }, [taskStatus, title])

  /** GLBダウンロード */
  const handleDownloadGlb = useCallback(() => {
    if (!taskStatus?.glb_url) return
    const a = document.createElement('a')
    a.href = taskStatus.glb_url
    a.download = `${title || 'uchi-no-ko'}.glb`
    a.click()
  }, [taskStatus, title])

  /** ストラップ穴追加 */
  const handleAddStrapHole = useCallback(async () => {
    if (!work?.id) return
    setPostProcessing('strap')
    setStlViewUrl(null)
    setShowStl(false)
    if (strapBlobUrl) { URL.revokeObjectURL(strapBlobUrl); setStrapBlobUrl(null) }
    try {
      const blobUrl = await addStrapHole(work.id, {
        offset_x:  0,
        offset_y:  holeOffsetY,
        depth_mm:  holeDepthMm,
        radius_mm: holeRadiusMm,
      })
      setStrapBlobUrl(blobUrl)
      setStlViewUrl(blobUrl)
      setShowStl(true)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${title || 'uchi-no-ko'}_hole.stl`
      a.click()
    } catch (e) {
      alert('ストラップ穴の追加に失敗しました。しばらく待ってから再試行してください。')
      console.error(e)
    } finally {
      setPostProcessing(null)
    }
  }, [work, strapBlobUrl, holeOffsetY, holeDepthMm, holeRadiusMm, title])

  /** 台座追加 */
  const handleAddBase = useCallback(async () => {
    if (!work?.id) return
    setPostProcessing('base')
    setStlViewUrl(null)
    setShowStl(false)
    if (baseBlobUrl) { URL.revokeObjectURL(baseBlobUrl); setBaseBlobUrl(null) }
    try {
      const blobUrl = await addBase(work.id, {
        height_mm:  baseHeightMm,
        margin_pct: baseMarginPct,
      })
      setBaseBlobUrl(blobUrl)
      setStlViewUrl(blobUrl)
      setShowStl(true)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${title || 'uchi-no-ko'}_base.stl`
      a.click()
    } catch (e) {
      alert('台座の追加に失敗しました。しばらく待ってから再試行してください。')
      console.error(e)
    } finally {
      setPostProcessing(null)
    }
  }, [work, baseBlobUrl, baseHeightMm, baseMarginPct, title])

  /** ターンアラウンドプレビュー生成 */
  const handleTurnaroundPreview = useCallback(async () => {
    if (!previewUrl) return
    setTurnaroundLoading(true)
    try {
      const blob = await fetch(previewUrl).then(r => r.blob())
      const form = new FormData()
      form.append('file', blob, 'upload.png')
      const res = await generateTurnaroundPreview(form)
      setTurnaroundUrl(res.turnaround_url)
      setTurnaroundConfirming(true)
    } catch (e) {
      alert('ターンアラウンド生成に失敗しました。しばらく待ってから再試行してください。')
      console.error(e)
    } finally {
      setTurnaroundLoading(false)
    }
  }, [previewUrl])

  /** ターンアラウンドから3D生成 */
  const handleTurnaroundGenerate = useCallback(async () => {
    if (!user || !turnaroundUrl) return
    setTurnaroundConfirming(false)
    setStep('uploading')
    try {
      const form = new FormData()
      form.append('turnaround_url', turnaroundUrl)
      form.append('title', title || 'うちの子')
      const newWork = await startGenerateTurnaround(form)
      setWork(newWork)
      setStep('generating')

      pollingRef.current = setInterval(async () => {
        if (!newWork.task_id) return
        try {
          const status = await fetchTaskStatus(newWork.task_id)
          setTaskStatus(status)
          if (status.status === 'done') {
            clearInterval(pollingRef.current!)
            setStep('done')
            launchConfetti()
          } else if (status.status === 'failed') {
            clearInterval(pollingRef.current!)
            setError('3D生成に失敗しました。別の画像で試してみてください。')
            setStep('error')
          }
        } catch { /* 一時的なエラーは継続 */ }
      }, 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました')
      setStep('error')
    }
  }, [user, turnaroundUrl, title, setStep, setWork, setTaskStatus, setError])

  const currentStepIndex = {
    idle: 0, depth_preview: 1, uploading: 2, generating: 2, done: 3, error: 0,
  }[step] ?? 0

  return (
    <main style={{ paddingTop: 80, minHeight: '100vh' }}>
      <div className="page-container section">
        {/* ページタイトル */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 20px',
              background: '#FFEDF4',
              border: '2px solid var(--color-pink-light)',
              borderRadius: 100,
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-pink)',
              marginBottom: 16,
            }}
          >
            🎨 3D生成ページ
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              fontWeight: 900,
              marginBottom: 12,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
            }}
          >
            <span className="gradient-text">うちの子</span>を3Dにする✨
          </h1>
          <p style={{ color: 'var(--color-text-sub)', fontWeight: 500 }}>
            写真またはイラストを1枚アップするだけで、STLデータが生成されます！
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
            padding: '0 8px',
          }}
        >
          {STEPS.map(({ label, emoji }, i) => {
            const isActive = i <= currentStepIndex
            const isCurrent = i === currentStepIndex
            return (
              <div
                key={label}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 88,
                  }}
                >
                  {/* ステップ丸 */}
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive
                        ? 'var(--color-pink)'
                        : 'white',
                      border: `2.5px solid ${isActive ? 'var(--color-pink)' : 'var(--color-border)'}`,
                      fontSize: isActive ? '1.1rem' : '0.9rem',
                      boxShadow: isCurrent
                        ? '0 0 0 6px rgba(255, 107, 157, 0.2)'
                        : 'none',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: isCurrent ? 'scale(1.12)' : 'scale(1)',
                    }}
                  >
                    {isActive ? emoji : (
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  {/* ラベル */}
                  <span
                    style={{
                      fontSize: '0.72rem',
                      marginTop: 6,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--color-pink)' : 'var(--color-text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                </div>
                {/* コネクターライン */}
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 36,
                      height: 3,
                      background:
                        i < currentStepIndex
                          ? 'var(--color-pink)'
                          : 'var(--color-border)',
                      marginBottom: 22,
                      borderRadius: 100,
                      transition: 'background 0.3s',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* メインコンテンツ（2カラムレイアウト） */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* 左カラム: 入力エリア */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* ログイン促進バナー */}
            {!user && (
              <div
                style={{
                  padding: '16px 20px',
                  background: '#FFFBF0',
                  border: '2px solid #FFD699',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <p style={{ color: '#8B5E00', fontSize: '0.9rem', fontWeight: 600 }}>
                  生成するには Google ログインが必要だよ！
                </p>
              </div>
            )}

            {/* タイトル入力 */}
            <div
              style={{
                background: 'white',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 20px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <label
                htmlFor="work-title"
                style={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  marginBottom: 10,
                  color: 'var(--color-text-sub)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                ⭐ 作品タイトル（任意）
              </label>
              <input
                id="work-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 推しの名前 / うちの子 2024"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#FFF9FB',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-btn)',
                  color: 'var(--color-text)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  fontFamily: 'var(--font-base)',
                  fontWeight: 500,
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-pink)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              />
            </div>

            {/* 品質オプション */}
            <div
              style={{
                background: 'white',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 20px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⚙️ テクスチャ品質
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['standard', 'high'] as const).map((q) => {
                  const selected = quality === q
                  return (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      style={{
                        flex: 1, padding: '10px 12px',
                        borderRadius: 'var(--radius-btn)',
                        border: `2.5px solid ${selected ? 'var(--color-pink)' : 'var(--color-border)'}`,
                        background: selected ? '#FFEDF4' : 'white',
                        color: selected ? 'var(--color-pink)' : 'var(--color-text-sub)',
                        fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'var(--font-base)',
                      }}
                    >
                      {q === 'standard' ? '🎯 標準 (30cr)' : '✨ 高品質 (~50cr)'}
                    </button>
                  )
                })}
              </div>
              {quality === 'high' && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                  ⚠️ テクスチャ・PBR有効。生成に時間がかかります
                </p>
              )}
            </div>

            {/* ドロップゾーン */}
            {(step === 'idle' || step === 'depth_preview') && (
              <Dropzone onFile={handleFile} disabled={!user} />
            )}

            {/* 生成スタートボタン群 */}
            {step === 'depth_preview' && !turnaroundConfirming && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  id="start-generate-btn"
                  onClick={handleGenerate}
                  className="btn-primary"
                  style={{ justifyContent: 'center', width: '100%', padding: '16px', fontSize: '1.05rem' }}
                >
                  ✨ 3Dにする！
                </button>
                <button
                  onClick={handleTurnaroundPreview}
                  disabled={turnaroundLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                    padding: '14px', background: 'white', color: 'var(--color-purple)',
                    border: '2px solid #DDB3F5', borderRadius: 'var(--radius-btn)',
                    cursor: turnaroundLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-base)',
                    opacity: turnaroundLoading ? 0.6 : 1, width: '100%',
                  }}
                >
                  {turnaroundLoading
                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> ターンアラウンド生成中…</>
                    : '🌟 高品質（ターンアラウンド）で生成'}
                </button>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  ターンアラウンド: Geminiでフィギュア4方向（正面・左右・後ろ）を生成してからTripo3Dに送ります
                </p>
              </div>
            )}

            {/* ターンアラウンド確認UI */}
            {turnaroundConfirming && turnaroundUrl && (
              <div style={{ background: 'white', border: '2px solid #DDB3F5', borderRadius: 'var(--radius-md)', padding: 16, boxShadow: 'var(--shadow-card)' }}>
                <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: 'var(--color-purple)' }}>
                  🌟 ターンアラウンドプレビュー（確認してください）
                </p>
                <img src={turnaroundUrl} alt="ターンアラウンドプレビュー" style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleTurnaroundGenerate}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                  >
                    ✅ これで3D生成！
                  </button>
                  <button
                    onClick={() => { setTurnaroundConfirming(false); setTurnaroundUrl(null) }}
                    className="btn-outline"
                    style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                  >
                    🔄 再生成
                  </button>
                </div>
              </div>
            )}

            {/* リセットボタン */}
            {(step === 'done' || step === 'error') && (
              <button
                id="reset-btn"
                onClick={() => {
                  reset()
                  setStrapBlobUrl(null)
                  setBaseBlobUrl(null)
                  setStlViewUrl(null)
                  setShowStl(false)
                  setTurnaroundUrl(null)
                  setTurnaroundConfirming(false)
                  setTurnaroundLoading(false)
                }}
                className="btn-outline"
                style={{ justifyContent: 'center', width: '100%' }}
              >
                <RefreshCw size={16} />
                もう一度作る 🔄
              </button>
            )}
          </div>

          {/* 右カラム: プレビューエリア */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* アップロード画像プレビュー（Depth API の代わりに元画像を即時表示） */}
            {previewUrl && step !== 'done' && (
              <div
                style={{
                  background: 'white',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', marginBottom: 10, fontWeight: 700 }}>
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
                style={{
                  background: 'white',
                  border: '2.5px solid var(--color-pink-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '48px 32px',
                  textAlign: 'center',
                  boxShadow: '0 0 24px rgba(255,107,157,0.2)',
                  animation: 'glow-pulse 2s ease-in-out infinite',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>
                  {step === 'uploading' ? '📤' : '⚙️'}
                </div>
                <Loader2
                  size={36}
                  color="var(--color-pink)"
                  style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}
                />
                <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                  {step === 'uploading' ? 'アップロード中...' : '3Dモデルを生成中...'}
                </p>
                <p
                  style={{
                    color: 'var(--color-text-sub)',
                    fontSize: '0.875rem',
                    marginTop: 8,
                    fontWeight: 500,
                  }}
                >
                  ⏳ Tripo3D が処理中です（1〜3分）
                </p>
                {taskStatus && taskStatus.progress > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        height: 8,
                        background: '#FFD6E8',
                        borderRadius: 100,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${taskStatus.progress}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--color-pink), var(--color-purple))',
                          borderRadius: 100,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--color-pink)',
                        marginTop: 6,
                        fontWeight: 700,
                      }}
                    >
                      {taskStatus.progress}%
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 完成！！！ */}
            {step === 'done' && taskStatus?.glb_url && (
              <div
                style={{
                  background: 'white',
                  border: '2.5px solid #90D4A4',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(40, 167, 69, 0.15)',
                  animation: 'bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    background: '#E8FFF4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '2px solid #90D4A4',
                  }}
                >
                  <CheckCircle size={20} color="#22863a" />
                  <span style={{ fontWeight: 800, color: '#22863a', fontSize: '1rem' }}>
                    できた！🎉 3D生成完了！
                  </span>
                </div>
                {/* GLB / STL 切り替えタブ（STL生成後に表示） */}
                {stlViewUrl && (
                  <div style={{ display: 'flex', gap: 6, padding: '10px 16px 0' }}>
                    <button
                      onClick={() => setShowStl(false)}
                      style={{
                        flex: 1, padding: '7px', fontSize: '0.78rem', fontWeight: 700,
                        borderRadius: 'var(--radius-btn)', cursor: 'pointer',
                        fontFamily: 'var(--font-base)',
                        border: `2px solid ${!showStl ? 'var(--color-pink)' : 'var(--color-border)'}`,
                        background: !showStl ? '#FFEDF4' : 'white',
                        color: !showStl ? 'var(--color-pink)' : 'var(--color-text-muted)',
                      }}
                    >
                      🎨 GLBビュー
                    </button>
                    <button
                      onClick={() => setShowStl(true)}
                      style={{
                        flex: 1, padding: '7px', fontSize: '0.78rem', fontWeight: 700,
                        borderRadius: 'var(--radius-btn)', cursor: 'pointer',
                        fontFamily: 'var(--font-base)',
                        border: `2px solid ${showStl ? 'var(--color-purple)' : 'var(--color-border)'}`,
                        background: showStl ? '#F5EDFF' : 'white',
                        color: showStl ? 'var(--color-purple)' : 'var(--color-text-muted)',
                      }}
                    >
                      🔧 STLビュー
                    </button>
                  </div>
                )}

                <Viewer3D
                  glbUrl={taskStatus.glb_url}
                  stlUrl={showStl && stlViewUrl ? stlViewUrl : undefined}
                  height={350}
                />

                {taskStatus.stl_url && (
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* STL + 印刷ボタン */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        id="download-stl-btn"
                        onClick={handleDownload}
                        className="btn-primary"
                        style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}
                      >
                        <Download size={18} />
                        STLをダウンロード
                      </button>
                      <button
                        onClick={() => alert('印刷機能は近日公開予定です！')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '14px 16px',
                          background: 'white', color: 'var(--color-text-sub)',
                          border: '2px solid var(--color-border)', borderRadius: 'var(--radius-btn)',
                          cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-base)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Printer size={16} /> 印刷する
                      </button>
                    </div>

                    {/* GLBダウンロード */}
                    {taskStatus.glb_url && (
                      <button
                        id="download-glb-btn"
                        onClick={handleDownloadGlb}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                          padding: '12px', background: 'white', color: 'var(--color-purple)',
                          border: '2px solid #DDB3F5', borderRadius: 'var(--radius-btn)',
                          cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
                          fontFamily: 'var(--font-base)', width: '100%',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F5EDFF' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                      >
                        <Download size={16} />
                        💾 GLBをダウンロード（3Dデータ）
                      </button>
                    )}

                    {/* ─── 後処理セクション ─── */}
                    <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 14, marginTop: 4 }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🔧 後処理オプション
                      </p>

                      {/* ストラップ穴 */}
                      <div
                        style={{
                          background: '#FFF9FB', border: '1.5px solid var(--color-pink-light)',
                          borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 10,
                        }}
                      >
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-pink)', marginBottom: 10 }}>
                          🔗 ストラップ穴（横向き・左右貫通）
                        </p>
                        {[
                          { label: '前後位置 (前↔奥)', value: holeOffsetY,  min: -50, max: 50, step: 1,    unit: '%',  setter: setHoleOffsetY },
                          { label: '高さ（上端から）',  value: holeDepthMm,  min: 1,   max: 20, step: 0.5,  unit: 'mm', setter: setHoleDepthMm },
                          { label: '穴の半径',           value: holeRadiusMm, min: 0.5, max: 3,  step: 0.25, unit: 'mm', setter: setHoleRadiusMm },
                        ].map(({ label, value, min, max, step, unit, setter }) => (
                          <div key={label} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-sub)', fontWeight: 600 }}>{label}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-pink)', fontWeight: 700 }}>{value}{unit}</span>
                            </div>
                            <input type="range" min={min} max={max} step={step} value={value}
                              onChange={e => setter(Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-pink)' }} />
                          </div>
                        ))}
                        <button
                          onClick={handleAddStrapHole}
                          disabled={postProcessing === 'strap'}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                            width: '100%', padding: '10px', marginTop: 4,
                            background: postProcessing === 'strap' ? '#f3f4f6' : 'var(--color-pink)',
                            color: postProcessing === 'strap' ? 'var(--color-text-muted)' : 'white',
                            border: 'none', borderRadius: 'var(--radius-btn)',
                            cursor: postProcessing === 'strap' ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-base)',
                          }}
                        >
                          {postProcessing === 'strap'
                            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> 処理中（1〜2分）…</>
                            : <><Download size={14} /> 穴あきSTLを生成・ダウンロード</>}
                        </button>
                        {strapBlobUrl && (
                          <a href={strapBlobUrl} download={`${title || 'uchi-no-ko'}_hole.stl`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                              marginTop: 6, padding: '8px', fontSize: '0.78rem',
                              background: '#E8FFF4', color: '#22863a',
                              border: '2px solid #90D4A4', borderRadius: 'var(--radius-btn)',
                              textDecoration: 'none', fontWeight: 700,
                            }}
                          >
                            <Download size={13} /> 再ダウンロード
                          </a>
                        )}
                      </div>

                      {/* 台座追加 */}
                      <div
                        style={{
                          background: '#F9F5FF', border: '1.5px solid #DDB3F5',
                          borderRadius: 'var(--radius-md)', padding: '12px 14px',
                        }}
                      >
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-purple)', marginBottom: 10 }}>
                          🔳 台座の設定
                        </p>
                        {[
                          { label: '台座の高さ',       value: baseHeightMm,  min: 1, max: 10, step: 0.5, unit: 'mm', setter: setBaseHeightMm },
                          { label: 'モデルからの張り出し', value: baseMarginPct, min: 0, max: 50, step: 5,   unit: '%',  setter: setBaseMarginPct },
                        ].map(({ label, value, min, max, step, unit, setter }) => (
                          <div key={label} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-sub)', fontWeight: 600 }}>{label}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-purple)', fontWeight: 700 }}>{value}{unit}</span>
                            </div>
                            <input type="range" min={min} max={max} step={step} value={value}
                              onChange={e => setter(Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-purple)' }} />
                          </div>
                        ))}
                        <button
                          onClick={handleAddBase}
                          disabled={postProcessing === 'base'}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                            width: '100%', padding: '10px', marginTop: 4,
                            background: postProcessing === 'base' ? '#f3f4f6' : 'var(--color-purple)',
                            color: postProcessing === 'base' ? 'var(--color-text-muted)' : 'white',
                            border: 'none', borderRadius: 'var(--radius-btn)',
                            cursor: postProcessing === 'base' ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-base)',
                          }}
                        >
                          {postProcessing === 'base'
                            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> 処理中（1〜2分）…</>
                            : <><Download size={14} /> 台座付きSTLを生成・ダウンロード</>}
                        </button>
                        {baseBlobUrl && (
                          <a href={baseBlobUrl} download={`${title || 'uchi-no-ko'}_base.stl`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                              marginTop: 6, padding: '8px', fontSize: '0.78rem',
                              background: '#F5EDFF', color: 'var(--color-purple)',
                              border: '2px solid #DDB3F5', borderRadius: 'var(--radius-btn)',
                              textDecoration: 'none', fontWeight: 700,
                            }}
                          >
                            <Download size={13} /> 再ダウンロード
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* エラー */}
            {step === 'error' && (
              <div
                style={{
                  background: 'white',
                  border: '2px solid #FFAAAA',
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 32px',
                  textAlign: 'center',
                  boxShadow: '0 4px 20px rgba(239,68,68,0.1)',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>😢</div>
                <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 800, color: '#ef4444', marginBottom: 8, fontSize: '1rem' }}>
                  うまくいかなかった…
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-sub)' }}>
                  別の画像を試してみてね！
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes float   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes glow-pulse {
          0%,100% { box-shadow: 0 0 16px rgba(255,107,157,0.2); }
          50%      { box-shadow: 0 0 32px rgba(255,107,157,0.5); }
        }
        @keyframes bounce-in {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </main>
  )
}
