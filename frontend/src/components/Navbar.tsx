import { Link, useLocation } from 'react-router-dom'
import { LogIn, LogOut, User } from 'lucide-react'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut } from 'firebase/auth'
import { useAuthState } from './useAuthState'
import logoImg from '../assets/logo02.png'

const GUEST_NAV_LINKS = [
  { path: '/', label: '🏠 ホーム' },
]

const AUTH_NAV_LINKS = [
  { path: '/generate', label: '✨ 3Dにする！' },
  { path: '/market', label: '🛍️ マーケット' },
]

export function Navbar() {
  const location = useLocation()
  const { user } = useAuthState()

  const navLinks = user ? AUTH_NAV_LINKS : GUEST_NAV_LINKS

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
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '2px solid #FFDCEC',
        boxShadow: '0 2px 16px rgba(255, 107, 157, 0.1)',
      }}
    >
      {/* 1段目: ロゴ + 認証エリア */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 32px',
          borderBottom: '1px solid #FFEDF4',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src={logoImg}
            alt="うちの子製作所 ロゴ"
            style={{ height: 52, width: 'auto', objectFit: 'contain' }}
          />
        </Link>

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
                  padding: '6px 14px',
                  borderRadius: 100,
                  textDecoration: 'none',
                  color: 'var(--color-text-sub)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: '#F5EDFF',
                  border: '1.5px solid #DDB3F5',
                  transition: 'all 0.2s',
                }}
              >
                <User size={14} />
                {user.displayName?.split(' ')[0] ?? 'マイページ'}
              </Link>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                <LogOut size={13} />
                ログアウト
              </button>
            </>
          ) : (
            <button
              id="login-btn"
              onClick={handleLogin}
              className="btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.88rem' }}
            >
              <LogIn size={15} />
              Googleでログイン
            </button>
          )}
        </div>
      </div>

      {/* 2段目: 主要ナビゲーション導線 */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '6px 32px',
        }}
      >
        {navLinks.map(({ path, label }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              style={{
                padding: '6px 22px',
                borderRadius: 100,
                textDecoration: 'none',
                fontSize: '0.88rem',
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
      </nav>
    </header>
  )
}
