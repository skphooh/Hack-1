// WorkCardコンポーネント（ポップ・かわいいデザイン）
import { useState, useEffect, useRef } from 'react'
import { Heart, Download, Star } from 'lucide-react'
import type { WorkResponse } from '../lib/api'
import { Viewer3D } from './Viewer3D'
import { useIsMobile } from '../hooks/useIsMobile'
import { acquireContext, releaseContext } from '../lib/webglPool'

interface WorkCardProps {
  work: WorkResponse
  /** カードクリック時のコールバック */
  onClick?: () => void
  /** いいねボタン押下時のコールバック */
  onLike?: () => void
  /** 現在ユーザーがいいね済みか */
  isLiked?: boolean
  /** 順番（上位16件をデフォルト3D表示するため） */
  index?: number
}

/** ジャンルラベルの日本語マッピング */
const GENRE_LABELS: Record<string, string> = {
  figure: '🎭 フィギュア',
  anime: '🎨 アニメ・イラスト',
  cosplay: '✨ コスプレ',
  original: '⭐ オリジナル',
  official: '🌟 公式',
  other: '📦 その他',
}

/** ジャンルごとの色 */
const GENRE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  figure: { bg: '#FFEDF4', color: '#FF6B9D', border: '#FFAECB' },
  anime: { bg: '#EDF4FF', color: '#5B8CFF', border: '#A3C4FF' },
  cosplay: { bg: '#F0FFF4', color: '#28A745', border: '#90D4A4' },
  original: { bg: '#FFF9E6', color: '#E67E22', border: '#FFD699' },
  official: { bg: '#F5EDFF', color: '#9B59B6', border: '#DDB3F5' },
  other: { bg: '#F5F5F5', color: '#6B5380', border: '#D0BDE0' },
}

