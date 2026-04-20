// マイページ（ユーザーの投稿した作品一覧）
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Sparkles, LogIn } from 'lucide-react'
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

  if (loading) {
    return (
      <main style={{ paddingTop: 80, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={40} color="var(--color-accent-primary)" />
      </main>
    )
  }

  if (!user) {
    return (
      <main style={{ paddingTop: 80, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ padding: 60, textAlign: 'center', maxWidth: 400 }}>
          <User size={48} color="var(--color-text-muted)" style={{ margin: '0 auto 20px', display: 'block' }} />
          <h2 style={{ fontWeight: 700, marginBottom: 12 }}>ログインが必要です</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
            マイページを見るにはGoogleでログインしてください
          </p>
          <Link to="/" className="btn-primary" style={{ justifyContent: 'center' }}>
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
          className="glass-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '32px 40px',
            marginBottom: 40,
          }}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'ユーザーアイコン'}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--gradient-button)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={32} color="white" />
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
              {user.displayName ?? 'ユーザー'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{user.email}</p>
          </div>
          <Link
            to="/generate"
            className="btn-primary"
            style={{ marginLeft: 'auto' }}
            id="mypage-create-btn"
          >
            <Sparkles size={16} />
            新しく作成
          </Link>
        </div>

        {/* 作品一覧 */}
        <h2 style={{ fontWeight: 700, marginBottom: 24 }}>
          {fetching ? '読み込み中...' : `作成した作品（${works.length}件）`}
        </h2>

        {!fetching && works.length === 0 ? (
          <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: 16 }}>🎭</p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>まだ作品がありません</p>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
              最初のうちの子を3Dにしてみましょう！
            </p>
            <Link to="/generate" className="btn-primary">
              <Sparkles size={16} />
              作成する
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
    </main>
  )
}
