// 出品ページ: 既存3DデータをアップロードしてマーケットにListingする
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Loader2, LogIn, Upload, Image as ImageIcon, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthState } from '../components/useAuthState'
import { Viewer3D } from '../components/Viewer3D'
import { uploadWork } from '../lib/api'
import { useIsMobile } from '../hooks/useIsMobile'

const GENRES = [
  { value: 'figure',   label: 'フィギュア' },
  { value: 'anime',    label: 'アニメ' },
  { value: 'cosplay',  label: 'コスプレ' },
  { value: 'original', label: 'オリジナル' },
  { value: 'other',    label: 'その他' },
]

export default function Sell() {
  const { user, loading } = useAuthState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [title, setTitle]       = useState('')
  const [genre, setGenre]       = useState('')
  const [price, setPrice]       = useState('0')
  const [isPublic, setIsPublic] = useState(true)

  const [glbFile, setGlbFile]         = useState<File | null>(null)
  const [glbPreviewUrl, setGlbPreviewUrl] = useState<string | null>(null)
  const [thumbFile, setThumbFile]     = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // GLBドロップゾーン
  const onGlbDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setGlbFile(file)
    const objectUrl = URL.createObjectURL(file)
    setGlbPreviewUrl(objectUrl)
  }, [])

  const { getRootProps: getGlbProps, getInputProps: getGlbInput, isDragActive: isGlbDrag } =
    useDropzone({
      onDrop: onGlbDrop,
      accept: { 'model/gltf-binary': ['.glb'], 'application/octet-stream': ['.glb'] },
      maxFiles: 1,
    })

  // サムネイルドロップゾーン
  const onThumbDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setThumbFile(file)
    const reader = new FileReader()
    reader.onload = e => setThumbPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const { getRootProps: getThumbProps, getInputProps: getThumbInput, isDragActive: isThumbDrag } =
    useDropzone({
      onDrop: onThumbDrop,
      accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
      maxFiles: 1,
    })

  const handleSubmit = async () => {
    if (!glbFile) { setError('GLBファイルを選択してね！'); return }
    if (!title.trim()) { setError('タイトルを入力してね！'); return }
    const priceNum = parseInt(price, 10)
    if (isNaN(priceNum) || priceNum < 0) { setError('価格は0以上の数値にしてね！'); return }

    setError(null)
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('title', title.trim())
      if (genre) form.append('genre', genre)
      form.append('price', String(priceNum))
      form.append('is_public', String(isPublic))
      form.append('glb_file', glbFile)
      if (thumbFile) form.append('thumbnail_file', thumbFile)

      const work = await uploadWork(form)
      navigate(`/works/${work.id}`)
    } catch (e: any) {
      setError(e.message ?? 'アップロードに失敗したよ…もう一度試してね！')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main style={{ paddingTop: 150, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={36} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite' }} />
      </main>
    )
  }

  if (!user) {
    return (
      <main style={{ paddingTop: 150, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-bg)' }}>
        <div style={{ background: 'white', border: '2px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '60px 48px', textAlign: 'center', maxWidth: 400, boxShadow: 'var(--shadow-hover)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontWeight: 800, marginBottom: 10, fontSize: '1.3rem', color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>ログインが必要だよ！</h2>
          <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem', marginBottom: 28, lineHeight: 1.8 }}>出品するにはGoogleでログインしてね🌟</p>
          <Link to="/" className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
            <LogIn size={16} />ホームに戻る
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)', paddingBottom: 60 }}>
      <div className="page-container" style={{ maxWidth: 720, paddingTop: isMobile ? 16 : 24 }}>
        <h2 style={{ fontWeight: 800, fontSize: isMobile ? '1.2rem' : '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 24 }}>
          🛍️ 作品を出品する
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* GLBアップロード */}
          <section style={cardStyle}>
            <label style={labelStyle}>3Dデータ（GLB）<span style={{ color: 'var(--color-pink)' }}>*</span></label>
            {glbFile ? (
              <div style={{ position: 'relative' }}>
                {glbPreviewUrl && (
                  <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '2px solid var(--color-border)' }}>
                    <Viewer3D glbUrl={glbPreviewUrl} height={320} isMarket />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '10px 14px', background: '#F5EDFF', borderRadius: 10, border: '1.5px solid #DDB3F5' }}>
                  <Upload size={15} color="var(--color-purple)" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-purple)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{glbFile.name}</span>
                  <button onClick={() => { setGlbFile(null); setGlbPreviewUrl(null) }} style={iconBtnStyle}><X size={14} /></button>
                </div>
              </div>
            ) : (
              <div
                {...getGlbProps()}
                style={{
                  border: `2.5px dashed ${isGlbDrag ? 'var(--color-pink)' : 'var(--color-pink-light)'}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isGlbDrag ? '#FFEDF4' : 'linear-gradient(135deg, rgba(255,237,244,0.6) 0%, rgba(245,237,255,0.6) 100%)',
                  transition: 'all 0.25s ease',
                  transform: isGlbDrag ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <input {...getGlbInput()} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: isGlbDrag ? '4rem' : '3.5rem', lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(255,107,157,0.3))' }}>
                    {isGlbDrag ? '🎁' : '📦'}
                  </div>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: isGlbDrag ? 'var(--color-pink)' : 'var(--color-text)' }}>
                      {isGlbDrag ? 'ここにドロップしてね！✨' : 'GLBファイルを選んでね！'}
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)', marginTop: 6 }}>
                      クリックまたはドラッグ＆ドロップ · .glb
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* サムネイルアップロード */}
          <section style={cardStyle}>
            <label style={labelStyle}>サムネイル画像（任意）</label>
            {thumbFile ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={thumbPreview ?? ''} alt="サムネイルプレビュー" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)' }} />
                <button onClick={() => { setThumbFile(null); setThumbPreview(null) }} style={{ ...iconBtnStyle, position: 'absolute', top: 8, right: 8, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}><X size={14} /></button>
              </div>
            ) : (
              <div
                {...getThumbProps()}
                style={{
                  border: `2.5px dashed ${isThumbDrag ? 'var(--color-purple)' : '#DDB3F5'}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '32px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isThumbDrag ? '#F5EDFF' : 'rgba(245,237,255,0.4)',
                  transition: 'all 0.25s ease',
                }}
              >
                <input {...getThumbInput()} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <ImageIcon size={32} color={isThumbDrag ? 'var(--color-purple)' : '#DDB3F5'} />
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: isThumbDrag ? 'var(--color-purple)' : 'var(--color-text-sub)' }}>
                    {isThumbDrag ? 'ドロップしてね！' : '画像をドラッグ or クリック'}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)' }}>JPG / PNG / WEBP</p>
                </div>
              </div>
            )}
          </section>

          {/* 作品情報 */}
          <section style={cardStyle}>
            <label style={labelStyle}>タイトル<span style={{ color: 'var(--color-pink)' }}>*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: オリジナルキャラ フィギュア"
              style={inputStyle}
              maxLength={80}
            />
          </section>

          <section style={cardStyle}>
            <label style={labelStyle}>ジャンル</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {GENRES.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGenre(genre === g.value ? '' : g.value)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 100,
                    border: `1.5px solid ${genre === g.value ? 'var(--color-pink)' : 'var(--color-border)'}`,
                    background: genre === g.value ? 'var(--color-pink)' : 'white',
                    color: genre === g.value ? 'white' : 'var(--color-text-sub)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'var(--font-base)',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <label style={labelStyle}>価格（円）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                min={0}
                step={100}
                style={{ ...inputStyle, width: 160 }}
              />
              <span style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem', fontWeight: 600 }}>円</span>
              {parseInt(price, 10) === 0 && (
                <span style={{ padding: '4px 12px', background: '#E8F5E9', color: '#2E7D32', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, border: '1.5px solid #A5D6A7' }}>無料</span>
              )}
            </div>
            <p style={{ color: 'var(--color-text-sub)', fontSize: '0.78rem', marginTop: 6 }}>0円で無料公開。有料の場合はStripeで決済されます。</p>
          </section>

          <section style={cardStyle}>
            <label style={labelStyle}>公開設定</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {([{ v: true, label: '🌐 公開', desc: 'マーケットに表示' }, { v: false, label: '🔒 非公開', desc: '自分のみ閲覧' }] as const).map(({ v, label, desc }) => (
                <button
                  key={String(v)}
                  onClick={() => setIsPublic(v)}
                  style={{
                    flex: 1,
                    padding: '14px 12px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${isPublic === v ? 'var(--color-pink)' : 'var(--color-border)'}`,
                    background: isPublic === v ? '#FFEDF4' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    fontFamily: 'var(--font-base)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isPublic === v ? 'var(--color-pink)' : 'var(--color-text)' }}>{label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)', marginTop: 4 }}>{desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* エラー */}
          {error && (
            <div style={{ padding: '14px 18px', background: '#FFF0F3', border: '1.5px solid #FFCDD2', borderRadius: 12, color: '#C62828', fontWeight: 600, fontSize: '0.9rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* 送信ボタン */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !glbFile}
            className="btn-primary"
            style={{ justifyContent: 'center', fontSize: '1rem', padding: '16px 32px', opacity: !glbFile ? 0.5 : 1 }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                アップロード中...
              </>
            ) : (
              <>
                <Upload size={18} />
                出品する！🎉
              </>
            )}
          </button>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '2px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxShadow: 'var(--shadow-card)',
}

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '0.95rem',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-base)',
}

const inputStyle: React.CSSProperties = {
  padding: '12px 16px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  fontSize: '0.95rem',
  fontFamily: 'var(--font-base)',
  color: 'var(--color-text)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const iconBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: '1.5px solid var(--color-border)',
  background: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  color: 'var(--color-text-sub)',
  flexShrink: 0,
}
