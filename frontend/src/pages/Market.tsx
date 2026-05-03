// マーケットページ（フロー②③: 作品一覧・検索・詳細）- ポップ・かわいいデザイン
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, Building2 } from 'lucide-react'
import { WorkCard } from '../components/WorkCard'
import { fetchWorks, toggleLike, type WorkResponse } from '../lib/api'
import { useAuthState } from '../components/useAuthState'
import { useIsMobile } from '../hooks/useIsMobile'

/** ジャンルフィルター（絵文字付き） */
const GENRES = [
  { value: '', label: '🌈 すべて' },
  { value: 'figure', label: '🎭 フィギュア' },
  { value: 'anime', label: '🎨 アニメ・イラスト' },
  { value: 'cosplay', label: '✨ コスプレ' },
  { value: 'original', label: '⭐ オリジナル' },
  { value: 'ai', label: '🤖 AI生成' },
  { value: 'handmade', label: '✋ 手描き・手作り' },
  { value: 'official', label: '🌟 公式' },
]

/** フィルターボタンのカラー定義 */
const GENRE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  '':       { bg: 'linear-gradient(135deg, #FF6B9D, #9B59B6)', color: 'white', border: 'transparent' },
  figure:   { bg: '#FFEDF4', color: '#FF6B9D', border: '#FFAECB' },
  anime:    { bg: '#EDF4FF', color: '#5B8CFF', border: '#A3C4FF' },
  cosplay:  { bg: '#F0FFF4', color: '#28A745', border: '#90D4A4' },
  original: { bg: '#FFF9E6', color: '#E67E22', border: '#FFD699' },
  ai:       { bg: '#F4F1FF', color: '#8B70D4', border: '#DDB3F5' },
  handmade: { bg: '#FFF1E6', color: '#FF8A66', border: '#FFCBA4' },
  official: { bg: '#F5EDFF', color: '#9B59B6', border: '#DDB3F5' },
}

/** 1ページあたりの取得件数 */
const PER_PAGE = 24

/** スケルトンカード（ローディング中のプレースホルダー） */
function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--nm-bg)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* サムネイル部分 */}
      <div className="skeleton-shimmer" style={{ height: 200 }} />
      {/* テキスト部分 */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton-shimmer" style={{ height: 16, width: '40%', borderRadius: 8 }} />
        <div className="skeleton-shimmer" style={{ height: 18, width: '80%', borderRadius: 8 }} />
        <div className="skeleton-shimmer" style={{ height: 14, width: '60%', borderRadius: 8 }} />
      </div>
    </div>
  )
}

