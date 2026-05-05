import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, LogIn, Mail, Edit3, Check, Loader2 } from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { useAuthState } from '../components/useAuthState'
import { updateMe } from '../lib/api'
import { auth } from '../lib/firebase'
import { useIsMobile } from '../hooks/useIsMobile'

export default function Profile() {
  const { user, loading } = useAuthState()
  const isMobile = useIsMobile()

  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const currentName = user.displayName ?? ''
  const isDirty = displayName !== '' && displayName !== currentName

  const handleSave = async () => {
    const name = displayName.trim()
    if (!name) { setError('表示名を入力してください'); return }
    if (name.length > 50) { setError('50文字以内で入力してください'); return }
    setError(null)
    setSaving(true)
    try {
      // Firebase Auth の表示名を更新
      await updateProfile(auth.currentUser!, { displayName: name })
      // バックエンドの users テーブルも更新
      await updateMe({ display_name: name })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('保存に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingBottom: 60, paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}>
      <div className="page-container" style={{ paddingTop: isMobile ? 16 : 28, maxWidth: 520 }}>
        <h1 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 800, marginBottom: 24, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Edit3 size={20} color="var(--color-purple)" />
          プロフィールを編集
        </h1>

        <div className="pop-card" style={{ padding: isMobile ? '20px' : '28px', marginBottom: 16 }}>
          {/* アバター */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
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
            <div>
              <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text)' }}>{user.displayName ?? 'ユーザー'}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={12} /> {user.email}
              </p>
            </div>
          </div>

          {/* 表示名フォーム */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                表示名
              </label>
              <input
                type="text"
                value={displayName || currentName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="表示名を入力"
                maxLength={50}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-btn)',
                  border: `1.5px solid ${isDirty ? 'var(--color-pink)' : '#d0d8e8'}`,
                  fontSize: '0.9rem', background: 'white', color: 'var(--color-text)',
                  fontFamily: 'var(--font-base)', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                {(displayName || currentName).length}/50文字
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                メールアドレス
              </label>
              <input
                type="email"
                defaultValue={user.email ?? ''}
                disabled
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-btn)', border: '1.5px solid #d0d8e8', fontSize: '0.9rem', background: '#f8f9fc', color: 'var(--color-text-muted)', cursor: 'not-allowed', fontFamily: 'var(--font-base)', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                メールアドレスはGoogleアカウントと連動しています
              </p>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FFF0F3', border: '1.5px solid #FFCDD2', borderRadius: 10, color: '#C62828', fontWeight: 600, fontSize: '0.85rem' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="btn-primary"
              style={{ justifyContent: 'center', opacity: !isDirty ? 0.5 : 1 }}
            >
              {saving
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 保存中...</>
                : saved
                ? <><Check size={16} /> 保存しました！</>
                : <>保存する</>
              }
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/mypage" className="btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
            うちの子一覧へ
          </Link>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
