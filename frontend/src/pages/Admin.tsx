import { useState, useEffect } from 'react'
import { Users, Box, Trophy, Activity, Flag, Lock, ShieldCheck, Star, Trash2, Plus, Check, X, Loader2, RefreshCw } from 'lucide-react'
import {
  fetchAdminStats, fetchAdminUsers, updateAdminUser,
  fetchAdminWorks, updateAdminWork, deleteAdminWork,
  fetchCompetitions, createCompetition, updateCompetition, deleteCompetition,
  type CompetitionResponse, type AdminUser, type AdminWork,
} from '../lib/api'
import { useIsMobile } from '../hooks/useIsMobile'

type Tab = 'dashboard' | 'users' | 'works' | 'competition' | 'reports'
const EMPTY_FORM = { title: '', company_name: '', prize: '', deadline: '', description: '', status: 'active' }

export default function Admin() {
  const isMobile = useIsMobile()
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('admin_auth') === 'true')
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(false)

  const [stats, setStats] = useState<{ user_count: number; work_count: number; purchase_count: number } | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [works, setWorks] = useState<AdminWork[]>([])
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([])
  const [reports, setReports] = useState<any[]>([])

  const [savingUser, setSavingUser] = useState<Record<string, boolean>>({})
  const [savingWork, setSavingWork] = useState<Record<string, boolean>>({})
  const [deletingWork, setDeletingWork] = useState<Record<string, boolean>>({})

  const [showCompForm, setShowCompForm] = useState(false)
  const [editingComp, setEditingComp] = useState<CompetitionResponse | null>(null)
  const [compForm, setCompForm] = useState(EMPTY_FORM)
  const [compSaving, setCompSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    setReports(JSON.parse(localStorage.getItem('mock_reports') || '[]'))
    loadAll()
  }, [isAdmin])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, u, w, c] = await Promise.all([
        fetchAdminStats(), fetchAdminUsers(), fetchAdminWorks(), fetchCompetitions(),
      ])
      setStats(s)
      setUsers(u.items ?? [])
      setWorks(w.items ?? [])
      setCompetitions(c.items ?? [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const toggleUserFlag = async (id: string, flag: 'is_creator' | 'has_printer', cur: boolean) => {
    setSavingUser(p => ({ ...p, [id]: true }))
    try {
      await updateAdminUser(id, { [flag]: !cur })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, [flag]: !cur } : u))
    } catch { alert('更新に失敗しました') }
    setSavingUser(p => ({ ...p, [id]: false }))
  }

  const toggleOfficial = async (id: string, cur: boolean) => {
    setSavingWork(p => ({ ...p, [id]: true }))
    try {
      await updateAdminWork(id, { is_official: !cur })
      setWorks(prev => prev.map(w => w.id === id ? { ...w, is_official: !cur } : w))
    } catch { alert('更新に失敗しました') }
    setSavingWork(p => ({ ...p, [id]: false }))
  }

  const handleDeleteWork = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return
    setDeletingWork(p => ({ ...p, [id]: true }))
    try {
      await deleteAdminWork(id)
      setWorks(prev => prev.filter(w => w.id !== id))
    } catch { alert('削除に失敗しました') }
    setDeletingWork(p => ({ ...p, [id]: false }))
  }

  const openCompForm = (comp?: CompetitionResponse) => {
    if (comp) {
      setEditingComp(comp)
      setCompForm({ title: comp.title, company_name: comp.company_name, prize: comp.prize ?? '', description: comp.description ?? '', deadline: comp.deadline ? comp.deadline.slice(0, 10) : '', status: comp.status })
    } else {
      setEditingComp(null)
      setCompForm(EMPTY_FORM)
    }
    setShowCompForm(true)
  }

  const saveComp = async () => {
    if (!compForm.title || !compForm.company_name) { alert('タイトルと企業名は必須です'); return }
    setCompSaving(true)
    try {
      const body = { ...compForm, deadline: compForm.deadline || null }
      if (editingComp) {
        const updated = await updateCompetition(editingComp.id, body)
        setCompetitions(prev => prev.map(c => c.id === editingComp.id ? updated : c))
      } else {
        const created = await createCompetition(body)
        setCompetitions(prev => [created, ...prev])
      }
      setShowCompForm(false)
    } catch { alert('保存に失敗しました') }
    setCompSaving(false)
  }

  const deleteComp = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return
    try {
      await deleteCompetition(id)
      setCompetitions(prev => prev.filter(c => c.id !== id))
    } catch { alert('削除に失敗しました') }
  }

  const resolveReport = (id: string) => {
    const updated = reports.map((r: any) => r.id === id ? { ...r, status: '対応済み' } : r)
    setReports(updated)
    localStorage.setItem('mock_reports', JSON.stringify(updated))
  }

  if (!isAdmin) {
    return (
      <main style={{ paddingTop: 140, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div className="pop-card" style={{ padding: '40px', textAlign: 'center', maxWidth: 400, width: '90%', marginTop: '5vh' }}>
          <ShieldCheck size={48} color="var(--color-purple)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>運営ログイン</h2>
          <p style={{ color: 'var(--color-text-sub)', marginBottom: 24, fontSize: '0.9rem' }}>(ヒント: admin)</p>
          <form onSubmit={e => { e.preventDefault(); if (password === 'admin') { localStorage.setItem('admin_auth', 'true'); setIsAdmin(true) } else alert('パスワードが違います') }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input type="password" placeholder="パスワード" value={password} onChange={e => setPassword(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: 8, border: '1.5px solid #d0d8e8', fontSize: '1rem', outline: 'none' }} />
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
              <Lock size={16} /> ログイン
            </button>
          </form>
        </div>
      </main>
    )
  }

  const th = { padding: isMobile ? '9px 8px' : '13px 14px', textAlign: 'left' as const, background: 'var(--color-bg-soft)', color: 'var(--color-text-sub)', fontWeight: 700, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' as const, fontSize: isMobile ? '0.72rem' : '0.82rem' }
  const td = { padding: isMobile ? '9px 8px' : '13px 14px', borderBottom: '1px solid #e2e8f0', fontSize: isMobile ? '0.75rem' : '0.88rem' }

  const TABS = [
    { id: 'dashboard',   label: '概要',   icon: <Activity size={15} /> },
    { id: 'users',       label: 'ユーザー', icon: <Users size={15} /> },
    { id: 'works',       label: '作品',   icon: <Box size={15} /> },
    { id: 'competition', label: 'コンペ', icon: <Trophy size={15} /> },
    { id: 'reports',     label: `通報(${reports.filter((r: any) => r.status === '未対応').length})`, icon: <Flag size={15} /> },
  ]

  return (
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingBottom: 80, paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}>
      <div className="page-container" style={{ maxWidth: 1400, paddingTop: isMobile ? 12 : 20 }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 14 : 22, flexWrap: 'wrap', gap: 10 }}>
          <h1 style={{ fontSize: isMobile ? '1.1rem' : '1.6rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: 6, background: '#F5EDFF', borderRadius: 8, color: 'var(--color-purple)' }}>⚙️</span>
            管理者ダッシュボード
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadAll} className="btn-outline" style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />} 更新
            </button>
            <button onClick={() => { localStorage.removeItem('admin_auth'); setIsAdmin(false) }} className="btn-outline" style={{ padding: '7px 12px', fontSize: '0.78rem' }}>
              ログアウト
            </button>
          </div>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: 6, marginBottom: isMobile ? 14 : 22, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as Tab)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '7px 11px' : '9px 18px', borderRadius: 100, border: 'none', background: activeTab === t.id ? 'var(--gradient-button)' : 'white', color: activeTab === t.id ? 'white' : 'var(--color-text-sub)', fontWeight: 700, fontSize: isMobile ? '0.72rem' : '0.82rem', cursor: 'pointer', boxShadow: activeTab === t.id ? '4px 4px 12px #b0bad0' : 'var(--nm-raised-sm)', transition: 'all 0.2s', whiteSpace: 'nowrap', fontFamily: 'var(--font-base)' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── 概要 ── */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: '総ユーザー数', value: stats?.user_count ?? '…', icon: <Users size={20} />, color: 'var(--color-mint)' },
              { label: '公開作品数',   value: stats?.work_count ?? '…', icon: <Box size={20} />,   color: 'var(--color-pink)' },
              { label: '購入総数',     value: stats?.purchase_count ?? '…', icon: <Trophy size={20} />, color: 'var(--color-yellow)' },
              { label: '未対応通報',   value: reports.filter((r: any) => r.status === '未対応').length, icon: <Flag size={20} />, color: '#e05' },
            ].map((s, i) => (
              <div key={i} className="pop-card" style={{ padding: isMobile ? 16 : 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ padding: 10, background: '#fff', borderRadius: 10, color: s.color, boxShadow: 'inset 2px 2px 6px #e2e8f0' }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: isMobile ? '1.5rem' : '1.8rem', fontFamily: 'var(--font-display)', color: 'var(--color-text)', lineHeight: 1.1 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ユーザー管理 ── */}
        {activeTab === 'users' && (
          <div className="pop-card" style={{ overflow: 'hidden' }}>
            {users.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                {loading ? <Loader2 size={28} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto' }} /> : 'ユーザーがいません'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead><tr>
                    <th style={th}>ユーザー</th>
                    <th style={th}>作品数</th>
                    <th style={th}>クリエイター</th>
                    <th style={th}>プリンター</th>
                    <th style={th}>登録日</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={td}>
                          <div style={{ fontWeight: 700 }}>{u.display_name ?? '名前なし'}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{u.firebase_uid.slice(0, 14)}…</div>
                        </td>
                        <td style={td}>{u.work_count}件</td>
                        <td style={td}>
                          <button onClick={() => toggleUserFlag(u.id, 'is_creator', u.is_creator)} disabled={savingUser[u.id]}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 100, border: 'none', background: u.is_creator ? '#F5EDFF' : '#f0f3fa', color: u.is_creator ? 'var(--color-purple)' : 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-base)' }}>
                            {savingUser[u.id] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : u.is_creator ? <Check size={11} /> : <X size={11} />}
                            {u.is_creator ? 'ON' : 'OFF'}
                          </button>
                        </td>
                        <td style={td}>
                          <button onClick={() => toggleUserFlag(u.id, 'has_printer', u.has_printer)} disabled={savingUser[u.id]}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 100, border: 'none', background: u.has_printer ? '#E8FFF4' : '#f0f3fa', color: u.has_printer ? '#22863a' : 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-base)' }}>
                            {u.has_printer ? <Check size={11} /> : <X size={11} />}
                            {u.has_printer ? 'あり' : 'なし'}
                          </button>
                        </td>
                        <td style={td}>{new Date(u.created_at).toLocaleDateString('ja-JP')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 作品管理 ── */}
        {activeTab === 'works' && (
          <div className="pop-card" style={{ overflow: 'hidden' }}>
            {works.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                {loading ? <Loader2 size={28} color="var(--color-pink)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto' }} /> : '作品がありません'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead><tr>
                    <th style={th}>サムネイル</th>
                    <th style={th}>作品名</th>
                    <th style={th}>公式バッジ</th>
                    <th style={th}>価格</th>
                    <th style={th}>いいね</th>
                    <th style={th}>操作</th>
                  </tr></thead>
                  <tbody>
                    {works.map(w => (
                      <tr key={w.id}>
                        <td style={td}><img src={w.thumbnail_url ?? '/placeholder.png'} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} /></td>
                        <td style={td}>
                          <div style={{ fontWeight: 700, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{w.author ?? '—'}</div>
                        </td>
                        <td style={td}>
                          <button onClick={() => toggleOfficial(w.id, w.is_official)} disabled={savingWork[w.id]}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 100, border: 'none', background: w.is_official ? '#FFF9E6' : '#f0f3fa', color: w.is_official ? '#B86A00' : 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-base)' }}>
                            {savingWork[w.id] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Star size={11} fill={w.is_official ? 'currentColor' : 'none'} />}
                            {w.is_official ? '公式' : '一般'}
                          </button>
                        </td>
                        <td style={td}>{w.price === 0 ? '無料' : `¥${w.price.toLocaleString()}`}</td>
                        <td style={td}>❤️ {w.likes_count}</td>
                        <td style={td}>
                          <button onClick={() => handleDeleteWork(w.id, w.title)} disabled={deletingWork[w.id]}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #FFAECB', background: '#FFEDF4', color: '#e05', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-base)' }}>
                            {deletingWork[w.id] ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />} 削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── コンペ管理 ── */}
        {activeTab === 'competition' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button onClick={() => openCompForm()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: '0.85rem' }}>
                <Plus size={15} /> 新規コンペを作成
              </button>
            </div>

            {showCompForm && (
              <div className="pop-card" style={{ padding: isMobile ? 16 : 22, marginBottom: 16 }}>
                <h3 style={{ fontWeight: 800, marginBottom: 14, fontSize: '0.92rem' }}>{editingComp ? 'コンペを編集' : '新規コンペを作成'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  {([
                    { label: 'タイトル *', key: 'title',        type: 'text', placeholder: '例: キャラクターデザインコンペ' },
                    { label: '企業名 *',  key: 'company_name', type: 'text', placeholder: '例: 株式会社〇〇' },
                    { label: '賞品・報酬', key: 'prize',        type: 'text', placeholder: '例: グランプリ: 商品化 & 賞金30万円' },
                    { label: '締め切り',  key: 'deadline',     type: 'date', placeholder: '' },
                  ] as const).map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 4 }}>{label}</label>
                      <input type={type} value={compForm[key]} onChange={e => setCompForm(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-btn)', border: '1.5px solid #d0d8e8', fontSize: '0.85rem', fontFamily: 'var(--font-base)', outline: 'none' }} />
                    </div>
                  ))}
                  <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 4 }}>説明</label>
                    <textarea value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="コンペの詳細説明..."
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-btn)', border: '1.5px solid #d0d8e8', fontSize: '0.85rem', fontFamily: 'var(--font-base)', outline: 'none', resize: 'vertical', minHeight: 70 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 4 }}>ステータス</label>
                    <select value={compForm.status} onChange={e => setCompForm(p => ({ ...p, status: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-btn)', border: '1.5px solid #d0d8e8', fontSize: '0.85rem', fontFamily: 'var(--font-base)' }}>
                      <option value="active">開催中</option>
                      <option value="ended">終了</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowCompForm(false)} className="btn-outline" style={{ padding: '7px 14px', fontSize: '0.82rem' }}>キャンセル</button>
                  <button onClick={saveComp} disabled={compSaving} className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {compSaving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />} 保存
                  </button>
                </div>
              </div>
            )}

            {competitions.length === 0 && !showCompForm ? (
              <div className="pop-card" style={{ padding: 40, textAlign: 'center' }}>
                <Trophy size={36} color="var(--color-yellow)" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 800, marginBottom: 6 }}>コンペがありません</p>
                <p style={{ color: 'var(--color-text-sub)', fontSize: '0.88rem' }}>「新規コンペを作成」から追加してください</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {competitions.map(c => (
                  <div key={c.id} className="pop-card" style={{ padding: isMobile ? '12px' : '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontWeight: 800, fontSize: isMobile ? '0.88rem' : '0.95rem' }}>{c.title}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, background: c.status === 'active' ? '#E8FFF4' : '#f0f3fa', color: c.status === 'active' ? '#22863a' : 'var(--color-text-muted)' }}>
                          {c.status === 'active' ? '開催中' : '終了'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)' }}>
                        🏢 {c.company_name}{c.prize && <> · 🏆 {c.prize}</>}{c.deadline && <> · ⏰ {new Date(c.deadline).toLocaleDateString('ja-JP')}まで</>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openCompForm(c)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #d0d8e8', background: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-base)' }}>編集</button>
                      <button onClick={() => deleteComp(c.id, c.title)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FFAECB', background: '#FFEDF4', color: '#e05', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-base)' }}>削除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 通報管理 ── */}
        {activeTab === 'reports' && (
          <div className="pop-card" style={{ overflow: 'hidden' }}>
            {reports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <ShieldCheck size={36} color="var(--color-mint)" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 800, marginBottom: 6 }}>通報はありません</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead><tr>
                    <th style={th}>日時</th><th style={th}>対象</th><th style={th}>理由</th><th style={th}>状態</th><th style={th}>操作</th>
                  </tr></thead>
                  <tbody>
                    {reports.map((r: any) => (
                      <tr key={r.id}>
                        <td style={td}>{r.date}</td>
                        <td style={td}><a href={`/works/${r.workId}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-pink)', fontWeight: 700, textDecoration: 'none' }}>{r.workTitle}</a></td>
                        <td style={td}>{r.reason}</td>
                        <td style={td}><span style={{ padding: '2px 8px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700, background: r.status === '未対応' ? '#FFF9E6' : '#F0FFF4', color: r.status === '未対応' ? '#E67E22' : '#28A745' }}>{r.status}</span></td>
                        <td style={td}>{r.status === '未対応' && <button onClick={() => resolveReport(r.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #90D4A4', background: '#F0FFF4', color: '#28A745', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-base)' }}>対応済みに</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
