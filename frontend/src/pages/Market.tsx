// マーケットページ（フロー②③: 作品一覧・検索・詳細）
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Sparkles } from 'lucide-react'
import { WorkCard } from '../components/WorkCard'
import { fetchWorks, toggleLike, type WorkResponse } from '../lib/api'
import { useAuthState } from '../components/useAuthState'

/** ジャンルフィルター */
const GENRES = [
  { value: '', label: 'すべて' },
  { value: 'figure', label: 'フィギュア' },
  { value: 'anime', label: 'アニメ・イラスト' },
  { value: 'cosplay', label: 'コスプレ' },
  { value: 'original', label: 'オリジナル' },
  { value: 'official', label: '公式' },
]

export default function Market() {
  const { user } = useAuthState()
  const navigate = useNavigate()

  const [works, setWorks] = useState<WorkResponse[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [genre, setGenre] = useState('')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  // 作品一覧を取得
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params: Record<string, string> = { status: 'done', page: '1', per_page: '20' }
        if (genre) params.genre = genre
        const res = await fetchWorks(params)
        setWorks(res.items)
        setTotal(res.total)
      } catch (e) {
        console.error('作品取得エラー:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [genre])

  const handleLike = async (workId: string) => {
    if (!user) return
    try {
      const res = await toggleLike(workId)
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (res.liked) next.add(workId)
        else next.delete(workId)
        return next
      })
      // いいね数をローカル更新
      setWorks((prev) =>
        prev.map((w) => (w.id === workId ? { ...w, likes_count: res.likes_count } : w))
      )
    } catch (e) {
      console.error('いいねエラー:', e)
    }
  }

  return (
    <main style={{ paddingTop: 80, minHeight: '100vh' }}>
      <div className="page-container section">
        {/* ページタイトル */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 12 }}>
            3Dデータ <span className="gradient-text">マーケット</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            コミュニティが作った3Dデータをダウンロードして印刷しよう
          </p>
        </div>

        {/* ジャンルフィルター */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 32,
            alignItems: 'center',
          }}
        >
          <Filter size={18} color="var(--color-text-muted)" />
          {GENRES.map(({ value, label }) => (
            <button
              key={value}
              id={`genre-filter-${value || 'all'}`}
              onClick={() => setGenre(value)}
              style={{
                padding: '8px 18px',
                borderRadius: 100,
                border: `1px solid ${genre === value ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                background: genre === value ? 'rgba(167, 139, 250, 0.12)' : 'transparent',
                color: genre === value ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                fontSize: '0.875rem',
                fontWeight: genre === value ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {total}件
          </span>
        </div>

        {/* 作品グリッド */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-text-secondary)' }}>
            <Sparkles size={40} color="var(--color-accent-primary)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p>読み込み中...</p>
          </div>
        ) : works.length === 0 ? (
          <div
            className="glass-card"
            style={{ padding: 60, textAlign: 'center' }}
          >
            <p style={{ fontSize: '2rem', marginBottom: 16 }}>🎭</p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>まだ作品がありません</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              最初の3Dデータを作成してみませんか？
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 20,
            }}
          >
            {works.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                isLiked={likedIds.has(work.id)}
                onLike={() => handleLike(work.id)}
                onClick={() => navigate(`/works/${work.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
