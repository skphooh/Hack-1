// 出品ページ: 新規アップロード & 既存作品の価格設定
import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Loader2, LogIn, Upload, Image as ImageIcon, X, Tag, Download, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthState } from '../components/useAuthState'
import { Viewer3D } from '../components/Viewer3D'
import { uploadWork, fetchWorks, updateWork, type WorkResponse } from '../lib/api'
import { useIsMobile } from '../hooks/useIsMobile'

type Tab = 'upload' | 'price'

const GENRES = [
  { value: 'figure',   label: 'フィギュア' },
  { value: 'anime',    label: 'アニメ' },
  { value: 'cosplay',  label: 'コスプレ' },
  { value: 'original', label: 'オリジナル' },
  { value: 'other',    label: 'その他' },
]

const PRICE_PRESETS = [0, 100, 300, 500, 1000, 2000, 3000, 5000]

export default function Sell() {
  const { user, loading } = useAuthState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [tab, setTab] = useState<Tab>('upload')

  // ── アップロードタブの状態 ──
  const [title, setTitle]           = useState('')
  const [genres, setGenres]         = useState<string[]>([])
  const [price, setPrice]           = useState('0')
  const [isPublic, setIsPublic]     = useState(true)
  const [glbFile, setGlbFile]       = useState<File | null>(null)
  const [glbPreviewUrl, setGlbPreviewUrl] = useState<string | null>(null)
  const [thumbFile, setThumbFile]   = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // ── 価格設定タブの状態 ──
  const [myWorks, setMyWorks]       = useState<WorkResponse[]>([])
  const [priceLoading, setPriceLoading] = useState(false)
  const [prices, setPrices]         = useState<Record<string, string>>({})
  const [saving, setSaving]         = useState<Record<string, boolean>>({})
  const [saved, setSaved]           = useState<Record<string, boolean>>({})

  // GLBドロップゾーン
  const onGlbDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setGlbFile(file)
    setGlbPreviewUrl(URL.createObjectURL(file))
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

  // 価格設定タブ: 自分の作品一覧を取得
  useEffect(() => {
    if (!user || tab !== 'price') return
    setPriceLoading(true)
    fetchWorks({ status: 'done', user_id: user.uid, per_page: 50 })
      .then(r => {
        setMyWorks(r.items)
        const init: Record<string, string> = {}
        r.items.forEach(w => { init[w.id] = String(w.price) })
        setPrices(init)
      })
      .catch(console.error)
      .finally(() => setPriceLoading(false))
  }, [user, tab])

  const handlePriceSave = useCallback(async (workId: string) => {
    const p = parseInt(prices[workId] ?? '0', 10)
    if (isNaN(p) || p < 0) return
    setSaving(prev => ({ ...prev, [workId]: true }))
    try {
      await updateWork(workId, { price: p })
      setMyWorks(prev => prev.map(w => w.id === workId ? { ...w, price: p } : w))
      setSaved(prev => ({ ...prev, [workId]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [workId]: false })), 2000)
    } catch (e) {
      alert('更新に失敗しました')
      console.error(e)
    } finally {
      setSaving(prev => ({ ...prev, [workId]: false }))
    }
  }, [prices])

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
      if (genres.length > 0) form.append('genre', genres.join(','))
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

        <h2 style={{ fontWeight: 800, fontSize: isMobile ? '1.2rem' : '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 20 }}>
          🛍️ 作品を出品する
        </h2>

        {/* タブ */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {([
            { id: 'upload' as Tab, icon: <Upload size={14} />, label: '新規アップロード' },
            { id: 'price'  as Tab, icon: <Tag size={14} />,    label: '価格を設定する' },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: isMobile ? '9px 14px' : '10px 20px',
                borderRadius: 100,
                border: 'none',
                background: tab === t.id ? 'var(--gradient-button)' : 'white',
                color: tab === t.id ? 'white' : 'var(--color-text-sub)',
                fontWeight: 700, fontSize: isMobile ? '0.82rem' : '0.88rem',
                cursor: 'pointer',
                boxShadow: tab === t.id ? '4px 4px 12px #b0bad0' : '3px 3px 8px #c8d0e0, -3px -3px 8px #ffffff',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-base)',
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ══════ 新規アップロードタブ ══════ */}
        {tab === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            <section style={cardStyle}>
              <label style={labelStyle}>3Dデータ（GLB）<span style={{ color: 'var(--color-pink)' }}>*</span></label>
              {glbFile ? (
                <div>
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
                    borderRadius: 'var(--radius-xl)', padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                    background: isGlbDrag ? '#FFEDF4' : 'linear-gradient(135deg, rgba(255,237,244,0.6) 0%, rgba(245,237,255,0.6) 100%)',
                    transition: 'all 0.25s ease', transform: isGlbDrag ? 'scale(1.02)' : 'scale(1)',
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
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)', marginTop: 6 }}>クリックまたはドラッグ＆ドロップ · .glb</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

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
                    borderRadius: 'var(--radius-xl)', padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
                    background: isThumbDrag ? '#F5EDFF' : 'rgba(245,237,255,0.4)', transition: 'all 0.25s ease',
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

            <section style={cardStyle}>
              <label style={labelStyle}>タイトル<span style={{ color: 'var(--color-pink)' }}>*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="例: オリジナルキャラ フィギュア" style={inputStyle} maxLength={80} />
            </section>

            <section style={cardStyle}>
              <label style={labelStyle}>ジャンル<span style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', fontWeight: 500, marginLeft: 6 }}>複数選択OK</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {GENRES.map(g => {
                  const selected = genres.includes(g.value)
                  return (
                    <button
                      key={g.value}
                      onClick={() => setGenres(prev => selected ? prev.filter(v => v !== g.value) : [...prev, g.value])}
                      style={{ padding: '8px 18px', borderRadius: 100, border: `1.5px solid ${selected ? 'var(--color-pink)' : 'var(--color-border)'}`, background: selected ? 'var(--color-pink)' : 'white', color: selected ? 'white' : 'var(--color-text-sub)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-base)' }}
                    >
                      {selected && <span style={{ marginRight: 4 }}>✓</span>}{g.label}
                    </button>
                  )
                })}
              </div>
            </section>

            <section style={cardStyle}>
              <label style={labelStyle}>価格（円）</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} min={0} step={100} style={{ ...inputStyle, width: 160 }} />
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
                  <button key={String(v)} onClick={() => setIsPublic(v)}
                    style={{ flex: 1, padding: '14px 12px', borderRadius: 'var(--radius-lg)', border: `2px solid ${isPublic === v ? 'var(--color-pink)' : 'var(--color-border)'}`, background: isPublic === v ? '#FFEDF4' : 'white', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center', fontFamily: 'var(--font-base)' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isPublic === v ? 'var(--color-pink)' : 'var(--color-text)' }}>{label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-sub)', marginTop: 4 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {error && (
              <div style={{ padding: '14px 18px', background: '#FFF0F3', border: '1.5px solid #FFCDD2', borderRadius: 12, color: '#C62828', fontWeight: 600, fontSize: '0.9rem' }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting || !glbFile} className="btn-primary"
              style={{ justifyContent: 'center', fontSize: '1rem', padding: '16px 32px', opacity: !glbFile ? 0.5 : 1 }}
            >
              {submitting
                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />アップロード中...</>
                : <><Upload size={18} />出品する！🎉</>
              }
            </button>
          </div>
        )}

        {/* ══════ 価格設定タブ ══════ */}
        {tab === 'price' && (
          <>
            <div style={{ padding: '14px 18px', background: '#FFFBF0', border: '1.5px solid #FFD699', borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: '0.82rem', color: '#8B5E00', fontWeight: 600, lineHeight: 1.7 }}>
              💡 <strong>0円</strong>で無料公開、<strong>1円以上</strong>で有料販売。購入者は STL・GLB をダウンロードできます。
            </div>

            {priceLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Loader2 size={32} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
              </div>
            ) : myWorks.length === 0 ? (
              <div className="pop-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎭</p>
                <p style={{ fontWeight: 800, marginBottom: 8 }}>まだ作品がないよ</p>
                <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem', marginBottom: 20 }}>「新規アップロード」タブから3Dデータを出品しよう！</p>
                <button onClick={() => setTab('upload')} className="btn-primary" style={{ margin: '0 auto', display: 'flex' }}>📦 アップロードする</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myWorks.map(work => {
                  const currentPrice = parseInt(prices[work.id] ?? '0', 10)
                  const isPaid = work.price > 0
                  const isDirty = parseInt(prices[work.id] ?? '0', 10) !== work.price

                  return (
                    <div key={work.id} className="pop-card" style={{ padding: isMobile ? '12px' : '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {/* サムネイル */}
                        <div onClick={() => navigate(`/works/${work.id}`)}
                          style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#F5EDFF', cursor: 'pointer' }}
                        >
                          {work.thumbnail_url
                            ? <img src={work.thumbnail_url} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎭</div>
                          }
                        </div>

                        {/* タイトル + バッジ */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <p onClick={() => navigate(`/works/${work.id}`)}
                              style={{ fontWeight: 700, fontSize: isMobile ? '0.88rem' : '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', maxWidth: isMobile ? 120 : 220 }}
                            >
                              {work.title}
                            </p>
                            <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', background: isPaid ? '#FFF0F6' : '#F0FFF4', color: isPaid ? 'var(--color-pink)' : '#22863a', border: `1px solid ${isPaid ? '#FFAECB' : '#90D4A4'}` }}>
                              {isPaid ? `¥${work.price.toLocaleString()} 有料` : '無料'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            <Download size={10} /> {work.downloads}件DL
                          </div>
                        </div>

                        {/* 価格設定 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: isMobile ? '100%' : 'auto' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {PRICE_PRESETS.map(p => (
                              <button key={p} onClick={() => setPrices(prev => ({ ...prev, [work.id]: String(p) }))}
                                style={{ padding: '3px 8px', borderRadius: 100, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', border: `1px solid ${currentPrice === p ? 'var(--color-pink)' : '#d0d8e8'}`, background: currentPrice === p ? '#FFEDF4' : 'white', color: currentPrice === p ? 'var(--color-pink)' : 'var(--color-text-muted)', fontFamily: 'var(--font-base)' }}
                              >
                                {p === 0 ? '無料' : `¥${p}`}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>¥</span>
                            <input type="number" min={0} value={prices[work.id] ?? '0'}
                              onChange={e => setPrices(prev => ({ ...prev, [work.id]: e.target.value }))}
                              style={{ width: 80, padding: '6px 8px', borderRadius: 'var(--radius-btn)', border: `1.5px solid ${isDirty ? 'var(--color-pink)' : '#d0d8e8'}`, fontSize: '0.85rem', fontFamily: 'var(--font-base)', outline: 'none', background: 'white', color: 'var(--color-text)' }}
                            />
                            <button onClick={() => handlePriceSave(work.id)} disabled={saving[work.id] || !isDirty}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 'var(--radius-btn)', border: 'none', background: saved[work.id] ? '#22863a' : isDirty ? 'var(--color-pink)' : '#e5e7eb', color: isDirty || saved[work.id] ? 'white' : '#9ca3af', fontSize: '0.78rem', fontWeight: 700, cursor: isDirty ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-base)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                            >
                              {saving[work.id]
                                ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                : saved[work.id]
                                ? <><Check size={12} /> 保存済み</>
                                : '保存'
                              }
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
