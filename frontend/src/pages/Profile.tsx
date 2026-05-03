import { Link } from 'react-router-dom'
import { User, LogIn, Camera, Mail, Edit3 } from 'lucide-react'
import { useAuthState } from '../components/useAuthState'
import { useIsMobile } from '../hooks/useIsMobile'

export default function Profile() {
  const { user, loading } = useAuthState()
  const isMobile = useIsMobile()

  if (loading) return null

  if (!user) {
    return (
      <main style={{ paddingTop: 150, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pop-card" style={{ padding: '48px 40px', textAlign: 'center', maxWidth: 380, width: '90%' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.2rem' }}>ログインが必要です</h2>
          <Link to="/" className="btn-primary" style={{ justifyContent: 'center', marginTop: 20, display: 'inline-flex' }}>
            <LogIn size={16} /> ホームに戻る
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingBottom: 60, paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}>
      <div className="page-container" style={{ paddingTop: isMobile ? 16 : 28, maxWidth: 520 }}>
        <h1 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 800, marginBottom: 24, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Edit3 size={20} color="var(--color-purple)" />
          プロフィールを編集
        </h1>

        {/* アバター */}
        <div className="pop-card" style={{ padding: isMobile ? '20px' : '28px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'アイコン'}
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--color-pink-light)' }}
                />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFEDF4', border: '2.5px solid var(--color-pink-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={28} color="var(--color-pink)" />
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--color-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                <Camera size={12} color="white" />
              </div>
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text)' }}>{user.displayName ?? 'ユーザー'}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={12} /> {user.email}
              </p>
            </div>
          </div>

          {/* フォーム（スタブ） */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                表示名
              </label>
              <input
                type="text"
                defaultValue={user.displayName ?? ''}
                placeholder="表示名を入力"
                disabled
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-btn)', border: '1.5px solid #d0d8e8', fontSize: '0.9rem', background: '#f8f9fc', color: 'var(--color-text-muted)', cursor: 'not-allowed', fontFamily: 'var(--font-base)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                メールアドレス
              </label>
              <input
                type="email"
                defaultValue={user.email ?? ''}
                disabled
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-btn)', border: '1.5px solid #d0d8e8', fontSize: '0.9rem', background: '#f8f9fc', color: 'var(--color-text-muted)', cursor: 'not-allowed', fontFamily: 'var(--font-base)' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '12px 16px', background: '#FFF9E6', border: '1.5px solid #FFD699', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: '#8B5E00', fontWeight: 600 }}>
            ✏️ プロフィール編集機能は準備中です。もうしばらくお待ちください！
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/mypage" className="btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
            うちの子一覧へ
          </Link>
        </div>
      </div>
    </main>
  )
}
