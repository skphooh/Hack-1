// ナビゲーションバーコンポーネント（ポップ・かわいいデザイン）
import { Link, useLocation } from 'react-router-dom'
import { LogIn, LogOut, User } from 'lucide-react'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut } from 'firebase/auth'
import { useAuthState } from './useAuthState'

/** ナビゲーションリンク定義 */
const NAV_LINKS = [
  { path: '/', label: '🏠 ホーム' },
  { path: '/generate', label: '✨ 3Dにする！' },
  { path: '/market', label: '🛍️ マーケット' },
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
        padding: '12px 32px',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '2px solid #FFDCEC',
        boxShadow: '0 2px 16px rgba(255, 107, 157, 0.1)',
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
        <span style={{ fontSize: '1.5rem' }}>🌟</span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
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
      <div style={{ display: 'flex', gap: 4 }}>
        {NAV_LINKS.map(({ path, label }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              style={{
                padding: '8px 18px',
                borderRadius: 100,
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-pink)' : 'var(--color-text-sub)',
                background: isActive ? '#FFEDF4' : 'transparent',
                border: isActive ? '1.5px solid var(--color-pink-light)' : '1.5px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* 認証ボタン */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                color: 'var(--color-text-sub)',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: '#F5EDFF',
                border: '1.5px solid #DDB3F5',
                transition: 'all 0.2s',
              }}
            >
              <User size={15} />
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
          <button id="login-btn" onClick={handleLogin} className="btn-primary" style={{ padding: '10px 22px' }}>
            <LogIn size={16} />
            Googleでログイン
          </button>
        )}
      </div>
    </nav>
  )
}
