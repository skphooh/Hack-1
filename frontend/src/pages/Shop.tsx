import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, Loader2, Download, Check } from 'lucide-react'
import { useAuthState } from '../components/useAuthState'
import { fetchWorks, updateWork, wakeBackend, type WorkResponse } from '../lib/api'
import { useIsMobile } from '../hooks/useIsMobile'

const PRICE_PRESETS = [0, 100, 300, 500, 1000, 2000, 3000, 5000]

export default function Shop() {
  const { user } = useAuthState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [myWorks, setMyWorks] = useState<WorkResponse[]>([])
  const [sellLoading, setSellLoading] = useState(false)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => { wakeBackend() }, [])

  useEffect(() => {
    if (!user) return
    setSellLoading(true)
    fetchWorks({ status: 'done', user_id: user.uid, per_page: 50 })
      .then(r => {
        setMyWorks(r.items)
        const init: Record<string, string> = {}
        r.items.forEach(w => { init[w.id] = String(w.price) })
        setPrices(init)
      })
      .catch(console.error)
      .finally(() => setSellLoading(false))
  }, [user])

  const handlePriceSave = useCallback(async (workId: string) => {
    const raw = prices[workId]
    const price = parseInt(raw ?? '0', 10)
    if (isNaN(price) || price < 0) return
    setSaving(p => ({ ...p, [workId]: true }))
    try {
      await updateWork(workId, { price })
      setMyWorks(prev => prev.map(w => w.id === workId ? { ...w, price } : w))
      setSaved(p => ({ ...p, [workId]: true }))
      setTimeout(() => setSaved(p => ({ ...p, [workId]: false })), 2000)
    } catch (e) {
      alert('更新に失敗しました')
      console.error(e)
    } finally {
      setSaving(p => ({ ...p, [workId]: false }))
    }
  }, [prices])

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)', paddingBottom: 60 }}>
      <div className="page-container" style={{ paddingTop: isMobile ? 16 : 24 }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: isMobile ? 20 : 28 }}>
          <h1 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Tag size={isMobile ? 20 : 24} color="var(--color-purple)" />
            価格を設定する
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            自分の作品に価格をつけてマーケットで販売できます
          </p>
        </div>

        {!user ? (
          <div className="pop-card" style={{ padding: '48px 40px', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔐</p>
            <p style={{ fontWeight: 800, marginBottom: 8 }}>ログインが必要です</p>
            <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem', marginBottom: 20 }}>Googleログインしてください</p>
            <button onClick={() => navigate('/')} className="btn-primary" style={{ margin: '0 auto', display: 'flex' }}>ホームに戻る</button>
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 18px', background: '#FFFBF0', border: '1.5px solid #FFD699', borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: '0.82rem', color: '#8B5E00', fontWeight: 600, lineHeight: 1.7 }}>
              💡 <strong>0円</strong>で無料公開、<strong>1円以上</strong>で有料販売。購入者は STL・GLB をダウンロードできます。
            </div>

            {sellLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Loader2 size={32} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
              </div>
            ) : myWorks.length === 0 ? (
              <div className="pop-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎭</p>
                <p style={{ fontWeight: 800, marginBottom: 8 }}>まだ作品がないよ</p>
                <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem', marginBottom: 20 }}>3D生成して出品してみよう！</p>
                <button onClick={() => navigate('/generate')} className="btn-primary" style={{ margin: '0 auto', display: 'flex' }}>✨ 3Dにする！</button>
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
                        <div
                          onClick={() => navigate(`/works/${work.id}`)}
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
                            <p
                              onClick={() => navigate(`/works/${work.id}`)}
                              style={{ fontWeight: 700, fontSize: isMobile ? '0.88rem' : '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', maxWidth: isMobile ? 120 : 220 }}
                            >
                              {work.title}
                            </p>
                            <span style={{
                              padding: '2px 8px', borderRadius: 100, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap',
                              background: isPaid ? '#FFF0F6' : '#F0FFF4',
                              color: isPaid ? 'var(--color-pink)' : '#22863a',
                              border: `1px solid ${isPaid ? '#FFAECB' : '#90D4A4'}`,
                            }}>
                              {isPaid ? `¥${work.price.toLocaleString()} 有料` : '無料'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            <Download size={10} /> {work.downloads}件DL
                          </div>
                        </div>

                        {/* 価格設定エリア */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: isMobile ? '100%' : 'auto' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {PRICE_PRESETS.map(p => (
                              <button
                                key={p}
                                onClick={() => setPrices(prev => ({ ...prev, [work.id]: String(p) }))}
                                style={{
                                  padding: '3px 8px', borderRadius: 100, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                                  border: `1px solid ${currentPrice === p ? 'var(--color-pink)' : '#d0d8e8'}`,
                                  background: currentPrice === p ? '#FFEDF4' : 'white',
                                  color: currentPrice === p ? 'var(--color-pink)' : 'var(--color-text-muted)',
                                  fontFamily: 'var(--font-base)',
                                }}
                              >
                                {p === 0 ? '無料' : `¥${p}`}
                              </button>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>¥</span>
                            <input
                              type="number"
                              min={0}
                              value={prices[work.id] ?? '0'}
                              onChange={e => setPrices(prev => ({ ...prev, [work.id]: e.target.value }))}
                              style={{
                                width: 80, padding: '6px 8px', borderRadius: 'var(--radius-btn)',
                                border: `1.5px solid ${isDirty ? 'var(--color-pink)' : '#d0d8e8'}`,
                                fontSize: '0.85rem', fontFamily: 'var(--font-base)', outline: 'none',
                                background: 'white', color: 'var(--color-text)',
                              }}
                            />
                            <button
                              onClick={() => handlePriceSave(work.id)}
                              disabled={saving[work.id] || !isDirty}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '6px 12px', borderRadius: 'var(--radius-btn)',
                                border: 'none',
                                background: saved[work.id] ? '#22863a' : isDirty ? 'var(--color-pink)' : '#e5e7eb',
                                color: isDirty || saved[work.id] ? 'white' : '#9ca3af',
                                fontSize: '0.78rem', fontWeight: 700, cursor: isDirty ? 'pointer' : 'not-allowed',
                                fontFamily: 'var(--font-base)', transition: 'all 0.2s', whiteSpace: 'nowrap',
                              }}
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
