import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles, Download, Heart, ArrowLeft } from 'lucide-react'
import { Viewer3D } from '../components/Viewer3D'
import { fetchWork, toggleLike, type WorkResponse } from '../lib/api'
import { useAuthState } from '../components/useAuthState'

export default function WorkDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthState()

  const [work, setWork] = useState<WorkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false) // 詳細ではシンプルに初期化

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const data = await fetchWork(id)
        setWork(data)
      } catch (e) {
        console.error('Work fetch error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleLike = async () => {
    if (!user || !work) return
    try {
      const res = await toggleLike(work.id)
      setIsLiked(res.liked)
      setWork((prev) => (prev ? { ...prev, likes_count: res.likes_count } : prev))
    } catch (e) {
      console.error(e)
    }
  }

  const handleDownload = () => {
    if (!work?.stl_url) return
    const a = document.createElement('a')
    a.href = work.stl_url
    a.download = `${work.title ?? 'model'}.stl`
    a.click()
  }

  if (loading) {
    return (
      <main style={{ paddingTop: 80, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Sparkles size={40} className="animate-glow" color="var(--color-accent-primary)" />
      </main>
    )
  }

  if (!work) {
    return (
      <main style={{ paddingTop: 80, minHeight: '100vh', textAlign: 'center' }}>
        <h2>作品が見つかりません</h2>
        <button onClick={() => navigate('/market')} className="btn-outline" style={{ marginTop: 24 }}>マーケットに戻る</button>
      </main>
    )
  }

  return (
    <main style={{ paddingTop: 80, minHeight: '100vh', paddingBottom: 40 }}>
      <div className="page-container section">
        <button
          onClick={() => navigate('/market')}
          className="btn-outline"
          style={{ marginBottom: 24, padding: '8px 16px' }}
        >
          <ArrowLeft size={16} />
          マーケットに戻る
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
          {/* 左側: 3Dビューア */}
          <div className="glass-card" style={{ padding: 16 }}>
            {work.glb_url ? (
               <Viewer3D glbUrl={work.glb_url} height={500} />
            ) : (
               <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)' }}>
                 <p>3Dモデルデータがありません</p>
               </div>
            )}
          </div>

          {/* 右側: 作品情報 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>{work.title}</h1>
              {work.genre && (
                <span style={{ padding: '4px 12px', background: 'rgba(167, 139, 250, 0.15)', color: 'var(--color-accent-primary)', borderRadius: 100, fontSize: '0.85rem' }}>
                  {work.genre}
                </span>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
                <button
                  onClick={handleLike}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: 100, padding: '8px 16px',
                    color: isLiked ? 'var(--color-accent-secondary)' : 'var(--color-text-primary)', cursor: 'pointer',
                  }}
                >
                  <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                  {work.likes_count} いいね
                </button>
              </div>
            </div>

            {work.stl_url && (
              <button onClick={handleDownload} className="btn-primary" style={{ padding: '16px', justifyContent: 'center', fontSize: '1.1rem' }}>
                <Download size={20} />
                STLをダウンロード
              </button>
            )}

            {work.thumbnail_url && (
              <div className="glass-card" style={{ padding: 16 }}>
                <p style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--color-text-secondary)' }}>元画像</p>
                <img src={work.thumbnail_url} alt="元画像" style={{ width: '100%', borderRadius: 8, objectFit: 'contain' }} />
              </div>
            )}

            {/* 本人のみ削除可能 */}
            {user && work.author_firebase_uid === user.uid && (
              <button 
                onClick={async () => {
                  if (!window.confirm('この作品を本当に削除しますか？')) return
                  try {
                    const { deleteWork } = await import('../lib/api')
                    await deleteWork(work.id)
                    navigate('/market')
                  } catch (e) {
                    console.error(e)
                    alert('削除に失敗しました')
                  }
                }}
                className="btn-outline" 
                style={{ marginTop: 'auto', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                作品を削除する
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
