// 作品詳細ページ - ポップ・かわいいデザイン
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download, Heart, ArrowLeft, Loader2 } from 'lucide-react'
import { Viewer3D } from '../components/Viewer3D'
import { fetchWork, toggleLike, addStrapHole, addBase, type WorkResponse } from '../lib/api'
import { useAuthState } from '../components/useAuthState'

/** ジャンルラベルの日本語マッピング */
const GENRE_LABELS: Record<string, string> = {
  figure:   '🎭 フィギュア',
  anime:    '🎨 アニメ・イラスト',
  cosplay:  '✨ コスプレ',
  original: '⭐ オリジナル',
  official: '🌟 公式',
  other:    '📦 その他',
}

export default function WorkDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthState()

  const [work, setWork] = useState<WorkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)

  // 後処理用の状態
  const [strapPosition, setStrapPosition] = useState<'top_center' | 'top_left' | 'top_right'>('top_center')
  const [postProcessing, setPostProcessing] = useState<'strap' | 'base' | null>(null)
  const [strapHoleUrl, setStrapHoleUrl] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const data = await fetchWork(id)
        setWork(data)
      } catch (e) {
        console.error('Work fetch error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleLike = async () => {
    if (!user || !work) return
    try {
      const res = await toggleLike(work.id)
      setIsLiked(res.liked)
      setWork((prev) => (prev ? { ...prev, likes_count: res.likes_count } : prev))
    } catch (e) {
      console.error(e)
    }
  }

  const handleDownload = () => {
    if (!work?.stl_url) return
    const a = document.createElement('a')
    a.href = work.stl_url
    a.download = `${work.title ?? 'model'}.stl`
    a.click()
  }

  /** GLBファイルのダウンロード処理 */
  const handleDownloadGlb = () => {
    if (!work?.glb_url) return
    const a = document.createElement('a')
    a.href = work.glb_url
    a.download = `${work.title ?? 'model'}.glb`
    a.click()
  }

  /** ストラップ穴追加 */
  const handleAddStrapHole = async () => {
    if (!work?.id) return
    // ログイン必須チェック
    if (!user) {
      alert('ストラップ穴の追加にはログインが必要です。')
      return
    }
    // 3Dモデルが存在しない場合はスキップ
    if (!work.glb_url && !work.stl_url) {
      alert('3Dモデルデータがまだ生成されていません。')
      return
    }
    setPostProcessing('strap')
    try {
      const res = await addStrapHole(work.id, strapPosition)
      setStrapHoleUrl(res.stl_url)
    } catch (e) {
      alert('ストラップ穴の追加に失敗しました。')
      console.error(e)
    } finally {
      setPostProcessing(null)
    }
  }

  /** 台座追加 */
  const handleAddBase = async () => {
    if (!work?.id) return
    // ログイン必須チェック
    if (!user) {
      alert('台座の追加にはログインが必要です。')
      return
    }
    // 3Dモデルが存在しない場合はスキップ
    if (!work.glb_url && !work.stl_url) {
      alert('3Dモデルデータがまだ生成されていません。')
      return
    }
    setPostProcessing('base')
    try {
      const res = await addBase(work.id)
      setBaseUrl(res.stl_url)
    } catch (e) {
      alert('台座の追加に失敗しました。')
      console.error(e)
    } finally {
      setPostProcessing(null)
    }
  }

  // ローディング中
  if (loading) {
    return (
      <main
        style={{
          paddingTop: 80,
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: '3rem', animation: 'float 2s ease-in-out infinite' }}>✨</div>
        <Loader2
          size={36}
          color="var(--color-pink)"
          style={{ animation: 'spin 1s linear infinite' }}
        />
      </main>
    )
  }

  // 作品が見つからない場合
  if (!work) {
    return (
      <main
        style={{
          paddingTop: 80,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <div style={{ fontSize: '4rem' }}>🔍</div>
        <h2
          style={{
            fontWeight: 800,
            color: 'var(--color-text)',
            fontSize: '1.3rem',
          }}
        >
          作品が見つからなかった…
        </h2>
        <button
          onClick={() => navigate('/market')}
          className="btn-outline"
        >
          <ArrowLeft size={16} />
          マーケットに戻る
        </button>
      </main>
    )
  }

  return (
    <main style={{ paddingTop: 80, minHeight: '100vh', paddingBottom: 60 }}>
      <div className="page-container section">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate('/market')}
          className="btn-outline"
          style={{ marginBottom: 28, padding: '9px 20px', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={15} />
          マーケットに戻る
        </button>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* 左側: 3Dビューア */}
          <div
            style={{
              background: 'white',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* ビューアヘッダー */}
            <div
              style={{
                padding: '12px 18px',
                background: 'linear-gradient(135deg, #FFF0F6 0%, #F5EDFF 100%)',
                borderBottom: '2px solid var(--color-border)',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--color-text-sub)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🎮 3Dビューア（ドラッグで回転！）
            </div>
            {work.glb_url ? (
              <Viewer3D glbUrl={work.glb_url} height={500} />
            ) : (
              <div
                style={{
                  height: 500,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #FFF0F6, #F5EDFF)',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: '3rem' }}>🎭</div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                  3Dモデルデータがないよ
                </p>
              </div>
            )}
          </div>

          {/* 右側: 作品情報 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 作品情報カード */}
            <div
              style={{
                background: 'white',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* ジャンルバッジ */}
              {work.genre && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 14px',
                    background: '#FFEDF4',
                    color: 'var(--color-pink)',
                    border: '1.5px solid var(--color-pink-light)',
                    borderRadius: 100,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  {GENRE_LABELS[work.genre] ?? work.genre}
                </span>
              )}

              <h1
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  marginBottom: 20,
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-heading)',
                  lineHeight: 1.3,
                }}
              >
                {work.title}
              </h1>

              {/* 価格 */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 18px',
                  background: work.price === 0 ? '#E8FFF4' : '#FFEDF4',
                  border: `2px solid ${work.price === 0 ? '#90D4A4' : 'var(--color-pink-light)'}`,
                  borderRadius: 100,
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: work.price === 0 ? '#22863a' : 'var(--color-pink)',
                  marginBottom: 20,
                }}
              >
                {work.price === 0 ? '🆓 無料！' : `💰 ¥${work.price.toLocaleString()}`}
              </div>

              {/* いいねボタン */}
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={handleLike}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: isLiked ? '#FFEDF4' : 'white',
                    border: `2px solid ${isLiked ? 'var(--color-pink)' : 'var(--color-border)'}`,
                    borderRadius: 100,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    color: isLiked ? 'var(--color-pink)' : 'var(--color-text-sub)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                    transform: isLiked ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                  {work.likes_count} いいね！
                </button>
              </div>
            </div>

            {/* STL/GLBダウンロードボタン */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* STLダウンロード（3Dプリント用） */}
              {work.stl_url && (
                <button
                  onClick={handleDownload}
                  className="btn-primary"
                  style={{
                    padding: '16px',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    width: '100%',
                  }}
                >
                  <Download size={20} />
                  🖨️ STLをダウンロード（3Dプリント用）
                </button>
              )}
              {/* GLBダウンロード（3Dデータ保存用） */}
              {work.glb_url && (
                <button
                  onClick={handleDownloadGlb}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    justifyContent: 'center',
                    padding: '14px',
                    background: 'white',
                    color: 'var(--color-purple)',
                    border: '2px solid #DDB3F5',
                    borderRadius: 'var(--radius-btn)',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-base)',
                    transition: 'all 0.2s',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5EDFF'
                    e.currentTarget.style.borderColor = 'var(--color-purple)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.borderColor = '#DDB3F5'
                  }}
                >
                  <Download size={18} />
                  💾 GLBをダウンロード（3Dデータ）
                </button>
              )}
            </div>

            {/* 元画像 */}
            {work.thumbnail_url && (
              <div
                style={{
                  background: 'white',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.82rem',
                    marginBottom: 10,
                    color: 'var(--color-text-sub)',
                    fontWeight: 700,
                  }}
                >
                  📷 元の画像
                </p>
                <img
                  src={work.thumbnail_url}
                  alt="元画像"
                  style={{
                    width: '100%',
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'contain',
                    maxHeight: 280,
                  }}
                />
              </div>
            )}

            {/* ターンアラウンド画像 */}
            {work.turnaround_url && (
              <div
                style={{
                  background: 'white',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.82rem',
                    marginBottom: 10,
                    color: 'var(--color-purple)',
                    fontWeight: 700,
                  }}
                >
                  🌟 生成されたターンアラウンド
                </p>
                <img
                  src={work.turnaround_url}
                  alt="ターンアラウンド"
                  style={{
                    width: '100%',
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}

            {/* ─── 後処理セクション（GLBまたはSTLが存在する場合のみ表示） ─── */}
            {(work.glb_url || work.stl_url) && (
              <div
                style={{
                  background: 'white',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
              <p
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: 'var(--color-text-sub)',
                  marginBottom: 14,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                🔧 3Dプリント用カスタマイズ
              </p>

              {/* ストラップ穴 */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {(['top_center', 'top_left', 'top_right'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setStrapPosition(pos)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: `2px solid ${strapPosition === pos ? 'var(--color-pink)' : 'var(--color-border)'}`,
                        background: strapPosition === pos ? '#FFEDF4' : 'white',
                        color: strapPosition === pos ? 'var(--color-pink)' : 'var(--color-text-sub)',
                        borderRadius: 'var(--radius-btn)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-base)',
                      }}
                    >
                      {pos === 'top_center' ? '上中' : pos === 'top_left' ? '上左' : '上右'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAddStrapHole}
                  disabled={postProcessing === 'strap'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    justifyContent: 'center',
                    width: '100%',
                    padding: '12px',
                    background: 'white',
                    color: postProcessing === 'strap' ? 'var(--color-text-muted)' : 'var(--color-pink)',
                    border: `2px solid ${postProcessing === 'strap' ? 'var(--color-border)' : 'var(--color-pink-light)'}`,
                    borderRadius: 'var(--radius-btn)',
                    cursor: postProcessing === 'strap' ? 'not-allowed' : 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-base)',
                  }}
                >
                  {postProcessing === 'strap' ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 処理中…
                    </>
                  ) : (
                    '🔗 ストラップ穴を開ける'
                  )}
                </button>
                {strapHoleUrl && (
                  <a
                    href={strapHoleUrl}
                    download={`${work.title}_strap.stl`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      justifyContent: 'center',
                      marginTop: 8,
                      padding: '10px',
                      fontSize: '0.85rem',
                      background: '#E8FFF4',
                      color: '#22863a',
                      border: '2px solid #90D4A4',
                      borderRadius: 'var(--radius-btn)',
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    <Download size={15} /> 穴あきSTLを保存
                  </a>
                )}
              </div>

              {/* 台座追加 */}
              <div>
                <button
                  onClick={handleAddBase}
                  disabled={postProcessing === 'base'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    justifyContent: 'center',
                    width: '100%',
                    padding: '12px',
                    background: 'white',
                    color: postProcessing === 'base' ? 'var(--color-text-muted)' : 'var(--color-purple)',
                    border: `2px solid ${postProcessing === 'base' ? 'var(--color-border)' : '#DDB3F5'}`,
                    borderRadius: 'var(--radius-btn)',
                    cursor: postProcessing === 'base' ? 'not-allowed' : 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-base)',
                  }}
                >
                  {postProcessing === 'base' ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 処理中…
                    </>
                  ) : (
                    '🔳 専用台座を追加する'
                  )}
                </button>
                {baseUrl && (
                  <a
                    href={baseUrl}
                    download={`${work.title}_base.stl`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      justifyContent: 'center',
                      marginTop: 8,
                      padding: '10px',
                      fontSize: '0.85rem',
                      background: '#F5EDFF',
                      color: 'var(--color-purple)',
                      border: '2px solid #DDB3F5',
                      borderRadius: 'var(--radius-btn)',
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    <Download size={15} /> 台座付きSTLを保存
                  </a>
                )}
              </div>
            </div>
            )}

            {/* 削除ボタン（本人のみ） */}
            {user && work.author_firebase_uid === user.uid && (
              <button
                onClick={async () => {
                  if (!window.confirm('この作品を本当に削除しますか？')) return
                  try {
                    const { deleteWork } = await import('../lib/api')
                    await deleteWork(work.id)
                    navigate('/market')
                  } catch (e) {
                    console.error(e)
                    alert('削除に失敗しました')
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'center',
                  padding: '10px 20px',
                  background: 'white',
                  color: '#ef4444',
                  border: '2px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 'var(--radius-btn)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-base)',
                  transition: 'all 0.2s',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FFF5F5'
                  e.currentTarget.style.borderColor = '#ef4444'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)'
                }}
              >
                🗑️ 作品を削除する
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </main>
  )
}
