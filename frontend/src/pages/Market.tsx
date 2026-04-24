// マーケットページ（フロー②③: 作品一覧・検索・詳細）- ポップ・かわいいデザイン
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { WorkCard } from '../components/WorkCard'
import { fetchWorks, toggleLike, type WorkResponse } from '../lib/api'
import { useAuthState } from '../components/useAuthState'

/** ジャンルフィルター（絵文字付き） */
const GENRES = [
  { value: '', label: '🌈 すべて' },
  { value: 'figure', label: '🎭 フィギュア' },
  { value: 'anime', label: '🎨 アニメ・イラスト' },
  { value: 'cosplay', label: '✨ コスプレ' },
  { value: 'original', label: '⭐ オリジナル' },
  { value: 'official', label: '🌟 公式' },
]

/** フィルターボタンのカラー定義 */
const GENRE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  '':       { bg: 'linear-gradient(135deg, #FF6B9D, #9B59B6)', color: 'white', border: 'transparent' },
  figure:   { bg: '#FFEDF4', color: '#FF6B9D', border: '#FFAECB' },
  anime:    { bg: '#EDF4FF', color: '#5B8CFF', border: '#A3C4FF' },
  cosplay:  { bg: '#F0FFF4', color: '#28A745', border: '#90D4A4' },
  original: { bg: '#FFF9E6', color: '#E67E22', border: '#FFD699' },
  official: { bg: '#F5EDFF', color: '#9B59B6', border: '#DDB3F5' },
}

export default function Market() {
  const { user } = useAuthState()
  const navigate = useNavigate()

  const [works, setWorks] = useState<WorkResponse[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [genre, setGenre] = useState('')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  // 作品一覧を取得（Render スリープ対策のリトライ付き）
  useEffect(() => {
    const MAX_RETRIES = 4
    const RETRY_DELAY_MS = 5000

    const load = async () => {
      setLoading(true)
      setRetrying(false)
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const params: Record<string, string> = { status: 'done', page: '1', per_page: '20' }
          if (genre) params.genre = genre
          const res = await fetchWorks(params)
          setWorks(res.items)
          setTotal(res.total)
          setLoading(false)
          return
        } catch (e) {
          if (attempt < MAX_RETRIES) {
            setRetrying(true)
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
          } else {
            console.error('作品取得エラー:', e)
            setLoading(false)
          }
        }
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
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 20px',
              background: '#F5EDFF',
              border: '2px solid #DDB3F5',
              borderRadius: 100,
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-purple)',
              marginBottom: 16,
            }}
          >
            🛍️ みんなの作品を探そう
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
            3Dデータ <span className="gradient-text">マーケット</span> 🛍️
          </h1>
          <p style={{ color: 'var(--color-text-sub)', fontWeight: 500 }}>
            コミュニティが作った3Dデータをダウンロードして印刷しよう！
          </p>
        </div>

        {/* ジャンルフィルターバー */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 32,
            alignItems: 'center',
          }}
        >
          {GENRES.map(({ value, label }) => {
            const isSelected = genre === value
            const style = isSelected ? GENRE_STYLES[value] : null
            return (
              <button
                key={value}
                id={`genre-filter-${value || 'all'}`}
                onClick={() => setGenre(value)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 100,
                  border: `2px solid ${isSelected ? (style?.border ?? 'transparent') : 'var(--color-border)'}`,
                  background: isSelected ? (style?.bg ?? '#FFEDF4') : 'white',
                  color: isSelected ? (style?.color ?? 'white') : 'var(--color-text-sub)',
                  fontSize: '0.875rem',
                  fontWeight: isSelected ? 800 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                  boxShadow: isSelected ? '0 4px 12px rgba(155,89,182,0.2)' : 'none',
                }}
              >
                {label}
              </button>
            )
          })}
          <span
            style={{
              marginLeft: 'auto',
              background: '#F5EDFF',
              color: 'var(--color-purple)',
              border: '1.5px solid #DDB3F5',
              borderRadius: 100,
              padding: '4px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            {total}件
          </span>
        </div>

        {/* 作品グリッド */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>
              {retrying ? '⏳' : '🔍'}
            </div>
            <Loader2
              size={40}
              color="var(--color-pink)"
              style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', display: 'block' }}
            />
            <p style={{ color: 'var(--color-text-sub)', fontWeight: 600 }}>
              {retrying ? 'サーバー起動中… しばらくお待ちください 🚀' : '読み込み中...'}
            </p>
          </div>
        ) : works.length === 0 ? (
          <div
            style={{
              background: 'white',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '80px 40px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <p style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎭</p>
            <p
              style={{
                fontWeight: 800,
                marginBottom: 8,
                fontSize: '1.1rem',
                color: 'var(--color-text)',
              }}
            >
              まだ作品がないよ！
            </p>
            <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem' }}>
              最初の3Dデータを作ってみませんか？🌟
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

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </main>
  )
}
