// デモページ（審査員向け）— API呼び出しなし、事前用意したGLBを表示
import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, RefreshCw, CheckCircle, Loader2 } from 'lucide-react'
import { Dropzone } from '../components/Dropzone'
import { Viewer3D } from '../components/Viewer3D'
import { useIsMobile } from '../hooks/useIsMobile'

// ─── デモ用データ ─────────────────────────────────────────────────────────────
// frontend/public/demo/ に配置するファイル名と対応している
const DEMO_MODELS = [
  { glbUrl: '/demo/model1.glb', stlUrl: '/demo/model1.stl' },
  // model2, model3 を追加する場合はここにコメントアウトを外す
  // { glbUrl: '/demo/model2.glb', stlUrl: '/demo/model2.stl' },
  // { glbUrl: '/demo/model3.glb', stlUrl: '/demo/model3.stl' },
]

// フェイクプログレスの時間設定（ms）
const PROGRESS_STAGES = [
  { until: 2000,  target: 35 },   // アップロード
  { until: 5000,  target: 75 },   // Tripo3D処理
  { until: 7500,  target: 95 },   // メッシュ変換
  { until: 8800,  target: 100 },  // 完了
]

const STEPS = [
  { label: '画像を選んでね' },
  { label: '3D生成中…' },
  { label: 'できた！' },
]

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

type Step = 'idle' | 'depth_preview' | 'generating' | 'done'

