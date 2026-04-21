import { useState } from 'react'
import { Heart, Download, Star } from 'lucide-react'
import type { WorkResponse } from '../lib/api'
import { Viewer3D } from './Viewer3D'

interface WorkCardProps {
  work: WorkResponse
  /** カードクリック時のコールバック */
  onClick?: () => void
  /** いいねボタン押下時のコールバック */
  onLike?: () => void
  /** 現在ユーザーがいいね済みか */
  isLiked?: boolean
}

/** ジャンルラベルの日本語マッピング */
const GENRE_LABELS: Record<string, string> = {
  figure: 'フィギュア',
  anime: 'アニメ・イラスト',
  cosplay: 'コスプレ',
  original: 'オリジナル',
  official: '公式',
  other: 'その他',
}

export function WorkCard({ work, onClick, onLike, isLiked = false }: WorkCardProps) {
  const [has3DError, setHas3DError] = useState(false)

  return (
    <article
      id={`work-card-${work.id}`}
      onClick={onClick}
      style={{
        background: 'var(--color-bg-glass)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-glow)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent-primary)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
      }}
    >
      {/* 3Dモデル または サムネイル */}
      <div style={{ position: 'relative', height: '200px', background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
        {work.glb_url && !has3DError ? (
          <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
            <Viewer3D glbUrl={work.glb_url} isMarket={true} height={200} onError={() => setHas3DError(true)} />
          </div>
        ) : work.thumbnail_url ? (
          <img
            src={work.thumbnail_url}
            alt={work.title}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--gradient-card)',
            }}
          >
            <span style={{ fontSize: '2rem' }}>🎭</span>
          </div>
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
              background: 'var(--gradient-button)',
              borderRadius: 100,
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'white',
            }}
          >
            <Star size={12} fill="white" /> 公式
          </div>
        )}
        {/* 価格バッジ */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '4px 10px',
            background: 'rgba(13, 13, 20, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: 100,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: work.price === 0 ? '#34d399' : 'var(--color-accent-secondary)',
          }}
        >
          {work.price === 0 ? '無料' : `¥${work.price.toLocaleString()}`}
        </div>
      </div>

      {/* カード情報 */}
      <div style={{ padding: '14px 16px 16px' }}>
        {work.genre && (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              background: 'rgba(167, 139, 250, 0.15)',
              color: 'var(--color-accent-primary)',
              borderRadius: 100,
              fontSize: '0.7rem',
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {GENRE_LABELS[work.genre] ?? work.genre}
          </span>
        )}

        <h3
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
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
            marginTop: 12,
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
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isLiked ? 'var(--color-accent-secondary)' : 'var(--color-text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
          >
            <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
            {work.likes_count}
          </button>

          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem',
            }}
          >
            <Download size={14} />
            {work.downloads}
          </span>
        </div>
      </div>
    </article>
  )
}
