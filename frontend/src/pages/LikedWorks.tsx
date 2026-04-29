import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Heart } from 'lucide-react'
import { useAuthState } from '../components/useAuthState'
import { WorkCard } from '../components/WorkCard'
import { fetchLikedWorks, toggleLike, type WorkResponse } from '../lib/api'

export default function LikedWorks() {
  const { user, loading } = useAuthState()
  const navigate = useNavigate()
  const [works, setWorks] = useState<WorkResponse[]>([])
  const [fetching, setFetching] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setFetching(true)
      try {
        const res = await fetchLikedWorks()
        setWorks(res.items)
        setLikedIds(new Set(res.items.map(w => w.id)))
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [user])

  const handleLike = async (workId: string) => {
    if (!user) return
    try {
      const res = await toggleLike(workId)
      setLikedIds(prev => {
        const next = new Set(prev)
        if (res.liked) next.add(workId)
        else next.delete(workId)
        return next
      })
      setWorks(prev =>
        res.liked
          ? prev.map(w => w.id === workId ? { ...w, likes_count: res.likes_count } : w)
          : prev.filter(w => w.id !== workId)
      )
    } catch (e) {
      console.error('いいねエラー:', e)
    }
  }

  if (loading) {
    return (
      <main style={{ paddingTop: 112, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Loader2 size={36} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    )
  }

  if (!user) {
    return (
      <main style={{ paddingTop: 112, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: 16 }}>🔐</p>
          <p style={{ fontWeight: 700, color: 'var(--color-text-sub)' }}>ログインが必要だよ！</p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ paddingTop: 112, minHeight: '100vh' }}>
      <div className="page-container section">
        {/* 見出し */}
        <h2
          style={{
            fontWeight: 800,
            marginBottom: 24,
            fontSize: '1.2rem',
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Heart size={20} color="var(--color-pink)" fill="var(--color-pink)" />
          いいねした作品
          {!fetching && (
            <span
              style={{
                padding: '2px 12px',
                background: '#FFEDF4',
                color: 'var(--color-pink)',
                border: '1.5px solid var(--color-pink-light)',
                borderRadius: 100,
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              {works.length}件
            </span>
          )}
        </h2>

        {fetching ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={32} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--color-text-sub)', fontWeight: 600 }}>読み込み中...</p>
          </div>
        ) : works.length === 0 ? (
          <div
            style={{
              border: '1.5px solid #d0d8e8',
              borderRadius: 'var(--radius-xl)',
              padding: '80px 40px',
              textAlign: 'center',
              background: 'var(--nm-bg)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <p style={{ fontSize: '3.5rem', marginBottom: 16 }}>💔</p>
            <p style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.1rem', color: 'var(--color-text)' }}>
              いいねした作品がありません
            </p>
            <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem', marginBottom: 28 }}>
              気になった作品にいいねしてみよう！🌟
            </p>
            <button className="btn-primary" onClick={() => navigate('/market')} style={{ margin: '0 auto' }}>
              <Heart size={15} />
              マーケットを見る
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {works.map((work, index) => (
              <WorkCard
                key={work.id}
                work={work}
                index={index}
                isLiked={likedIds.has(work.id)}
                onLike={() => handleLike(work.id)}
                onClick={() => navigate(`/works/${work.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