export default function Demo() {
  const isMobile = useIsMobile()
  const [step, setStep] = useState<Step>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(0)
  const [demoModel, setDemoModel] = useState(DEMO_MODELS[0])
  const [modelError, setModelError] = useState(false)
  const [triedFallback, setTriedFallback] = useState(false)

  const startTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const currentStepIndex = { idle: 0, depth_preview: 0, generating: 1, done: 2 }[step]

  // フェイクプログレスアニメーション
  useEffect(() => {
    if (step !== 'generating') return

    startTimeRef.current = performance.now()

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current
      let prog = 0

      for (const stage of PROGRESS_STAGES) {
        if (elapsed >= stage.until) {
          prog = stage.target
        } else {
          const prev = PROGRESS_STAGES[PROGRESS_STAGES.indexOf(stage) - 1]
          const prevTarget = prev?.target ?? 0
          const prevUntil = prev?.until ?? 0
          const ratio = (elapsed - prevUntil) / (stage.until - prevUntil)
          prog = prevTarget + (stage.target - prevTarget) * Math.min(ratio, 1)
          break
        }
      }

      setProgress(Math.round(prog))

      if (elapsed >= PROGRESS_STAGES[PROGRESS_STAGES.length - 1].until) {
        setStep('done')
        launchConfetti()
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [step])

  const handleFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setStep('depth_preview')
  }, [])

  const handleGenerate = useCallback(() => {
    if (!previewUrl) return
    // デモごとにランダムでモデルを選択
    setDemoModel(DEMO_MODELS[Math.floor(Math.random() * DEMO_MODELS.length)])
    setModelError(false)
    setTriedFallback(false)
    setProgress(0)
    setStep('generating')
  }, [previewUrl])

  const handleReset = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setStep('idle')
    setPreviewUrl(null)
    setTitle('')
    setProgress(0)
  }, [])

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}>
      <div className="page-container" style={{ paddingTop: isMobile ? 16 : 28, paddingBottom: 40 }}>

        {/* DEMOバッジ */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{
            background: '#FFF3CD', color: '#856404',
            border: '1.5px solid #FFD700',
            borderRadius: 100, padding: '4px 14px',
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
          }}>
            ⭐ DEMO MODE
          </span>
        </div>

        {/* ステップインジケーター */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: isMobile ? 32 : 48, flexWrap: 'nowrap' }}>
          {STEPS.map(({ label }, i) => {
            const isDone = i < currentStepIndex
            const isCurrent = i === currentStepIndex
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1, color: isCurrent ? 'var(--color-pink)' : isDone ? 'var(--color-purple)' : '#ccc', transition: 'color 0.3s' }}>
                    {isDone ? '✓' : i + 1}
                  </span>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px clamp(8px, 2vw, 16px)', borderRadius: 100,
                    fontSize: 'clamp(0.75rem, 2vw, 0.88rem)', fontWeight: 700, whiteSpace: 'nowrap', transition: 'all 0.3s ease',
                    ...(isCurrent
                      ? { background: 'var(--color-pink)', color: 'white', boxShadow: '0 4px 14px rgba(107,159,255,0.35)' }
                      : isDone
                      ? { background: '#EDF2FF', color: 'var(--color-pink)', border: 'none' }
                      : { background: '#F3F4F6', color: '#bbb', border: '1.5px solid #E5E7EB' }),
                  }}>
                    {label}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: '1rem', visibility: 'hidden', lineHeight: 1 }}>0</span>
                    <div style={{ width: 'clamp(15px, 4vw, 40px)', height: 2, borderRadius: 100, background: i < currentStepIndex ? 'var(--color-pink)' : '#ddd', transition: 'background 0.3s' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 2カラム */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 28, alignItems: 'start' }}>

          {/* 左: 入力 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {step === 'idle' && <Dropzone onFile={handleFile} />}

            {step === 'depth_preview' && previewUrl && (
              <div
                style={{ border: '2.5px dashed var(--color-pink-light)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0]
                    if (f) handleFile(f)
                  }
                  input.click()
                }}
              >
                <img src={previewUrl} alt="アップロード画像" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block', background: 'linear-gradient(135deg,rgba(255,237,244,0.6),rgba(245,237,255,0.6))' }} />
                <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.45)', color: 'white', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
                  📸 タップで変更
                </div>
              </div>
            )}

            {/* タイトル */}
            <div style={{ border: '1.5px solid #d0d8e8', borderRadius: 'var(--radius-md)', padding: isMobile ? '10px 12px' : '12px 16px', background: '#ffffff' }}>
              <label htmlFor="demo-title" style={{ display: 'block', fontWeight: 700, fontSize: '0.72rem', marginBottom: 8, color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                作品タイトル（任意）
              </label>
              <input
                id="demo-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 推しの名前 / うちの子 2024"
                style={{ width: '100%', padding: '12px 16px', background: '#ffffff', border: '1.5px solid #d0d8e8', borderRadius: 'var(--radius-btn)', color: 'var(--color-text)', fontSize: '0.95rem', outline: 'none', fontFamily: 'var(--font-base)', fontWeight: 500, transition: 'border-color 0.2s' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-pink)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#d0d8e8' }}
              />
            </div>

            {/* 生成ボタン（画像未選択時はグレー） */}
            {step === 'idle' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '16px', background: '#D1D5DB', color: '#888', border: 'none', borderRadius: 'var(--radius-btn)', fontSize: '1.05rem', fontWeight: 700, cursor: 'not-allowed', userSelect: 'none' }}>
                ✨ 3Dにする！
              </div>
            )}

            {step === 'depth_preview' && (
              <button onClick={handleGenerate} className="btn-primary" style={{ justifyContent: 'center', width: '100%', padding: '16px', fontSize: '1.05rem' }}>
                ✨ 3Dにする！
              </button>
            )}

            {(step === 'done') && (
              <button onClick={handleReset} className="btn-outline" style={{ justifyContent: 'center', width: '100%' }}>
                <RefreshCw size={16} />
                もう一度作る 🔄
              </button>
            )}
          </div>

          {/* 右: プレビュー */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 生成中 */}
            {step === 'generating' && (
              <div style={{ background: 'var(--nm-bg)', border: '2.5px solid var(--color-pink-light)', borderRadius: 'var(--radius-lg)', padding: '48px 32px', textAlign: 'center', boxShadow: '0 0 24px rgba(255,107,157,0.2)', animation: 'glow-pulse 2s ease-in-out infinite' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>⚙️</div>
                <Loader2 size={36} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>3Dモデルを生成中...</p>
                <p style={{ color: 'var(--color-text-sub)', fontSize: '0.875rem', marginTop: 8, fontWeight: 500 }}>
                  ⏳ Tripo3D が処理中です（1〜3分）
                </p>
                <div style={{ marginTop: 20 }}>
                  <div style={{ height: 8, background: '#FFD6E8', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-pink), var(--color-purple))', borderRadius: 100, transition: 'width 0.3s ease' }} />
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-pink)', marginTop: 6, fontWeight: 700 }}>{progress}%</p>
                </div>
              </div>
            )}

            {/* 完成 */}
            {step === 'done' && (
              <div style={{ background: 'var(--nm-bg)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(40,167,69,0.15)', animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <div style={{ padding: '14px 16px', background: '#E8FFF4', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid #90D4A4' }}>
                  <CheckCircle size={20} color="#22863a" />
                  <span style={{ fontWeight: 800, color: '#22863a', fontSize: '1rem' }}>できた！🎉 3D生成完了！</span>
                </div>

                {modelError ? (
                  <div style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#F9F9F9' }}>
                    <span style={{ fontSize: '3rem' }}>📂</span>
                    <p style={{ fontWeight: 700, color: 'var(--color-text-sub)', fontSize: '0.9rem' }}>
                      GLBファイルを配置してください
                    </p>
                    <code style={{ fontSize: '0.75rem', color: '#aaa', background: '#F3F4F6', padding: '4px 10px', borderRadius: 6 }}>
                      public/demo/model1.glb
                    </code>
                  </div>
                ) : (
                  <Viewer3D
                    key={demoModel.glbUrl}
                    glbUrl={demoModel.glbUrl}
                    height={350}
                    onError={() => {
                      if (!triedFallback) {
                        setTriedFallback(true)
                        setDemoModel(DEMO_MODELS[0])
                      } else {
                        setModelError(true)
                      }
                    }}
                  />
                )}

                <div style={{ padding: '16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* STLダウンロード */}
                  <a
                    href={demoModel.stlUrl}
                    download={`${title || 'uchi-no-ko'}.stl`}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', fontSize: '0.95rem', textDecoration: 'none', borderRadius: 'var(--radius-btn)', fontWeight: 700, color: 'white' }}
                  >
                    <Download size={18} />
                    ダウンロードして印刷する
                  </a>

                  {/* GLBダウンロード */}
                  <a
                    href={demoModel.glbUrl}
                    download={`${title || 'uchi-no-ko'}.glb`}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '12px', background: 'var(--nm-bg)', color: 'var(--color-purple)', border: 'none', borderRadius: 'var(--radius-btn)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    <Download size={16} />
                    💾 GLBをダウンロード（3Dデータ）
                  </a>

                  {/* 後処理（デモでは説明のみ） */}
                  <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 14, marginTop: 4 }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🔧 後処理オプション
                    </p>
                    <div style={{ background: '#F9F9F9', border: '1.5px dashed #ddd', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)', fontWeight: 600, marginBottom: 4 }}>
                        🔗 ストラップ穴の追加 &nbsp;/&nbsp; 🔳 台座の追加
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#aaa' }}>
                        実際の生成後に利用できます
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes float     { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes glow-pulse {
          0%,100% { box-shadow: 0 0 16px rgba(255,107,157,0.2); }
          50%      { box-shadow: 0 0 32px rgba(255,107,157,0.5); }
        }
        @keyframes bounce-in {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        .confetti-particle {
          position: fixed;
          z-index: 9999;
          pointer-events: none;
          animation: confetti-fall linear forwards;
        }
        @keyframes confetti-fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </main>
  )
}
