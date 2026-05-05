import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, ChevronRight, Loader2, Calendar, Building2 } from 'lucide-react'
import { WorkCard } from '../components/WorkCard'
import { fetchWorks, fetchCompetitions, toggleLike, enterCompetition, type WorkResponse, type CompetitionResponse } from '../lib/api'
import { useAuthState } from '../components/useAuthState'
import { useIsMobile } from '../hooks/useIsMobile'

const MOCK_COMPETITIONS: CompetitionResponse[] = [
  {
    id: 'mock-1', title: 'キャラクターフィギュアデザインコンペ', company_name: '株式会社グッドスマイル', company_logo_url: null,
    prize: 'グランプリ: 公式フィギュア化 & 賞金30万円', deadline: '2026-07-31T23:59:59+09:00',
    description: 'あなたのオリジナルキャラクターを3Dフィギュアに！最優秀作品は実際に商品化されます。', status: 'active', created_at: new Date().toISOString(),
  },
  {
    id: 'mock-2', title: 'アニメキャラ公式グッズコンペ', company_name: 'コトブキヤ', company_logo_url: null,
    prize: '優秀賞: Amazonギフト券3万円分 × 3名', deadline: '2026-06-30T23:59:59+09:00',
    description: '人気アニメシリーズの公式グッズデザインを募集！採用作品は全国のショップで販売されます。', status: 'active', created_at: new Date().toISOString(),
  },
  {
    id: 'mock-3', title: 'うちの子3D 春コンペ', company_name: 'うちの子製作所', company_logo_url: null,
    prize: '全員: 限定デジタルバッジ · グランプリ: 3Dプリント品プレゼント', deadline: '2026-05-31T23:59:59+09:00',
    description: '春の特別コンペ！どんなジャンルでもOK。あなたの「うちの子」を世界に見せよう！', status: 'active', created_at: new Date().toISOString(),
  },
]

