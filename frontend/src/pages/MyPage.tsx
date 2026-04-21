// マイページ（ユーザーの投稿した作品一覧）- ポップ・かわいいデザイン
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Loader2, LogIn } from 'lucide-react'
import { useAuthState } from '../components/useAuthState'
import { WorkCard } from '../components/WorkCard'
import { fetchWorks, type WorkResponse } from '../lib/api'

export default function MyPage() {
  const { user, loading } = useAuthState()
  const [works, setWorks] = useState<WorkResponse[]>([])
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setFetching(true)
      try {
        // 自分の作品を取得（ステータス問わず全件）
        const res = await fetchWorks({ status: 'done', per_page: '50' })
        // TODO: バックエンドにuser_idフィルターを追加する
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
          paddingTop: 80,
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
          paddingTop: 80,
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
    <main style={{ paddingTop: 80, minHeight: '100vh' }}>
      <div className="page-container section">
        {/* プロフィールヘッダー */}
        <div
          style={{
            background: 'white',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '28px 36px',
            marginBottom: 36,
            boxShadow: 'var(--shadow-card)',
            flexWrap: 'wrap',
          }}
        >
          {/* アバター */}
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'ユーザーアイコン'}
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--color-pink-light)',
                boxShadow: '0 4px 16px rgba(255,107,157,0.3)',
              }}
            />
          ) : (
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: '#FFEDF4',
                border: '3px solid var(--color-pink-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={32} color="var(--color-pink)" />
            </div>
          )}

          {/* ユーザー情報 */}
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {user.displayName ?? 'ユーザー'}
              </h1>
              <span style={{ fontSize: '1.2rem' }}>👑</span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              {user.email}
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                padding: '3px 12px',
                background: '#FFEDF4',
                border: '1.5px solid var(--color-pink-light)',
                borderRadius: 100,
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--color-pink)',
              }}
            >
              ✨ 作品数: {works.length}件
            </div>
          </div>

          {/* 作成ボタン */}
          <Link
            to="/generate"
            className="btn-primary"
            id="mypage-create-btn"
            style={{ whiteSpace: 'nowrap' }}
          >
            ✨ 新しく作る！
          </Link>
        </div>

        {/* 作品一覧見出し */}
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
          🎨 作成した作品
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
            {works.map((work) => (
              <WorkCard key={work.id} work={work} />
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
