import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Gift, AlertCircle, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { WorkCard } from '../components/WorkCard'
import { fetchWorks, toggleLike, type WorkResponse } from '../lib/api'
import { useAuthState } from '../components/useAuthState'
import { useIsMobile } from '../hooks/useIsMobile'

export default function Competition() {
  const { user } = useAuthState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [works, setWorks] = useState<WorkResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  // エントリー作品（デモとして全作品から新着を取得）
  useEffect(() => {
    const loadWorks = async () => {
      try {
        const res = await fetchWorks({ status: 'done', page: '1', per_page: '8' })
        setWorks(res.items)
      } catch (e) {
        console.error('作品取得エラー:', e)
      } finally {
        setLoading(false)
      }
    }
    loadWorks()
  }, [])

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
      setWorks((prev) =>
        prev.map((w) => (w.id === workId ? { ...w, likes_count: res.likes_count } : w))
      )
    } catch (e) {
      console.error('いいねエラー:', e)
    }
  }

  const handleEntry = () => {
    if (!user) {
      alert('エントリーするにはログインが必要です！')
      return
    }
    if (confirm('Hack-1 グランプリにエントリーしますか？\n（※現在はデモ用です）')) {
      alert('🎉 エントリーが完了しました！結果発表をお待ちください！')
    }
  }

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingBottom: 80 }}>
      {/* ヒーローセクション */}
      <section style={{ textAlign: 'center', padding: isMobile ? '16px 20px 40px' : '40px 40px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: isMobile ? 16 : 24, animation: 'float 3s ease-in-out infinite' }}>
          <Trophy size={isMobile ? 36 : 48} color="var(--color-pink)" />
          <Sparkles size={isMobile ? 36 : 48} color="var(--color-yellow)" />
        </div>
        <h1 className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '2rem' : '4rem', lineHeight: 1.2, marginBottom: 12 }}>
          Hack-1 Grand Prix
        </h1>
        <p style={{ color: 'var(--color-text-sub)', fontSize: isMobile ? '0.9rem' : '1.2rem', fontWeight: 700, marginBottom: isMobile ? 24 : 40 }}>
          あなたの「うちの子」が公式グッズになるかも！？<br />
          第1回 3Dキャラクターコンペティション開催！
        </p>
        <button
          className="btn-primary animate-bounce-in"
          onClick={handleEntry}
          style={{ padding: isMobile ? '12px 28px' : '16px 40px', fontSize: isMobile ? '1rem' : '1.2rem', borderRadius: 100 }}
        >
          🏆 今すぐエントリーする！
        </button>
      </section>

      {/* 概要・賞品セクション */}
      <section className="page-container" style={{ marginBottom: 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 32 }}>
          {/* 賞品 */}
          <div className="pop-card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 12, background: '#FFF9E6', borderRadius: '50%', color: '#E67E22' }}>
                <Gift size={28} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>豪華賞品</h2>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <li style={{ background: '#FFF9FB', padding: 20, borderRadius: 16, border: '2px solid #FFAECB' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-pink)', fontWeight: 800, marginBottom: 4 }}>グランプリ (1名様)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>公式アクリルスタンド化 & 記念トロフィー 🏆</div>
              </li>
              <li style={{ background: '#F5EDFF', padding: 20, borderRadius: 16, border: '2px solid #DDB3F5' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-purple)', fontWeight: 800, marginBottom: 4 }}>優秀賞 (3名様)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Amazonギフト券 10,000円分 🎁</div>
              </li>
              <li style={{ background: '#F0FFF4', padding: 20, borderRadius: 16, border: '2px solid #90D4A4' }}>
                <div style={{ fontSize: '0.9rem', color: '#28A745', fontWeight: 800, marginBottom: 4 }}>参加賞 (全員)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>限定デジタルバッジ ✨</div>
              </li>
            </ul>
          </div>

          {/* 応募要項 */}
          <div className="pop-card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 12, background: '#EDF4FF', borderRadius: '50%', color: '#5B8CFF' }}>
                <AlertCircle size={28} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>応募要項</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: 'var(--color-text-sub)' }}>
              <div>
                <h3 style={{ fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>📅 応募期間</h3>
                <p>2026年5月1日 〜 2026年6月30日 23:59まで</p>
              </div>
              <div>
                <h3 style={{ fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>🎨 応募条件</h3>
                <p>「うちの子製作所」で生成したオリジナルの3Dキャラクターであること。ジャンルは問いません。</p>
              </div>
              <div>
                <h3 style={{ fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>⚖️ 審査基準</h3>
                <p>デザインの独自性、可愛さ、そして「いいね数」を総合的に評価します。</p>
              </div>
              <button
                className="btn-outline"
                style={{ marginTop: 16, justifyContent: 'center' }}
                onClick={() => navigate('/generate')}
              >
                さっそく3Dを作る！ <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* エントリー作品ギャラリー（新着順モック） */}
      <section className="page-container">
        <h2 className="section-title">🌟 最新のエントリー</h2>
        <p className="section-sub">みんなの力作を見てみよう！お気に入りの作品には「いいね」を押して応援してね</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={40} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-text-sub)', fontWeight: 600 }}>作品を読み込み中...</p>
          </div>
        ) : works.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: 'white', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: '3rem', marginBottom: 16 }}>🥺</p>
            <p style={{ fontWeight: 800, color: 'var(--color-text)' }}>まだエントリーがありません</p>
            <p style={{ color: 'var(--color-text-sub)', fontSize: '0.9rem' }}>記念すべき1人目になろう！</p>
          </div>
        ) : (
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
        )}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button className="btn-outline" onClick={() => navigate('/market')}>
            もっと作品を見る <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </main>
  )
}
