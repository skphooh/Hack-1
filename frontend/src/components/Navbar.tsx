import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, User, Heart, List, Edit3, Activity } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut } from 'firebase/auth'
import { useAuthState } from './useAuthState'
import logoImg from '../assets/logo02.png'
import { useIsMobile } from '../hooks/useIsMobile'

const AUTH_NAV_LINKS = [
  { path: '/generate', label: '✨ 3Dにする！' },
  { path: '/competition', label: '🏆 コンペ' },
  { path: '/market', label: '' },
]

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthState()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const navLinks = user ? AUTH_NAV_LINKS : []

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      console.error('ログインエラー:', e)
    }
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await signOut(auth)
  }

  const handleMenuNav = (path: string) => {
    setMenuOpen(false)
    navigate(path)
  }

  const activePath = navLinks.find(({ path }) => location.pathname === path)?.path

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: '#ffffff',
        borderBottom: 'none',
        boxShadow: '0 4px 14px #c8d0e0',
      }}
    >
      {/* 1段目: ロゴ（中央） + 認証エリア（右） */}
      <div className="navbar-top-row">
        {/* 左スペーサー */}
        <div style={{ flex: 1 }} />

        {/* ロゴ（中央） */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src={logoImg}
            alt="うちの子製作所 ロゴ"
            className="navbar-logo"
            style={{ height: isMobile ? 40 : 68, width: 'auto', objectFit: 'contain' }}
          />
        </Link>

        {/* 右エリア */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          {user ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                id="mypage-link"
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: isMobile ? '7px 14px' : '9px 18px',
                  borderRadius: 100,
                  border: '1.5px solid #DDB3F5',
                  background: '#ffffff',
                  color: 'var(--color-text-sub)',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-base)',
                  boxShadow: menuOpen
                    ? 'inset 3px 3px 8px #c8d0e0, inset -3px -3px 8px #ffffff'
                    : '3px 3px 8px #c8d0e0, -3px -3px 8px #ffffff',
                }}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="プロフィール"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <User size={14} />
                )}
                <span className="navbar-username">{user.displayName?.split(' ')[0] ?? 'マイページ'}</span>
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: '#ffffff',
                    border: 'none',
                    borderRadius: 16,
                    boxShadow: '6px 6px 16px #c8d0e0, -6px -6px 16px #ffffff',
                    minWidth: 200,
                    overflow: 'hidden',
                    zIndex: 200,
                  }}
                >
                  {[
                    { icon: <Edit3 size={15} />, label: 'プロフィールを編集', path: '/mypage' },
                    { icon: <Heart size={15} />, label: 'いいねした作品', path: '/liked' },
                    { icon: <List size={15} />, label: 'うちの子一覧', path: '/mypage' },
                    { icon: <Activity size={15} />, label: 'ダッシュボード', path: '/admin' },
                  ].map(({ icon, label, path }) => (
                    <button
                      key={label}
                      onClick={() => handleMenuNav(path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '13px 20px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #F5EDFF',
                        color: 'var(--color-text)',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-base)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#d5dcea' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ color: 'var(--color-purple)' }}>{icon}</span>
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '13px 20px',
                      background: 'transparent',
                      border: 'none',
                      color: '#e05',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-base)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FFF0F3' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <LogOut size={15} />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="login-btn"
              onClick={handleLogin}
              className="btn-primary"
              style={{ padding: isMobile ? '8px 16px' : '10px 24px', fontSize: isMobile ? '0.85rem' : '0.95rem' }}
            >
              <LogIn size={15} />
              Googleでログイン
            </button>
          )}
        </div>
      </div>

      {/* 2段目: 主要ナビゲーション導線（ログイン時のみ表示） */}
      {navLinks.length > 0 && (
      <nav
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          alignItems: 'center',
          padding: '8px 0 0',
        }}
      >
        {navLinks.map(({ path, label }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              style={{
                padding: '12px 28px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-pink)' : '#aaa',
                background: 'transparent',
                border: 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: isMobile ? 44 : 52,
                boxSizing: 'border-box',
              }}
            >
              {path === '/market'
                ? <img
                    src={isActive ? '/uchinokomarket.png' : '/uchinokomarket_gray.png'}
                    alt="うちの子マーケット"
                    style={{ height: isMobile ? 32 : 52, width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
                  />
                : label}
            </Link>
          )
        })}
      </nav>
      )}

      {/* アクティブ下線: 3分割 */}
      {activePath && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: activePath === '/generate' ? 0 : activePath === '/competition' ? '33.33%' : '66.66%',
          width: '33.33%',
          height: '2.5px',
          background: 'var(--color-pink)',
          transition: 'left 0.3s ease',
        }} />
      )}
    </header>
  )
}
