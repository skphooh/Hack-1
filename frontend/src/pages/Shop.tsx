import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Tag, Loader2, Download, Check, ChevronRight } from 'lucide-react'
import { useAuthState } from '../components/useAuthState'
import { WorkCard } from '../components/WorkCard'
import { fetchWorks, fetchMyPurchases, updateWork, wakeBackend, type WorkResponse, type PurchaseItem } from '../lib/api'
import { useIsMobile } from '../hooks/useIsMobile'

type Tab = 'buy' | 'sell'

const PRICE_PRESETS = [0, 100, 300, 500, 1000, 2000, 3000, 5000]

export default function Shop() {
  const { user } = useAuthState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<Tab>('buy')

  // ── 購入タブ ──
  const [paidWorks, setPaidWorks] = useState<WorkResponse[]>([])
  const [buyLoading, setBuyLoading] = useState(true)
  const [buyTotal, setBuyTotal] = useState(0)

  // ── 出品タブ ──
  const [myWorks, setMyWorks] = useState<WorkResponse[]>([])
  const [sellLoading, setSellLoading] = useState(false)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  // ── 購入履歴 ──
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])

  // ページ表示時にバックエンドを起こす
  useEffect(() => { wakeBackend() }, [])

  // 有料作品一覧を取得
  useEffect(() => {
    setBuyLoading(true)
    fetchWorks({ status: 'done', min_price: 1, per_page: 48 })
      .then(r => { setPaidWorks(r.items); setBuyTotal(r.total) })
      .catch(console.error)
      .finally(() => setBuyLoading(false))
  }, [])

  // 自分の作品一覧と購入履歴を取得（出品タブ・ログイン時）
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

    fetchMyPurchases()
      .then(r => setPurchases(r.items))
      .catch(console.error)
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
            <ShoppingBag size={isMobile ? 20 : 24} color="var(--color-purple)" />
            うちの子ショップ
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            3Dデータを売ったり・買ったりできます
          </p>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 20 : 28 }}>
          {([
            { id: 'buy',  icon: <ShoppingBag size={15} />, label: '購入する', count: buyTotal },
            { id: 'sell', icon: <Tag size={15} />,         label: '出品する', count: myWorks.length },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: isMobile ? '9px 16px' : '10px 22px',
                borderRadius: 100,
                border: 'none',
                background: tab === t.id ? 'var(--gradient-button)' : 'var(--nm-bg)',
                color: tab === t.id ? 'white' : 'var(--color-text-sub)',
                fontWeight: 700, fontSize: isMobile ? '0.82rem' : '0.9rem',
                cursor: 'pointer',
                boxShadow: tab === t.id ? '4px 4px 12px #b0bad0' : 'var(--nm-raised-sm)',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-base)',
              }}
            >
              {t.icon} {t.label}
              {t.count > 0 && (
                <span style={{ padding: '1px 7px', background: tab === t.id ? 'rgba(255,255,255,0.25)' : '#F5EDFF', color: tab === t.id ? 'white' : 'var(--color-purple)', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700 }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════ 購入タブ ════════ */}
        {tab === 'buy' && (
          <>
            {/* 購入履歴バナー（ログイン時） */}
            {user && purchases.length > 0 && (
              <div
                onClick={() => navigate('/purchases')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F5EDFF', border: '1.5px solid #DDB3F5', borderRadius: 'var(--radius-md)', marginBottom: 20, cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-purple)' }}>
                  🛍️ 購入済みの作品 {purchases.length}件
                </span>
                <ChevronRight size={16} color="var(--color-purple)" />
              </div>
            )}

            {buyLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Loader2 size={32} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--color-text-sub)', fontWeight: 600 }}>読み込み中...</p>
              </div>
            ) : paidWorks.length === 0 ? (
              <div className="pop-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏪</p>
                <p style={{ fontWeight: 800, marginBottom: 8 }}>まだ有料作品がないよ</p>
                <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem' }}>出品タブから自分の作品に値段をつけてみよう！</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: isMobile ? 10 : 20,
                }}
              >
                {paidWorks.map((work, i) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    index={i}
                    onClick={() => navigate(`/works/${work.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════ 出品タブ ════════ */}
        {tab === 'sell' && (
          <>
            {!user ? (
              <div className="pop-card" style={{ padding: '48px 40px', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔐</p>
                <p style={{ fontWeight: 800, marginBottom: 8 }}>ログインが必要です</p>
                <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem', marginBottom: 20 }}>出品するにはGoogleログインしてください</p>
                <button onClick={() => navigate('/')} className="btn-primary" style={{ margin: '0 auto', display: 'flex' }}>ホームに戻る</button>
              </div>
            ) : (
              <>
                {/* 出品の説明 */}
                <div style={{ padding: '14px 18px', background: '#FFFBF0', border: '1.5px solid #FFD699', borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: '0.82rem', color: '#8B5E00', fontWeight: 600, lineHeight: 1.7 }}>
                  💡 作品に価格を設定すると有料出品されます。<strong>0円</strong>で無料公開、<strong>1円以上</strong>で有料販売。購入者は STL・GLB をダウンロードできます。
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

                            {/* タイトル + ステータスバッジ */}
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
                              {/* プリセットボタン */}
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

                              {/* カスタム入力 + 保存 */}
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
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
