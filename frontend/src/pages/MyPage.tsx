// マイページ（ユーザーの投稿した作品一覧）- ポップ・かわいいデザイン
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Loader2, LogIn } from 'lucide-react'
import { useAuthState } from '../components/useAuthState'
import { WorkCard } from '../components/WorkCard'
import { fetchWorks, type WorkResponse } from '../lib/api'
import { useIsMobile } from '../hooks/useIsMobile'

export default function MyPage() {
  const { user, loading } = useAuthState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [works, setWorks] = useState<WorkResponse[]>([])
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setFetching(true)
      try {
        // 自分の作品を取得（ステータス問わず全件）
        const res = await fetchWorks({ status: 'done', user_id: user.uid, per_page: '50' })
        setWorks(res.items)
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [user])

  // ローディング中
  if (loading) {
    return (
      <main
        style={{
          paddingTop: 150,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: '3rem', animation: 'float 2s ease-in-out infinite' }}>💫</div>
        <Loader2
          size={36}
          color="var(--color-pink)"
          style={{ animation: 'spin 1s linear infinite' }}
        />
      </main>
    )
  }

  // 未ログイン
  if (!user) {
    return (
      <main
        style={{
          paddingTop: 150,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gradient-bg)',
          backgroundAttachment: 'fixed',
        }}
      >
        <div
          style={{
            background: 'white',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '60px 48px',
            textAlign: 'center',
            maxWidth: 400,
            boxShadow: 'var(--shadow-hover)',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔐</div>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#F5EDFF',
              border: '2px solid #DDB3F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <User size={32} color="var(--color-purple)" />
          </div>
          <h2
            style={{
              fontWeight: 800,
              marginBottom: 10,
              fontSize: '1.3rem',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            ログインが必要だよ！
          </h2>
          <p
            style={{
              color: 'var(--color-text-sub)',
              fontSize: '0.9rem',
              marginBottom: 28,
              lineHeight: 1.8,
            }}
          >
            マイページを見るには
            <br />
            Googleでログインしてね🌟
          </p>
          <Link
            to="/"
            className="btn-primary"
            style={{ justifyContent: 'center', width: '100%' }}
          >
            <LogIn size={16} />
            ホームに戻る
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}>
      <div className="page-container" style={{ paddingTop: isMobile ? 16 : 24, paddingBottom: 40 }}>
        {/* 見出し */}
        <h2
          style={{
            fontWeight: 800,
            marginBottom: isMobile ? 16 : 20,
            fontSize: isMobile ? '1.1rem' : '1.2rem',
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          🎨 うちの子一覧
          {!fetching && (
            <span
              style={{
                padding: '2px 12px',
                background: '#F5EDFF',
                color: 'var(--color-purple)',
                border: '1.5px solid #DDB3F5',
                borderRadius: 100,
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              {works.length}件
            </span>
          )}
        </h2>

        {/* ローディング or 一覧 */}
        {fetching ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12, animation: 'float 2s ease-in-out infinite' }}>
              🔍
            </div>
            <Loader2
              size={32}
              color="var(--color-pink)"
              style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }}
            />
            <p style={{ color: 'var(--color-text-sub)', fontWeight: 600 }}>読み込み中...</p>
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
            <p
              style={{
                color: 'var(--color-text-sub)',
                marginBottom: 28,
                fontSize: '0.9rem',
              }}
            >
              最初のうちの子を3Dにしてみよう！🌟
            </p>
            <Link to="/generate" className="btn-primary" style={{ display: 'inline-flex' }}>
              ✨ 3D生成を始める！
            </Link>
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
