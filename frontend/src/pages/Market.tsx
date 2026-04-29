// マーケットページ（フロー②③: 作品一覧・検索・詳細）- ポップ・かわいいデザイン
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, Building2 } from 'lucide-react'
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
  const [search, setSearch] = useState('')
  const [isOfficial, setIsOfficial] = useState(false)
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
          const params: Record<string, string | boolean> = { status: 'done', page: '1', per_page: '20' }
          if (genre) params.genre = genre
          if (search) params.search = search
          if (isOfficial) params.is_official = true
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
  }, [genre, search, isOfficial])

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
    <main style={{ paddingTop: 112, minHeight: '100vh', paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}>
      <div className="page-container section">
        {/* 検索バーとフィルタ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24, alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="作品名で検索..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 42px',
                borderRadius: 100,
                border: '1.5px solid #d0d8e8',
                outline: 'none',
                fontFamily: 'var(--font-base)',
                fontSize: '0.95rem',
                background: '#ffffff',
                boxShadow: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--color-pink-light)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>
        </div>

        {/* ジャンルフィルターバー */}
        <div
          className="genre-filter-bar"
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
                  padding: '5px 12px',
                  borderRadius: 100,
                  border: `2px solid ${isSelected ? (style?.border ?? 'transparent') : 'var(--color-border)'}`,
                  background: isSelected ? (style?.bg ?? '#FFEDF4') : 'white',
                  color: isSelected ? (style?.color ?? 'white') : 'var(--color-text-sub)',
                  fontSize: '0.75rem',
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

        {/* 企業向けコンペモックアップ */}
        <div style={{ marginTop: 60, padding: '30px', background: 'linear-gradient(135deg, #FFF9FB 0%, #F5EDFF 100%)', borderRadius: 'var(--radius-xl)', border: '2px solid #DDB3F5', textAlign: 'center' }}>
          <Building2 size={32} color="var(--color-purple)" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-purple)', marginBottom: 8 }}>企業向けコンテスト開催中！</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-sub)', marginBottom: 16 }}>あなたの3Dデータが公式グッズに採用されるかも？</p>
          <button className="btn-primary" onClick={() => alert('機能準備中です！')} style={{ margin: '0 auto' }}>🏆 コンペティションに参加する</button>
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </main>
  )
}