export function WorkCard({ work, onClick, onLike, isLiked = false, index = 99 }: WorkCardProps) {
  const isMobile = useIsMobile()
  const [has3DError, setHas3DError] = useState(false)
  // 持続表示: index<9の自動ロード、モバイルでのタップ
  const [persistActive, setPersistActive] = useState(false)
  // 一時表示: デスクトップのホバー・ボタン（マウスが外れたら戻る）
  const [hoverActive, setHoverActive] = useState(false)
  const [is3DLoaded, setIs3DLoaded] = useState(false)
  const autoLoad = index < 9
  const cardRef = useRef<HTMLElement>(null)

  const wantsToShow = (persistActive || hoverActive) && !!work.glb_url && !has3DError
  // プールの eviction が React の再レンダーを経由するため、
  // 古い Canvas がアンマウントされてから新しい Canvas をマウントするよう
  // RAF で 1 フレーム待つ（Context Lost 防止）
  const [poolConfirmed, setPoolConfirmed] = useState(false)
  useEffect(() => {
    if (!wantsToShow) {
      setPoolConfirmed(false)
      releaseContext(work.id)
      return
    }
    acquireContext(work.id, () => {
      setPoolConfirmed(false)
      setPersistActive(false)
      setHoverActive(false)
      setIs3DLoaded(false)
    })
    const raf = requestAnimationFrame(() => setPoolConfirmed(true))
    return () => cancelAnimationFrame(raf)
  }, [wantsToShow, work.id])

  useEffect(() => () => releaseContext(work.id), [work.id])

  // index < 9: 画面に入ったら持続起動
  useEffect(() => {
    const el = cardRef.current
    if (!el || !work.glb_url || !autoLoad) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPersistActive(true) },
      { rootMargin: '180px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [work.glb_url, autoLoad])

  // poolConfirmed = 退去した旧Canvasのアンマウント後に立つフラグ
  const show3D = poolConfirmed && wantsToShow
  useEffect(() => { if (!show3D) setIs3DLoaded(false) }, [show3D])

  const showThumbnail = !show3D || !is3DLoaded
  const genreColor = GENRE_COLORS[work.genre ?? ''] ?? GENRE_COLORS['other']

  // デスクトップ: ホバーで一時起動
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!isMobile) setHoverActive(true)
    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-6px) scale(1.01)'
    ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hover)'
  }
  // デスクトップ: マウスが外れたら一時表示を解除（持続中のカードはそのまま）
  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    setHoverActive(false)
    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'
    ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'
  }

  // 画像エリアタップ: モバイル→持続、デスクトップ→一時（マウス離れで戻る）
  const handleMediaClick = (e: React.MouseEvent) => {
    if (!show3D && work.glb_url && !has3DError) {
      e.stopPropagation()
      if (isMobile) setPersistActive(true)
      else setHoverActive(true)
    }
  }

  // ▶ 3D ボタン: デバイス問わず持続（明示的な操作なので戻さない）
  const handle3DButton = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPersistActive(true)
  }

  return (
    <article
      ref={cardRef}
      id={`work-card-${work.id}`}
      onClick={onClick}
      style={{
        background: 'var(--nm-bg)',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3Dモデル または プレースホルダー */}
      <div
        onClick={handleMediaClick}
        style={{
          position: 'relative',
          height: isMobile ? '155px' : '200px',
          background: 'var(--nm-bg)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: (!show3D && work.glb_url && !has3DError) ? 'pointer' : 'inherit',
        }}
      >
        {/* サムネイル: 3D未起動またはロード中は背景として表示 */}
        {showThumbnail && work.thumbnail_url && (
          <img
            src={work.thumbnail_url}
            alt={work.title}
            loading="lazy"
            decoding="async"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        {!show3D && !work.thumbnail_url && (
          <div style={{ textAlign: 'center', color: 'var(--color-purple)', opacity: 0.6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '2.5rem' }}>🎭</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>No Image</span>
          </div>
        )}

        {/* 条件を満たした時のみ3Dモデルを起動（WebGL上限回避） */}
        {show3D && (
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 10 }}>
            <Viewer3D glbUrl={work.glb_url!} isMarket={true} height={isMobile ? 155 : 200} onError={() => setHas3DError(true)} onLoad={() => setIs3DLoaded(true)} />
          </div>
        )}

        {/* 手動ロードカード: 3Dタップボタン */}
        {!show3D && work.glb_url && !has3DError && (
          <button
            onClick={handle3DButton}
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              background: 'rgba(107,159,255,0.88)',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              zIndex: 15,
              backdropFilter: 'blur(4px)',
            }}
          >
            ▶ 3D
          </button>
        )}

        {/* 公式バッジ */}
        {work.is_official && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: 'var(--color-yellow)',
              borderRadius: 100,
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#7A4F00',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <Star size={11} fill="#7A4F00" /> 公式
          </div>
        )}

        {/* 価格バッジ */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            padding: '2px 8px',
            background: work.price === 0 ? '#E8FFF4' : '#FFF0F6',
            border: `1.5px solid ${work.price === 0 ? '#90D4A4' : '#FFAECB'}`,
            borderRadius: 100,
            fontSize: '0.65rem',
            fontWeight: 700,
            color: work.price === 0 ? '#22863a' : 'var(--color-pink)',
          }}
        >
          {work.price === 0 ? '無料' : `¥${work.price.toLocaleString()}`}
        </div>
      </div>

      {/* カード情報 */}
      <div style={{ padding: isMobile ? '8px 10px 10px' : '12px 14px 14px' }}>
        {work.genre && (
          <span
            style={{
              display: 'inline-block',
              padding: isMobile ? '1px 7px' : '2px 10px',
              background: genreColor.bg,
              color: genreColor.color,
              border: `1.5px solid ${genreColor.border}`,
              borderRadius: 100,
              fontSize: isMobile ? '0.62rem' : '0.7rem',
              fontWeight: 700,
              marginBottom: isMobile ? 4 : 7,
              whiteSpace: 'nowrap',
            }}
          >
            {GENRE_LABELS[work.genre] ?? work.genre}
          </span>
        )}

        <h3
          style={{
            fontSize: isMobile ? '0.8rem' : '0.95rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-base)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {work.title}
        </h3>

        {/* フッター: いいね・ダウンロード数 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: isMobile ? 6 : 10,
          }}
        >
          <button
            id={`like-btn-${work.id}`}
            onClick={(e) => {
              e.stopPropagation()
              onLike?.()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: isLiked ? '#FFEDF4' : 'transparent',
              border: isLiked ? '1.5px solid var(--color-pink-light)' : '1.5px solid transparent',
              borderRadius: 100,
              padding: isMobile ? '3px 7px' : '4px 10px',
              cursor: 'pointer',
              color: isLiked ? 'var(--color-pink)' : 'var(--color-text-muted)',
              fontSize: isMobile ? '0.72rem' : '0.85rem',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <Heart size={isMobile ? 11 : 14} fill={isLiked ? 'currentColor' : 'none'} />
            {work.likes_count}
          </button>

          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              color: 'var(--color-text-muted)',
              fontSize: isMobile ? '0.7rem' : '0.82rem',
            }}
          >
            <Download size={isMobile ? 11 : 13} />
            {work.downloads}
          </span>
        </div>
      </div>
    </article>
  )
}
