import { useState, useEffect } from 'react'
import { Users, Box, Trophy, Activity, AlertCircle, Flag, Lock, ShieldCheck } from 'lucide-react'
import { fetchWorks, type WorkResponse } from '../lib/api'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuthState } from '../components/useAuthState'

export default function Admin() {
  const isMobile = useIsMobile()
  const { user } = useAuthState()
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('admin_auth') === 'true')
  const [password, setPassword] = useState('')
  const [works, setWorks] = useState<WorkResponse[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'works' | 'competition' | 'reports'>('dashboard')

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchWorks({ status: 'done', page: '1', per_page: '50' })
        setWorks(res.items)
      } catch (e) {
        console.error('データ取得エラー:', e)
      } finally {
        setLoading(false)
      }
    }
    if (isAdmin) {
      loadData()
      // 通報データの読み込み
      const savedReports = JSON.parse(localStorage.getItem('mock_reports') || '[]')
      setReports(savedReports)
    }
  }, [isAdmin])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'admin') { // デモ用簡易パスワード
      localStorage.setItem('admin_auth', 'true')
      setIsAdmin(true)
    } else {
      alert('パスワードが違います')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_auth')
    setIsAdmin(false)
  }

  const resolveReport = (id: string) => {
    const updated = reports.map(r => r.id === id ? { ...r, status: '対応済み' } : r)
    setReports(updated)
    localStorage.setItem('mock_reports', JSON.stringify(updated))
  }

  if (!isAdmin) {
    return (
      <main style={{ paddingTop: 140, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div className="pop-card" style={{ padding: '40px', textAlign: 'center', maxWidth: 400, width: '90%', marginTop: '5vh' }}>
          <ShieldCheck size={48} color="var(--color-purple)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>運営ログイン</h2>
          <p style={{ color: 'var(--color-text-sub)', marginBottom: 24, fontSize: '0.9rem' }}>
            パスワードを入力してください。<br/>(ヒント: admin)
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: '1.5px solid #d0d8e8',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
              <Lock size={16} /> ログイン
            </button>
          </form>
        </div>
      </main>
    )
  }

  const mockUsers = [
    { id: '1', name: 'うちの子太郎', email: 'taro@example.com', role: 'ユーザー', joined: '2026-05-01' },
    { id: '2', name: 'クリエイター花子', email: 'hanako@example.com', role: 'クリエイター', joined: '2026-04-28' },
    { id: '3', name: 'テストユーザー', email: 'test@example.com', role: 'ユーザー', joined: '2026-04-25' },
  ]

  const stats = [
    { label: '総ユーザー数', value: '1,284', icon: <Users size={24} />, color: 'var(--color-mint)' },
    { label: '総生成作品数', value: works.length || '-', icon: <Box size={24} />, color: 'var(--color-pink)' },
    { label: '通報件数', value: reports.filter(r => r.status === '未対応').length, icon: <Flag size={24} />, color: '#e05' },
    { label: 'アクティブ率', value: '94%', icon: <Activity size={24} />, color: 'var(--color-purple)' },
  ]

  const thStyle = { padding: '16px', textAlign: 'left' as const, background: 'var(--color-bg-soft)', color: 'var(--color-text-sub)', fontWeight: 700, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const }
  const tdStyle = { padding: '16px', borderBottom: '1px solid #e2e8f0', color: 'var(--color-text)' }

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingBottom: 80, paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}>
      <div className="page-container" style={{ maxWidth: 1400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ padding: 8, background: '#F5EDFF', borderRadius: 12, color: 'var(--color-purple)' }}>⚙️</span>
            管理者ダッシュボード
          </h1>
          <button onClick={handleLogout} className="btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            ログアウト
          </button>
        </div>

        {/* タブナビゲーション */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          {[
            { id: 'dashboard', label: '概要', icon: <Activity size={18} /> },
            { id: 'users', label: 'ユーザー管理', icon: <Users size={18} /> },
            { id: 'works', label: '作品管理', icon: <Box size={18} /> },
            { id: 'reports', label: `通報管理 (${reports.filter(r => r.status === '未対応').length})`, icon: <Flag size={18} /> },
            { id: 'competition', label: 'コンペ管理', icon: <Trophy size={18} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 100,
                border: 'none',
                background: activeTab === tab.id ? 'var(--gradient-button)' : 'white',
                color: activeTab === tab.id ? 'white' : 'var(--color-text-sub)',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '4px 4px 12px #b0bad0' : 'var(--nm-raised-sm)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツエリア */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
            {stats.map((stat, i) => (
              <div key={i} className="pop-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ padding: 16, background: '#ffffff', borderRadius: 16, color: stat.color, boxShadow: 'inset 2px 2px 6px #e2e8f0' }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>{stat.label}</div>
                  <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', color: 'var(--color-text)', lineHeight: 1.2 }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="pop-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>ユーザー名</th>
                    <th style={thStyle}>メールアドレス</th>
                    <th style={thStyle}>権限</th>
                    <th style={thStyle}>登録日</th>
                    <th style={thStyle}>アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map(u => (
                    <tr key={u.id}>
                      <td style={tdStyle}>{u.id}</td>
                      <td style={tdStyle}><div style={{ fontWeight: 700 }}>{u.name}</div></td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>
                        <span className="tag-badge" style={{ background: u.role === 'クリエイター' ? '#F5EDFF' : '#f0f3fa' }}>{u.role}</span>
                      </td>
                      <td style={tdStyle}>{u.joined}</td>
                      <td style={tdStyle}>
                        <button style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d0d8e8', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>編集</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'works' && (
          <div className="pop-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>サムネイル</th>
                    <th style={thStyle}>作品名</th>
                    <th style={thStyle}>ジャンル</th>
                    <th style={thStyle}>いいね数</th>
                    <th style={thStyle}>ステータス</th>
                    <th style={thStyle}>アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>読み込み中...</td></tr>
                  ) : works.map(w => (
                    <tr key={w.id}>
                      <td style={tdStyle}>
                        <img src={w.thumbnail_url || '/placeholder.png'} alt="thumb" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                      </td>
                      <td style={tdStyle}><div style={{ fontWeight: 700 }}>{w.title}</div></td>
                      <td style={tdStyle}>{w.genre || '未設定'}</td>
                      <td style={tdStyle}>❤️ {w.likes_count}</td>
                      <td style={tdStyle}>
                        <span className="tag-badge" style={{ background: w.status === 'done' ? '#F0FFF4' : '#FFF9E6', color: w.status === 'done' ? '#28A745' : '#E67E22' }}>
                          {w.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d0d8e8', background: 'white', color: '#e05', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>削除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="pop-card" style={{ overflow: 'hidden' }}>
            {reports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <ShieldCheck size={48} color="var(--color-mint)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>通報はありません</h3>
                <p style={{ color: 'var(--color-text-sub)' }}>現在、平和な状態です！</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>日時</th>
                      <th style={thStyle}>対象作品</th>
                      <th style={thStyle}>通報理由</th>
                      <th style={thStyle}>ステータス</th>
                      <th style={thStyle}>アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id}>
                        <td style={tdStyle}>{r.date}</td>
                        <td style={tdStyle}><a href={`/works/${r.workId}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-pink)', fontWeight: 700, textDecoration: 'none' }}>{r.workTitle}</a></td>
                        <td style={tdStyle}>{r.reason}</td>
                        <td style={tdStyle}>
                          <span className="tag-badge" style={{ background: r.status === '未対応' ? '#FFF9E6' : '#F0FFF4', color: r.status === '未対応' ? '#E67E22' : '#28A745' }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {r.status === '未対応' && (
                              <button onClick={() => resolveReport(r.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #90D4A4', background: '#F0FFF4', color: '#28A745', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>対応済みにする</button>
                            )}
                            <button style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #FFAECB', background: '#FFEDF4', color: '#e05', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>作品非公開</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'competition' && (
          <div className="pop-card" style={{ padding: 40, textAlign: 'center' }}>
            <Trophy size={48} color="var(--color-yellow)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>コンペティション管理</h3>
            <p style={{ color: 'var(--color-text-sub)' }}>この機能は現在準備中です。</p>
          </div>
        )}

      </div>
    </main>
  )
}