export default function Competition() {
  const { user } = useAuthState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([])
  const [loadingComps, setLoadingComps] = useState(true)
  const [works, setWorks] = useState<WorkResponse[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [enteredIds, setEnteredIds] = useState<Set<string>>(new Set())
  const [enteringId, setEnteringId] = useState<string | null>(null)

  useEffect(() => {
    fetchCompetitions()
      .then(r => setCompetitions(r.items.length > 0 ? r.items : MOCK_COMPETITIONS))
      .catch(() => setCompetitions(MOCK_COMPETITIONS))
      .finally(() => setLoadingComps(false))

    fetchWorks({ status: 'done', per_page: 8 })
      .then(r => setWorks(r.items))
      .catch(console.error)
  }, [])

  const handleLike = async (workId: string) => {
    if (!user) return
    try {
      const res = await toggleLike(workId)
      setLikedIds(prev => { const n = new Set(prev); res.liked ? n.add(workId) : n.delete(workId); return n })
      setWorks(prev => prev.map(w => w.id === workId ? { ...w, likes_count: res.likes_count } : w))
    } catch {}
  }

  const handleEntry = async (comp: CompetitionResponse) => {
    if (comp.status === 'ended') return
    if (!user) { alert('エントリーするにはログインが必要です！'); return }
    if (enteredIds.has(comp.id)) { alert('すでにエントリー済みです！'); return }
    if (!confirm(`「${comp.title}」にエントリーしますか？`)) return
    setEnteringId(comp.id)
    try {
      const res = await enterCompetition(comp.id)
      if (res.entered) {
        setEnteredIds(prev => new Set(prev).add(comp.id))
        alert('🎉 エントリーが完了しました！結果発表をお待ちください。')
      }
    } catch {
      alert('エントリーに失敗しました。もう一度お試しください。')
    } finally {
      setEnteringId(null)
    }
  }

  const activeComps = competitions.filter(c => c.status === 'active')
  const endedComps  = competitions.filter(c => c.status === 'ended')

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingBottom: 80 }}>

      {/* ヒーロー */}
      <section style={{ textAlign: 'center', padding: isMobile ? '20px 20px 32px' : '32px 40px 48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 16px', background: 'white', border: '1.5px solid var(--color-pink-light)', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-pink)', marginBottom: 14 }}>
          🏆 コンペティション
        </div>
        <h1 className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? '1.7rem' : '2.8rem', lineHeight: 1.2, marginBottom: 10 }}>
          Hack-1 Grand Prix
        </h1>
        <p style={{ color: 'var(--color-text-sub)', fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 600, maxWidth: 500, margin: '0 auto 20px' }}>
          企業が主催するコンペに参加して、あなたの作品を世に出そう！
        </p>
        <button className="btn-primary" onClick={() => navigate('/generate')} style={{ padding: isMobile ? '10px 22px' : '12px 28px', fontSize: isMobile ? '0.9rem' : '1rem' }}>
          ✨ 作品を作ってエントリー
        </button>
      </section>

      {/* 開催中コンペ */}
      <section className="page-container" style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isMobile ? 14 : 20 }}>
          <h2 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 800 }}>🟢 開催中のコンペ</h2>
          <span style={{ padding: '2px 10px', background: '#E8FFF4', color: '#22863a', border: '1px solid #90D4A4', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700 }}>{activeComps.length}件</span>
        </div>
        {loadingComps ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Loader2 size={26} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: isMobile ? 10 : 18 }}>
            {activeComps.map(c => <CompCard key={c.id} comp={c} onEntry={handleEntry} isMobile={isMobile} entered={enteredIds.has(c.id)} entering={enteringId === c.id} />)}
          </div>
        )}
      </section>

      {/* 終了コンペ */}
      {endedComps.length > 0 && (
        <section className="page-container" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: isMobile ? '0.92rem' : '1rem', fontWeight: 800, marginBottom: isMobile ? 10 : 14, color: 'var(--color-text-muted)' }}>終了したコンペ</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? 8 : 14, opacity: 0.7 }}>
            {endedComps.map(c => <CompCard key={c.id} comp={c} onEntry={handleEntry} isMobile={isMobile} entered={false} entering={false} />)}
          </div>
        </section>
      )}

      {/* 最新エントリー作品 */}
      <section className="page-container">
        <h2 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 800, marginBottom: isMobile ? 14 : 20 }}>🌟 最新エントリー作品</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(210px, 1fr))', gap: isMobile ? 10 : 16 }}>
          {works.map((w, i) => (
            <WorkCard key={w.id} work={w} index={i} isLiked={likedIds.has(w.id)} onLike={() => handleLike(w.id)} onClick={() => navigate(`/works/${w.id}`)} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn-outline" onClick={() => navigate('/market')}>もっと見る <ChevronRight size={14} /></button>
        </div>
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}

function CompCard({ comp, onEntry, isMobile, entered, entering }: { comp: CompetitionResponse; onEntry: (c: CompetitionResponse) => void; isMobile: boolean; entered: boolean; entering: boolean }) {
  const isEnded = comp.status === 'ended'
  const daysLeft = comp.deadline ? Math.ceil((new Date(comp.deadline).getTime() - Date.now()) / 86400000) : null

  return (
    <div className="pop-card" style={{ padding: isMobile ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
            <Building2 size={12} color="var(--color-text-muted)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{comp.company_name}</span>
          </div>
          <h3 style={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 800, lineHeight: 1.35 }}>{comp.title}</h3>
        </div>
        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, background: isEnded ? '#f0f3fa' : '#E8FFF4', color: isEnded ? 'var(--color-text-muted)' : '#22863a', border: `1px solid ${isEnded ? '#d0d8e8' : '#90D4A4'}` }}>
          {isEnded ? '終了' : '開催中'}
        </span>
      </div>

      {comp.description && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', lineHeight: 1.6 }}>{comp.description}</p>
      )}

      {comp.prize && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 10px', background: '#FFFBF0', border: '1px solid #FFD699', borderRadius: 'var(--radius-md)' }}>
          <Gift size={13} color="#B86A00" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '0.76rem', color: '#8B5E00', fontWeight: 600 }}>{comp.prize}</span>
        </div>
      )}

      {/* フッター */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        {daysLeft !== null && !isEnded ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: daysLeft <= 7 ? '#e05' : 'var(--color-text-muted)', fontWeight: 600 }}>
            <Calendar size={11} /> {daysLeft > 0 ? `残り${daysLeft}日` : '本日締め切り'}
          </div>
        ) : isEnded ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>締め切り終了</span>
        ) : <div />}

        <button onClick={() => onEntry(comp)} disabled={isEnded || entered || entering}
          className={isEnded || entered ? '' : 'btn-primary'}
          style={isEnded
            ? { padding: '6px 12px', borderRadius: 'var(--radius-btn)', border: '1px solid #d0d8e8', background: '#f0f3fa', color: 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 700, cursor: 'not-allowed', fontFamily: 'var(--font-base)' }
            : entered
            ? { padding: '6px 12px', borderRadius: 'var(--radius-btn)', border: '1px solid #90D4A4', background: '#E8FFF4', color: '#22863a', fontSize: '0.78rem', fontWeight: 700, cursor: 'default', fontFamily: 'var(--font-base)' }
            : { padding: '6px 12px', fontSize: '0.8rem' }}>
          {isEnded ? '終了' : entered ? '✅ エントリー済み' : entering ? '⏳ 処理中…' : '🏆 エントリー'}
        </button>
      </div>
    </div>
  )
}
