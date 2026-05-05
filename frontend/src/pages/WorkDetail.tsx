// 作品詳細ページ - ポップ・かわいいデザイン
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download, Heart, ArrowLeft, Loader2, Flag, ShoppingCart } from 'lucide-react'
import { Viewer3D } from '../components/Viewer3D'
import { fetchWork, toggleLike, addStrapHole, addBase, recordDownload, reportWork, wakeBackend, type WorkResponse } from '../lib/api'
import { useAuthState } from '../components/useAuthState'
import { useIsMobile } from '../hooks/useIsMobile'
import type { Vector3 } from 'three'

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
  const isMobile = useIsMobile()

  const [work, setWork] = useState<WorkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)

  // ─── 後処理用の状態 ───
  const [postProcessing, setPostProcessing] = useState<'strap' | 'base' | null>(null)
  const [strapBlobUrl, setStrapBlobUrl] = useState<string | null>(null)
  const [baseBlobUrl, setBaseBlobUrl] = useState<string | null>(null)
  // STLビュー切り替え
  const [stlViewUrl, setStlViewUrl] = useState<string | null>(null)
  const [showStl,    setShowStl]    = useState(false)
  // オーバーレイ表示フラグ
  const [showBaseOverlay, setShowBaseOverlay] = useState(false)

  // 購入状態
  const [isPurchased, setIsPurchased] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)

  // ストラップ穴ピックモードの状態
  const [isPickingHole, setIsPickingHole] = useState(false)
  const [holePickPoint, setHolePickPoint] = useState<{ x: number; y: number; z: number } | null>(null)
  const [holeRadiusMm, setHoleRadiusMm] = useState(1.0)  // 穴の半径mm

  // 台座パラメータ
  const [baseHeightMm,  setBaseHeightMm]  = useState(3)   // 台座の高さmm
  const [baseMarginPct, setBaseMarginPct] = useState(15)  // 余白%

  useEffect(() => {
    if (!id) return
    // ページ読み込み時にバックエンドを起動しておく（Renderスリープ対策）
    wakeBackend()
    const load = async () => {
      try {
        const data = await fetchWork(id)
        setWork(data)
        // 購入状態確認（有料作品のみ）
        if (data.price > 0) {
          import('../lib/api').then(({ checkPurchase }) =>
            checkPurchase(id).then(r => setIsPurchased(r.purchased)).catch(() => {})
          )
        }
      } catch (e) {
        console.error('Work fetch error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('purchase') === 'success') {
      setIsPurchased(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

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
    // ダウンロード数をバックエンドに記録（fire-and-forget）
    recordDownload(work.id).then((res) => {
      setWork((prev) => (prev ? { ...prev, downloads: res.downloads } : prev))
    }).catch(() => {})
    const a = document.createElement('a')
    a.href = work.stl_url
    a.download = `${work.title ?? 'model'}.stl`
    a.click()
  }

  /** GLBファイルのダウンロード処理 */
  const handleDownloadGlb = () => {
    if (!work?.glb_url) return
    // ダウンロード数をバックエンドに記録（fire-and-forget）
    recordDownload(work.id).then((res) => {
      setWork((prev) => (prev ? { ...prev, downloads: res.downloads } : prev))
    }).catch(() => {})
    const a = document.createElement('a')
    a.href = work.glb_url
    a.download = `${work.title ?? 'model'}.glb`
    a.click()
  }

  /** ストラップ穴追加：ピック座標からSTLを生成・ダウンロード */
  const handleAddStrapHole = async () => {
    if (!work?.id) return
    if (!user) { alert('ストラップ穴の追加にはログインが必要です。'); return }
    if (!work.glb_url && !work.stl_url) { alert('3Dモデルデータがまだ生成されていません。'); return }

    // ピック座標をAPIパラメータに変換（未ピックの場合は中央上部をデフォルト）
    // モデルはscale=2.2のため、1.1 = 上端・ -1.1 = 下端
    const pt = holePickPoint ?? { x: 0, y: 1.0, z: 0 }
    const offset_x = (pt.x / 1.1) * 100
    const offset_y = (pt.z / 1.1) * 100   // Three.jsのz軸が前後方向
    const depth_mm  = Math.max(0.5, Math.min(30, (1.1 - pt.y) / 0.022))

    setPostProcessing('strap')
    setStlViewUrl(null)
    setShowStl(false)
    if (strapBlobUrl) { URL.revokeObjectURL(strapBlobUrl); setStrapBlobUrl(null) }
    try {
      const blobUrl = await addStrapHole(work.id, {
        offset_x,
        offset_y,
        depth_mm,
        radius_mm: holeRadiusMm,
      })
      setStrapBlobUrl(blobUrl)
      setStlViewUrl(blobUrl)
      setShowStl(true)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${work.title ?? 'model'}_hole.stl`
      a.click()
    } catch (e) {
      console.error(e)
      const msg = (e instanceof Error && e.message.includes('fetch'))
        ? 'サーバーに接続できませんでした。サーバーが起動中の場合は30秒ほど待ってから再度お試しください。'
        : 'ストラップ穴の追加に失敗しました。'
      alert(msg)
    } finally {
      setPostProcessing(null)
    }
  }

  const handlePurchase = async () => {
    if (!user) { alert('購入にはログインが必要です。'); return }
    if (!work) return
    setPurchaseLoading(true)
    try {
      const { createCheckout } = await import('../lib/api')
      const res = await createCheckout(work.id)
      if (res.purchased) {
        setIsPurchased(true)
      } else if (res.url) {
        window.location.href = res.url
      }
    } catch (e) {
      alert('購入処理に失敗しました。もう一度お試しください。')
      console.error(e)
    } finally {
      setPurchaseLoading(false)
    }
  }

  /** 台座追加：STLを直接ダウンロード */
  const handleAddBase = async () => {
    if (!work?.id) return
    if (!user) { alert('台座の追加にはログインが必要です。'); return }
    if (!work.glb_url && !work.stl_url) { alert('3Dモデルデータがまだ生成されていません。'); return }
    setPostProcessing('base')
    setStlViewUrl(null)
    setShowStl(false)
    if (baseBlobUrl) { URL.revokeObjectURL(baseBlobUrl); setBaseBlobUrl(null) }
    try {
      const blobUrl = await addBase(work.id, {
        height_mm:  baseHeightMm,
        margin_pct: baseMarginPct,
      })
      setBaseBlobUrl(blobUrl)
      setStlViewUrl(blobUrl)  // 加工後STLをビューアに反映
      setShowStl(true)         // STLビューに自動切り替え
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${work.title ?? 'model'}_base.stl`
      a.click()
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
          paddingTop: isMobile ? 100 : 150,
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
          paddingTop: isMobile ? 120 : 150,
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
    <main style={{ paddingTop: isMobile ? 120 : 140, minHeight: '100vh', paddingBottom: 40 }}>
      <div className="page-container" style={{ paddingTop: isMobile ? 16 : 28, paddingBottom: 20 }}>
        {/* 戻るボタン */}
        <button
          onClick={() => navigate('/market')}
          className="btn-outline"
          style={{ marginBottom: 28, padding: '9px 20px', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={15} />
          マーケットに戻る
        </button>

        <div className="work-detail-grid">
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
            {/* GLB / STL 切り替えタブ（STL生成後に表示） */}
            {stlViewUrl && (
              <div style={{ display: 'flex', gap: 6, padding: '10px 0 0' }}>
                <button
                  onClick={() => setShowStl(false)}
                  style={{
                    flex: 1, padding: '7px', fontSize: '0.78rem', fontWeight: 700,
                    borderRadius: 'var(--radius-btn)', cursor: 'pointer', fontFamily: 'var(--font-base)',
                    border: `2px solid ${!showStl ? 'var(--color-pink)' : 'var(--color-border)'}`,
                    background: !showStl ? '#FFEDF4' : 'white',
                    color: !showStl ? 'var(--color-pink)' : 'var(--color-text-muted)',
                  }}
                >
                  🎨 GLBビュー
                </button>
                <button
                  onClick={() => setShowStl(true)}
                  style={{
                    flex: 1, padding: '7px', fontSize: '0.78rem', fontWeight: 700,
                    borderRadius: 'var(--radius-btn)', cursor: 'pointer', fontFamily: 'var(--font-base)',
                    border: `2px solid ${showStl ? 'var(--color-purple)' : 'var(--color-border)'}`,
                    background: showStl ? '#F5EDFF' : 'white',
                    color: showStl ? 'var(--color-purple)' : 'var(--color-text-muted)',
                  }}
                >
                  🔧 STLビュー（加工済）
                </button>
              </div>
            )}
            {work.glb_url ? (
              <Viewer3D
                glbUrl={work.glb_url}
                stlUrl={showStl && stlViewUrl ? stlViewUrl : undefined}
                onHolePick={(!showStl && isPickingHole)
                  ? (point: Vector3) => {
                      setHolePickPoint({ x: point.x, y: point.y, z: point.z })
                      setIsPickingHole(false)
                    }
                  : undefined
                }
                holeMarkerPos={!showStl && holePickPoint
                  ? [holePickPoint.x, holePickPoint.y, holePickPoint.z]
                  : undefined
                }
                baseOverlay={!showStl && showBaseOverlay ? {
                  heightMm: baseHeightMm, marginPct: baseMarginPct,
                } : undefined}
                height={isMobile ? 350 : 500}
              />
            ) : (
              <div
                style={{
                  height: isMobile ? 350 : 500,
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 作品情報カード */}
            <div
              style={{
                background: 'white',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: isMobile ? '12px' : '24px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* ジャンルバッジ */}
              {work.genre && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: isMobile ? '3px 10px' : '4px 14px',
                    background: '#FFEDF4',
                    color: 'var(--color-pink)',
                    border: '1.5px solid var(--color-pink-light)',
                    borderRadius: 100,
                    fontSize: isMobile ? '0.72rem' : '0.78rem',
                    fontWeight: 700,
                    marginBottom: isMobile ? 6 : 12,
                  }}
                >
                  {GENRE_LABELS[work.genre] ?? work.genre}
                </span>
              )}

              <h1
                style={{
                  fontSize: isMobile ? '1.1rem' : '1.6rem',
                  fontWeight: 900,
                  marginBottom: isMobile ? 8 : 20,
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
                  gap: 5,
                  padding: isMobile ? '3px 10px' : '6px 18px',
                  background: work.price === 0 ? '#E8FFF4' : '#FFEDF4',
                  border: `2px solid ${work.price === 0 ? '#90D4A4' : 'var(--color-pink-light)'}`,
                  borderRadius: 100,
                  fontSize: isMobile ? '0.82rem' : '1rem',
                  fontWeight: 800,
                  color: work.price === 0 ? '#22863a' : 'var(--color-pink)',
                  marginBottom: isMobile ? 8 : 20,
                }}
              >
                {work.price === 0 ? '🆓 無料！' : `💰 ¥${work.price.toLocaleString()}`}
              </div>

              {/* いいねボタン */}
              <div style={{ marginTop: isMobile ? 4 : 8 }}>
                <button
                  onClick={handleLike}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: isLiked ? '#FFEDF4' : 'white',
                    border: `2px solid ${isLiked ? 'var(--color-pink)' : 'var(--color-border)'}`,
                    borderRadius: 100,
                    padding: isMobile ? '6px 12px' : '10px 20px',
                    cursor: 'pointer',
                    color: isLiked ? 'var(--color-pink)' : 'var(--color-text-sub)',
                    fontSize: isMobile ? '0.78rem' : '0.95rem',
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                    transform: isLiked ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <Heart size={isMobile ? 14 : 18} fill={isLiked ? 'currentColor' : 'none'} />
                  {work.likes_count} いいね！
                </button>
              </div>
            </div>

            {/* STL/GLBダウンロードボタン */}
            {(() => {
              const isAuthor = user?.uid === work.author_firebase_uid

              const downloadButtons = (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {work.stl_url ? (
                    <button onClick={handleDownload} className="btn-primary" style={{ padding: isMobile ? '12px' : '16px', justifyContent: 'center', fontSize: isMobile ? '0.9rem' : '1rem', width: '100%' }}>
                      <Download size={20} /> ダウンロードして印刷する
                    </button>
                  ) : work.glb_url ? (
                    <button onClick={handleDownloadGlb} className="btn-primary" style={{ padding: isMobile ? '12px' : '16px', justifyContent: 'center', fontSize: isMobile ? '0.9rem' : '1rem', width: '100%' }}>
                      <Download size={20} /> ダウンロードして印刷する
                    </button>
                  ) : null}
                  {work.stl_url && work.glb_url && (
                    <button onClick={handleDownloadGlb} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: isMobile ? '10px' : '14px', background: 'white', color: 'var(--color-purple)', border: '2px solid #DDB3F5', borderRadius: 'var(--radius-btn)', cursor: 'pointer', fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 700, fontFamily: 'var(--font-base)', transition: 'all 0.2s', width: '100%' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F5EDFF'; e.currentTarget.style.borderColor = 'var(--color-purple)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#DDB3F5' }}>
                      <Download size={18} /> 💾 GLBをダウンロード（3Dデータ）
                    </button>
                  )}
                </div>
              )

              if (work.price === 0) {
                // 無料作品: そのままDL
                return downloadButtons
              }

              if (isAuthor) {
                // 出品者: DLできるが注釈を表示
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ padding: '8px 12px', background: '#F5EDFF', border: '1.5px solid #DDB3F5', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--color-purple)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      🏷️ あなたの出品作品です（¥{work.price.toLocaleString()}）。他のユーザーには購入画面が表示されます。
                    </div>
                    {downloadButtons}
                  </div>
                )
              }

              if (isPurchased) {
                // 購入済み: DLできる
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ padding: '8px 12px', background: '#E8FFF4', border: '1.5px solid #90D4A4', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: '#22863a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      ✅ 購入済みです
                    </div>
                    {downloadButtons}
                  </div>
                )
              }

              // 未購入の有料作品: 購入ボタンのみ
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={handlePurchase}
                    disabled={purchaseLoading}
                    className="btn-primary"
                    style={{ padding: isMobile ? '14px' : '18px', justifyContent: 'center', fontSize: isMobile ? '1rem' : '1.1rem', width: '100%', opacity: purchaseLoading ? 0.7 : 1 }}
                  >
                    {purchaseLoading
                      ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> 処理中…</>
                      : <><ShoppingCart size={20} /> ¥{work.price.toLocaleString()} で購入する</>
                    }
                  </button>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    購入後すぐにダウンロードできます
                  </p>
                  {/* DLボタンをロック表示 */}
                  <div style={{ position: 'relative', borderRadius: 'var(--radius-btn)', overflow: 'hidden' }}>
                    <button disabled style={{ width: '100%', padding: isMobile ? '12px' : '14px', background: '#e5e7eb', color: '#9ca3af', border: 'none', borderRadius: 'var(--radius-btn)', fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 700, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-base)' }}>
                      🔒 購入するとダウンロードできます
                    </button>
                  </div>
                </div>
              )
            })()}

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
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  🔧 3Dプリント用カスタマイズ
                </p>

                {/* ─ ストラップ穴 ─ */}
                <div
                  style={{
                    background: '#FFF9FB',
                    border: `1.5px solid ${holePickPoint ? 'var(--color-pink)' : 'var(--color-pink-light)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    marginBottom: 12,
                  }}
                >
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-pink)', marginBottom: 12 }}>
                    🔴 ストラップ穴の追加
                  </p>

                  {/* ピック状態に応じてボタン/確認表示を切り替え */}
                  {!holePickPoint ? (
                    <button
                      onClick={() => setIsPickingHole((v) => !v)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: isPickingHole ? '#FFEDF4' : 'white',
                        border: `2px dashed ${isPickingHole ? 'var(--color-pink)' : 'var(--color-pink-light)'}`,
                        borderRadius: 'var(--radius-btn)',
                        color: isPickingHole ? 'var(--color-pink)' : 'var(--color-text-sub)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-base)',
                        transition: 'all 0.2s',
                        lineHeight: 1.5,
                        textAlign: 'center',
                        whiteSpace: 'normal',
                      }}
                    >
                      {isPickingHole ? (
                        <>👆 3Dモデルをタップして<br />位置を指定中…</>
                      ) : (
                        <>📍 3Dビューアをタップして<br />穴位置を指定</>
                      )}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-pink)', fontWeight: 700, flex: 1 }}>
                        📍 穴位置を指定しました！
                      </span>
                      <button
                        onClick={() => { setHolePickPoint(null); setIsPickingHole(false) }}
                        style={{
                          padding: '4px 10px',
                          background: 'white',
                          border: '1.5px solid var(--color-pink-light)',
                          borderRadius: 100,
                          fontSize: '0.75rem',
                          color: 'var(--color-text-sub)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-base)',
                        }}
                      >
                        やり直す
                      </button>
                    </div>
                  )}

                  {/* 穴の半径スライダー */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', fontWeight: 600 }}>穴の半径</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-pink)', fontWeight: 700 }}>
                        {holeRadiusMm}mm（直径 {(holeRadiusMm * 2).toFixed(1)}mm）
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5} max={3.0} step={0.25}
                      value={holeRadiusMm}
                      onChange={(e) => setHoleRadiusMm(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-pink)' }}
                    />
                  </div>

                  {/* 生成ボタン */}
                  <button
                    onClick={handleAddStrapHole}
                    disabled={postProcessing === 'strap'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                      width: '100%', padding: '11px', marginTop: 12,
                      background: postProcessing === 'strap' ? '#f3f4f6' : 'var(--color-pink)',
                      color: postProcessing === 'strap' ? 'var(--color-text-muted)' : 'white',
                      border: 'none', borderRadius: 'var(--radius-btn)',
                      cursor: postProcessing === 'strap' ? 'not-allowed' : 'pointer',
                      fontSize: '0.88rem', fontWeight: 700, fontFamily: 'var(--font-base)',
                    }}
                  >
                    {postProcessing === 'strap'
                      ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 処理中（1〜2分）…</>
                      : <><Download size={16} /> 穴あきSTLを生成・ダウンロード</>
                    }
                  </button>
                  {strapBlobUrl && (
                    <a
                      href={strapBlobUrl}
                      download={`${work.title ?? 'model'}_hole.stl`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                        marginTop: 8, padding: '8px', fontSize: '0.8rem',
                        background: '#E8FFF4', color: '#22863a',
                        border: '2px solid #90D4A4', borderRadius: 'var(--radius-btn)',
                        textDecoration: 'none', fontWeight: 700,
                      }}
                    >
                      <Download size={14} /> 再ダウンロード
                    </a>
                  )}
                </div>

                {/* ─ 台座 ─ */}
                <div
                  style={{
                    background: '#F9F5FF',
                    border: `1.5px solid ${showBaseOverlay ? 'var(--color-purple)' : '#DDB3F5'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                  }}
                >
                  {/* チェックボックス付きタイトル */}
                  <label
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-purple)',
                      marginBottom: showBaseOverlay ? 12 : 0, cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showBaseOverlay}
                      onChange={e => setShowBaseOverlay(e.target.checked)}
                      style={{ accentColor: 'var(--color-purple)', width: 16, height: 16, cursor: 'pointer' }}
                    />
                    🟣 台座のサイズをビューアに表示
                  </label>

                  {/* スライダー群（チェック時のみ表示） */}
                  {showBaseOverlay && (
                    <>
                      {[
                        { label: '台座の高さ', value: baseHeightMm, min: 1, max: 10, step: 0.5, unit: 'mm', setter: setBaseHeightMm },
                        { label: 'モデルからの張り出し', value: baseMarginPct, min: 0, max: 50, step: 5, unit: '%', setter: setBaseMarginPct },
                      ].map(({ label, value, min, max, step, unit, setter }) => (
                        <div key={label} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-sub)', fontWeight: 600 }}>{label}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-purple)', fontWeight: 700 }}>
                              {value}{unit}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={value}
                            onChange={(e) => setter(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--color-purple)' }}
                          />
                        </div>
                      ))}
                    </>
                  )}

                  <button
                    onClick={handleAddBase}
                    disabled={postProcessing === 'base'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                      width: '100%', padding: '11px', marginTop: showBaseOverlay ? 4 : 12,
                      background: postProcessing === 'base' ? '#f3f4f6' : 'var(--color-purple)',
                      color: postProcessing === 'base' ? 'var(--color-text-muted)' : 'white',
                      border: 'none', borderRadius: 'var(--radius-btn)',
                      cursor: postProcessing === 'base' ? 'not-allowed' : 'pointer',
                      fontSize: '0.88rem', fontWeight: 700, fontFamily: 'var(--font-base)',
                    }}
                  >
                    {postProcessing === 'base'
                      ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 処理中（1〜2分）…</>
                      : <><Download size={16} /> 台座付きSTLを生成・ダウンロード</>
                    }
                  </button>
                  {baseBlobUrl && (
                    <a
                      href={baseBlobUrl}
                      download={`${work.title ?? 'model'}_base.stl`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                        marginTop: 8, padding: '8px', fontSize: '0.8rem',
                        background: '#F5EDFF', color: 'var(--color-purple)',
                        border: '2px solid #DDB3F5', borderRadius: 'var(--radius-btn)',
                        textDecoration: 'none', fontWeight: 700,
                      }}
                    >
                      <Download size={14} /> 再ダウンロード
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

            {/* モックアップ: 通報・ライセンス管理 */}
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button
                onClick={async () => {
                  const reason = prompt('通報理由を入力してください:')
                  if (!reason?.trim()) return
                  try {
                    await reportWork(work.id, reason.trim())
                    alert('通報を受け付けました。運営チームが確認いたします。')
                  } catch {
                    alert('通報に失敗しました。もう一度お試しください。')
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center',
                  padding: '10px', background: 'transparent', color: 'var(--color-text-sub)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-btn)',
                  fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Flag size={14} /> 通報する
              </button>
            </div>
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
