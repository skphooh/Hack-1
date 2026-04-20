// ドラッグ＆ドロップ画像アップロードコンポーネント
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, ImageIcon } from 'lucide-react'

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
        border: `2px dashed ${isDragActive ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: '48px 24px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: isDragActive
          ? 'rgba(167, 139, 250, 0.08)'
          : 'var(--color-bg-glass)',
        backdropFilter: 'blur(16px)',
        transition: 'all 0.25s ease',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input {...getInputProps()} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {isDragActive ? (
          <ImageIcon size={48} color="var(--color-accent-primary)" />
        ) : (
          <Upload size={48} color="var(--color-text-secondary)" />
        )}
        <div>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {isDragActive ? 'ドロップして追加！' : '画像をここにドロップ'}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            またはクリックして選択 · JPG / PNG / WEBP
          </p>
        </div>
      </div>
    </div>
  )
}
