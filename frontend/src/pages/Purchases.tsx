import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Download, LogIn, Loader2 } from 'lucide-react'
import { useAuthState } from '../components/useAuthState'
import { fetchMyPurchases, wakeBackend, type PurchaseItem } from '../lib/api'
import { useIsMobile } from '../hooks/useIsMobile'

export default function Purchases() {
  const { user, loading } = useAuthState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [fetching, setFetching] = useState(false)

  useEffect(() => { wakeBackend() }, [])

  useEffect(() => {
    if (!user) return
    setFetching(true)
    fetchMyPurchases()
      .then(r => setPurchases(r.items))
      .catch(console.error)
      .finally(() => setFetching(false))
  }, [user])

  if (loading) return null

  if (!user) {
    return (
      <main style={{ paddingTop: 150, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pop-card" style={{ padding: '48px 40px', textAlign: 'center', maxWidth: 380, width: '90%' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.2rem' }}>ログインが必要です</h2>
          <Link to="/" className="btn-primary" style={{ justifyContent: 'center', marginTop: 20, display: 'inline-flex' }}>
            <LogIn size={16} /> ホームに戻る
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}>
      <div className="page-container" style={{ paddingTop: isMobile ? 16 : 24, paddingBottom: 40 }}>
        <h2 style={{ fontWeight: 800, marginBottom: isMobile ? 16 : 20, fontSize: isMobile ? '1.1rem' : '1.2rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingBag size={20} color="var(--color-purple)" />
          購入した作品
          {!fetching && (
            <span style={{ padding: '2px 12px', background: '#F5EDFF', color: 'var(--color-purple)', border: '1.5px solid #DDB3F5', borderRadius: 100, fontSize: '0.82rem', fontWeight: 700 }}>
              {purchases.length}件
            </span>
          )}
        </h2>

        {fetching ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={32} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--color-text-sub)', fontWeight: 600 }}>読み込み中...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="pop-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', marginBottom: 16 }}>🛍️</p>
            <p style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.1rem' }}>まだ購入した作品がないよ！</p>
            <p style={{ color: 'var(--color-text-sub)', marginBottom: 24, fontSize: '0.9rem' }}>マーケットで気になる作品を探してみよう</p>
            <Link to="/market" className="btn-primary" style={{ display: 'inline-flex' }}>
              🛍️ マーケットを見る
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {purchases.map(p => (
              <div key={p.id} className="pop-card" style={{ padding: isMobile ? '14px' : '18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {/* サムネイル */}
                <div
                  onClick={() => navigate(`/works/${p.work_id}`)}
                  style={{ width: isMobile ? 56 : 72, height: isMobile ? 56 : 72, flexShrink: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#F5EDFF', cursor: 'pointer' }}
                >
                  {p.work.thumbnail_url
                    ? <img src={p.work.thumbnail_url} alt={p.work.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎭</div>
                  }
                </div>

                {/* 情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    onClick={() => navigate(`/works/${p.work_id}`)}
                    style={{ fontWeight: 700, fontSize: isMobile ? '0.9rem' : '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--color-text)' }}
                  >
                    {p.work.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 3 }}>
                    ¥{p.amount.toLocaleString()} · {new Date(p.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>

                {/* ダウンロードボタン */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {p.work.stl_url && (
                    <a
                      href={p.work.stl_url}
                      download={`${p.work.title}.stl`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--gradient-button)', color: 'white', borderRadius: 'var(--radius-btn)', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      <Download size={14} /> STL
                    </a>
                  )}
                  {p.work.glb_url && (
                    <a
                      href={p.work.glb_url}
                      download={`${p.work.title}.glb`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'white', color: 'var(--color-purple)', border: '1.5px solid #DDB3F5', borderRadius: 'var(--radius-btn)', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      <Download size={14} /> GLB
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  )
}
