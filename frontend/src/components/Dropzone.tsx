// ドロップゾーンコンポーネント（ポップ・かわいいデザイン）
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface DropzoneProps {
  /** ファイル選択時のコールバック */
  onFile: (file: File) => void
  /** 受け入れるMIMEタイプ */
  accept?: string[]
  /** 無効化フラグ */
  disabled?: boolean
}

export function Dropzone({ onFile, accept = ['image/*'], disabled = false }: DropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0])
    },
    [onFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(accept.map((t) => [t, []])),
    maxFiles: 1,
    disabled,
  })

  return (
    <div
      {...getRootProps()}
      id="image-dropzone"
      style={{
        border: `2.5px dashed ${isDragActive ? 'var(--color-pink)' : 'var(--color-pink-light)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: '48px 24px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: isDragActive
          ? '#FFEDF4'
          : 'linear-gradient(135deg, rgba(255,237,244,0.6) 0%, rgba(245,237,255,0.6) 100%)',
        transition: 'all 0.25s ease',
        opacity: disabled ? 0.5 : 1,
        transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <input {...getInputProps()} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        {/* 大きめのイラスト風アイコン */}
        <div
          style={{
            fontSize: isDragActive ? '4rem' : '3.5rem',
            lineHeight: 1,
            transition: 'all 0.3s ease',
            filter: 'drop-shadow(0 4px 8px rgba(255,107,157,0.3))',
          }}
        >
          {isDragActive ? '🎁' : '🖼️'}
        </div>
        <div>
          <p
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: isDragActive ? 'var(--color-pink)' : 'var(--color-text)',
              fontFamily: 'var(--font-base)',
            }}
          >
            {isDragActive ? 'ここにドロップしてね！✨' : '画像を選んでね！📸'}
          </p>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-sub)',
              marginTop: 6,
            }}
          >
            クリックまたはドラッグ＆ドロップ · JPG / PNG / WEBP
          </p>
        </div>
      </div>
    </div>
  )
}