export default function Market() {
  const { user } = useAuthState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  // 表示中の作品リスト（ページを跨いで蓄積）
  const [works, setWorks] = useState<WorkResponse[]>([])
  const [total, setTotal] = useState(0)
  // 初回ローディング（スケルトン表示用）
  const [initialLoading, setInitialLoading] = useState(true)
  // 追加ローディング（下部スピナー表示用）
  const [loadingMore, setLoadingMore] = useState(false)
  // Renderスリープ解除中フラグ
  const [retrying, setRetrying] = useState(false)
  const [genre, setGenre] = useState('')
  // 入力値（表示用）とデバウンス後の検索ワード（API送信用）を分離
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [isOfficial] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  // 現在のページ番号
  const [page, setPage] = useState(1)
  // 追加データが存在するか
  const [hasMore, setHasMore] = useState(true)
  // フィルター変更かどうかのフラグ（初回リセット判別）
  const isFirstLoad = useRef(true)
  // 無限スクロール用のセンチネル要素
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // --- 検索インプットのデバウンス（300ms） ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // --- フィルター変更時はリセットして1ページ目から再取得 ---
  useEffect(() => {
    setWorks([])
    setPage(1)
    setHasMore(true)
    isFirstLoad.current = true
  }, [genre, search, isOfficial])

  // --- ページ取得関数（初回 or 追加） ---
  const loadPage = useCallback(async (targetPage: number, isReset: boolean) => {
    const MAX_RETRIES = 4
    const RETRY_DELAY_MS = 5000

    if (isReset) {
      setInitialLoading(true)
      setRetrying(false)
    } else {
      setLoadingMore(true)
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const params: Record<string, string | boolean> = {
          status: 'done',
          page: String(targetPage),
          per_page: String(PER_PAGE),
        }
        if (genre) params.genre = genre
        if (search) params.search = search
        if (isOfficial) params.is_official = true

        const res = await fetchWorks(params)

        if (isReset) {
          setWorks(res.items)
        } else {
          setWorks((prev) => [...prev, ...res.items])
        }
        setTotal(res.total)
        // 取得済み合計が全件数に達したらこれ以上ない
        setHasMore(targetPage * PER_PAGE < res.total)
        break
      } catch (e) {
        if (attempt < MAX_RETRIES) {
          setRetrying(true)
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
        } else {
          console.error('作品取得エラー:', e)
          setHasMore(false)
        }
      }
    }

    setInitialLoading(false)
    setLoadingMore(false)
    setRetrying(false)
  }, [genre, search, isOfficial])

  // --- page が変わったらロード（初回リセット or 追加） ---
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      loadPage(1, true)
    } else if (page > 1) {
      loadPage(page, false)
    }
  }, [page, loadPage])

  // --- Intersection Observer で無限スクロール ---
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !initialLoading) {
          setPage((prev) => prev + 1)
        }
      },
      { rootMargin: '200px' } // 200px手前で先読み開始
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, initialLoading])

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

  // スケルトンカードの枚数（グリッドに合わせて偶数に）
  const skeletonCount = isMobile ? 6 : 12

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}>
      <div className="page-container" style={{ paddingTop: isMobile ? 14 : 24, paddingBottom: 40 }}>
        {/* 検索バーとフィルタ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: isMobile ? 12 : 20, alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <Search size={isMobile ? 14 : 18} color="var(--color-text-muted)" style={{ position: 'absolute', left: isMobile ? 10 : 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="検索..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                padding: isMobile ? '8px 10px 8px 30px' : '10px 14px 10px 38px',
                borderRadius: 100,
                border: '1.5px solid #d0d8e8',
                outline: 'none',
                fontFamily: 'var(--font-base)',
                fontSize: isMobile ? '0.82rem' : '0.9rem',
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
                  padding: isMobile ? '4px 9px' : '6px 12px',
                  borderRadius: 100,
                  border: `1.5px solid ${isSelected ? (style?.border ?? 'transparent') : 'var(--color-border)'}`,
                  background: isSelected ? (style?.bg ?? '#FFEDF4') : 'white',
                  color: isSelected ? (style?.color ?? 'white') : 'var(--color-text-sub)',
                  fontSize: isMobile ? '0.68rem' : '0.78rem',
                  fontWeight: isSelected ? 800 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                  boxShadow: isSelected ? '0 4px 12px rgba(155,89,182,0.2)' : 'none',
                  whiteSpace: 'nowrap',
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
        {initialLoading ? (
          // --- スケルトンローダー ---
          <div>
            {/* スリープ解除メッセージ */}
            {retrying && (
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Loader2
                  size={32}
                  color="var(--color-pink)"
                  style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }}
                />
                <p style={{ color: 'var(--color-text-sub)', fontWeight: 600, fontSize: '0.9rem' }}>
                  サーバー起動中… しばらくお待ちください 🚀
                </p>
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(var(--card-min-width, 240px), 1fr))',
                gap: isMobile ? 12 : 24,
              }}
            >
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
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
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(var(--card-min-width, 240px), 1fr))',
                gap: isMobile ? 12 : 24,
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

            {/* 無限スクロール用センチネル要素 */}
            <div ref={sentinelRef} style={{ height: 1 }} />

            {/* 追加ロード中スピナー */}
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Loader2
                  size={32}
                  color="var(--color-pink)"
                  style={{ animation: 'spin 1s linear infinite', margin: '0 auto', display: 'block' }}
                />
              </div>
            )}

            {/* すべて読み込み完了メッセージ */}
            {!hasMore && works.length > 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '24px 0' }}>
                ✨ 全{total}件を表示中
              </p>
            )}
          </>
        )}

        {/* 企業向けコンペモックアップ */}
        <div style={{ marginTop: 60, padding: '30px', background: 'linear-gradient(135deg, #FFF9FB 0%, #F5EDFF 100%)', borderRadius: 'var(--radius-xl)', border: '2px solid #DDB3F5', textAlign: 'center' }}>
          <Building2 size={32} color="var(--color-purple)" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-purple)', marginBottom: 8 }}>企業向けコンテスト開催中！</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-sub)', marginBottom: 16 }}>あなたの3Dデータが公式グッズに採用されるかも？</p>
          <button className="btn-primary" onClick={() => navigate('/competition')} style={{ margin: '0 auto' }}>🏆 コンペティションに参加する</button>
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        /* スケルトンシマーアニメーション */
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
