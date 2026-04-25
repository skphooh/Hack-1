// Three.js 3Dビューアコンポーネント（GLB / OBJ / STL 対応）
import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Box3, Vector3 } from 'three'
import type { BufferGeometry, Mesh } from 'three'
import { ErrorBoundary } from './ErrorBoundary'

// ─── GLBモデル ────────────────────────────────────────────────────────────────

function RotatingModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
  // useGLTF はシーンをグローバルキャッシュで共有するためクローンが必要
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const groupRef = useRef<Mesh>(null!)
  useFrame(() => { if (groupRef.current) groupRef.current.rotation.y += 0.005 })
  return <primitive ref={groupRef} object={cloned} scale={2.2} />
}

// ─── STLモデル ────────────────────────────────────────────────────────────────

function STLModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url) as BufferGeometry
  const ref = useRef<Mesh>(null!)

  // STLはmm単位なので正規化してGLBと同じスケール感にする
  const normalizedGeo = useMemo(() => {
    const geo = geometry.clone()
    geo.computeBoundingBox()
    const box = geo.boundingBox ?? new Box3().setFromBufferAttribute(
      geo.attributes.position as Parameters<Box3['setFromBufferAttribute']>[0]
    )
    const center = new Vector3()
    box.getCenter(center)
    geo.translate(-center.x, -center.y, -center.z)
    const size = new Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) geo.scale(2.2 / maxDim, 2.2 / maxDim, 2.2 / maxDim)
    geo.computeVertexNormals()
    return geo
  }, [geometry])

  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.005 })

  return (
    <mesh ref={ref} geometry={normalizedGeo}>
      <meshStandardMaterial color="#a78bfa" />
    </mesh>
  )
}

// ─── ストラップ穴 オーバーレイ ────────────────────────────────────────────────

export interface HoleOverlayConfig {
  offsetX: number   // % (-50 to 50)
  offsetY: number   // % (-50 to 50)
  depthMm: number
  radiusMm: number
}

// モデルは scale=2.2 ≈ 100mm → 1mm ≈ 0.022 world units
const MM = 0.022

function HoleOverlay({ offsetX, offsetY, depthMm, radiusMm }: HoleOverlayConfig) {
  const r = Math.max(radiusMm * MM, 0.02)
  const h = depthMm * MM
  const x = (offsetX / 50) * 0.8
  const z = (offsetY / 50) * 0.8
  const y = 1.1 - h / 2   // モデル上端から掘り下げる
  return (
    <mesh position={[x, y, z]}>
      <cylinderGeometry args={[r, r, h, 24]} />
      <meshStandardMaterial color="#ef4444" opacity={0.72} transparent />
    </mesh>
  )
}

// ─── 台座 オーバーレイ ────────────────────────────────────────────────────────

export interface BaseOverlayConfig {
  heightMm: number
  marginPct: number
}

function BaseOverlay({ heightMm, marginPct }: BaseOverlayConfig) {
  const h = Math.max(heightMm * MM, 0.01)
  const w = 1.5 * (1 + marginPct / 100)  // モデル底面フットプリント推定
  const y = -1.1 - h / 2                  // モデル下端に接続
  return (
    <mesh position={[0, y, 0]}>
      <boxGeometry args={[w, h, w]} />
      <meshStandardMaterial color="#9b59b6" opacity={0.55} transparent />
    </mesh>
  )
}

// ─── ローディング ─────────────────────────────────────────────────────────────

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#a78bfa" wireframe />
    </mesh>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Viewer3DProps {
  glbUrl: string
  height?: number
  isMarket?: boolean
  onError?: () => void
  /** 加工済みSTLを表示する場合に指定（設定するとGLBの代わりにSTLを表示） */
  stlUrl?: string
  /** ストラップ穴位置のオーバーレイ（GLBモード時のみ表示） */
  holeOverlay?: HoleOverlayConfig
  /** 台座サイズのオーバーレイ（GLBモード時のみ表示） */
  baseOverlay?: BaseOverlayConfig
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function Viewer3D({
  glbUrl,
  height = 400,
  isMarket = false,
  onError,
  stlUrl,
  holeOverlay,
  baseOverlay,
}: Viewer3DProps) {
  return (
    <div
      id="model-viewer"
      style={{
        width: '100%',
        height,
        borderRadius: isMarket ? 0 : 'var(--radius-lg)',
        overflow: 'hidden',
        background: isMarket
          ? 'transparent'
          : 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d14 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ErrorBoundary
        onCatch={onError}
        fallback={
          <div style={{ color: '#ef4444', textAlign: 'center', padding: isMarket ? '10px' : '20px' }}>
            <p style={{ fontWeight: 'bold', fontSize: isMarket ? '0.8rem' : '1rem', marginBottom: '4px' }}>
              表示エラー
            </p>
            {!isMarket && (
              <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>読み込みに失敗しました。</p>
            )}
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 3.5], fov: 45 }}
          gl={{ antialias: !isMarket, powerPreference: 'high-performance' }}
        >
          <ambientLight intensity={isMarket ? 0.8 : 0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          {/* ✅ 正面から照らすライトを追加 (顔などを明るくする用) */}
          {!isMarket && (
            <directionalLight
              position={[0, 0, 5]} // 正面(Z=5)、カメラ(Z=3.5)の少し後ろ
              intensity={0.8}      // 既存のライトより少し弱くして立体感を保つ
              color="#ffffff"
            />
          )}
          {/* オーバーレイ: GLBモード時のみ、Suspense外で同期描画 */}
          {!stlUrl && holeOverlay && <HoleOverlay {...holeOverlay} />}
          {!stlUrl && baseOverlay && <BaseOverlay {...baseOverlay} />}

          <Suspense fallback={<LoadingFallback />}>
            {stlUrl ? <STLModel url={stlUrl} /> : <RotatingModel url={glbUrl} />}
            {!isMarket && <Environment preset="city" />}
            {!isMarket && <ContactShadows position={[0, -2.0, 0]} opacity={0.4} blur={2} />}
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom={!isMarket}
            autoRotate={isMarket}
            autoRotateSpeed={2}
          />
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}
