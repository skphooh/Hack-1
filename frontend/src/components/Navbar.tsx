// ナビゲーションバーコンポーネント
import { Link, useLocation } from 'react-router-dom'
import { Sparkles, LogIn, LogOut, User } from 'lucide-react'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut } from 'firebase/auth'
import { useAuthState } from './useAuthState'

/** ナビゲーションリンク定義 */
const NAV_LINKS = [
  { path: '/', label: 'ホーム' },
  { path: '/generate', label: '✨ 作成する' },
  { path: '/market', label: 'マーケット' },
]

export function Navbar() {
  const location = useLocation()
  const { user } = useAuthState()

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      console.error('ログインエラー:', e)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        background: 'rgba(13, 13, 20, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* ロゴ */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textDecoration: 'none',
        }}
      >
        <Sparkles size={22} color="var(--color-accent-primary)" />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.1rem',
            background: 'var(--gradient-hero)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          うちの子ファクトリー
        </span>
      </Link>

      {/* ナビリンク */}
      <div style={{ display: 'flex', gap: 8 }}>
        {NAV_LINKS.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            style={{
              padding: '8px 16px',
              borderRadius: 100,
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: location.pathname === path ? 600 : 400,
              color:
                location.pathname === path
                  ? 'var(--color-accent-primary)'
                  : 'var(--color-text-secondary)',
              background:
                location.pathname === path
                  ? 'rgba(167, 139, 250, 0.12)'
                  : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* 認証ボタン */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            <Link
              to="/mypage"
              id="mypage-link"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 100,
                textDecoration: 'none',
                color: 'var(--color-text-secondary)',
                fontSize: '0.9rem',
                transition: 'color 0.2s',
              }}
            >
              <User size={16} />
              {user.displayName?.split(' ')[0] ?? 'マイページ'}
            </Link>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="btn-outline"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <LogOut size={14} />
              ログアウト
            </button>
          </>
        ) : (
          <button id="login-btn" onClick={handleLogin} className="btn-primary">
            <LogIn size={16} />
            Googleでログイン
          </button>
        )}
      </div>
    </nav>
  )
}
