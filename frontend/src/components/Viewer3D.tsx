// Three.js 3Dビューアコンポーネント（GLB / OBJ / STL 対応）
import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useLoader, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Box3, Vector3 } from 'three'
import type { BufferGeometry, Mesh } from 'three'
import { ErrorBoundary } from './ErrorBoundary'

// HDR外部CDN取得失敗でも3Dビューア全体をクラッシュさせない
class SilentBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch() { /* silent */ }
  render() { return this.state.err ? null : this.props.children }
}

function SafeEnvironment() {
  return (
    <SilentBoundary>
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
    </SilentBoundary>
  )
}

// ─── GLBモデル（自動回転） ────────────────────────────────────────────────────

function RotatingModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const groupRef = useRef<Mesh>(null!)
  useFrame(() => { if (groupRef.current) groupRef.current.rotation.y += 0.005 })
  return <primitive ref={groupRef} object={cloned} scale={2.2} />
}

// ─── GLBモデル（非回転） ───────────────────────────────────────────────────

function StaticModel({ url, initialRotationY = 0, onLoad }: { url: string; initialRotationY?: number; onLoad?: () => void }) {
  const { scene } = useGLTF(url, 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene])

  useEffect(() => { onLoad?.() }, [])
  return <primitive object={cloned} scale={2.2} rotation={[0, initialRotationY, 0]} />
}

// ─── GLBモデル（クリックで穴位置指定モード） ─────────────────────────────────

function PickableModel({ url, onPick }: { url: string; onPick: (point: Vector3) => void }) {
  const { scene } = useGLTF(url, 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene])
  return (
    <primitive
      object={cloned}
      scale={2.2}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onPick(e.point)
      }}
    />
  )
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

// ─── 穴マーカー（赤い発光球） ─────────────────────────────────────────────────

function HoleMarker({ pos }: { pos: [number, number, number] }) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.07, 20, 20]} />
      <meshStandardMaterial
        color="#ef4444"
        emissive="#ef4444"
        emissiveIntensity={0.6}
        opacity={0.92}
        transparent
      />
    </mesh>
  )
}

// ─── 台座 オーバーレイ ────────────────────────────────────────────────────────

export interface BaseOverlayConfig {
  heightMm: number
  marginPct: number
}

function BaseOverlay({ heightMm, marginPct }: BaseOverlayConfig) {
  const MM = 0.022
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
  onLoad?: () => void
  /** 加工済みSTLを表示する場合に指定（設定するとGLBの代わりにSTLを表示） */
  stlUrl?: string
  /** 台座サイズのオーバーレイ */
  baseOverlay?: BaseOverlayConfig
  /**
   * 穴位置クリック指定モード。
   * このコールバックが渡された場合、モデルをクリック/タップすると交点の3D座標を返す。
   * 自動回転は停止し、カーソルが crosshair になる。
   */
  onHolePick?: (point: Vector3) => void
  /** ピック済みの穴マーカー座標 [x, y, z]（ワールド座標） */
  holeMarkerPos?: [number, number, number]
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function Viewer3D({
  glbUrl,
  height = 400,
  isMarket = false,
  onError,
  onLoad,
  stlUrl,
  baseOverlay,
  onHolePick,
  holeMarkerPos,
}: Viewer3DProps) {
  // ピックモード中はカーソルを crosshair にする
  const isPickMode = !!onHolePick

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
        position: 'relative',
        cursor: isPickMode ? 'crosshair' : 'grab',
      }}
    >
      {/* ピックモード中の案内オーバーレイ */}
      {isPickMode && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239, 68, 68, 0.85)',
            color: 'white',
            padding: '6px 16px',
            borderRadius: 100,
            fontSize: '0.8rem',
            fontWeight: 700,
            zIndex: 20,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          👆 モデルをタップして穴位置を指定
        </div>
      )}

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
          gl={{ antialias: !isMarket, powerPreference: 'high-performance', precision: isMarket ? 'lowp' : 'highp' }}
          dpr={isMarket ? [1, 1.5] : [1, 2]}
          flat={isMarket}
        >
          <ambientLight intensity={isMarket ? 1.2 : 0.8} />
          <directionalLight position={[5, 5, 5]} intensity={isMarket ? 1.0 : 1.5} />

          {/* 正面ライト（詳細ビュー時） */}
          {!isMarket && (
            <directionalLight position={[0, 0, 5]} intensity={0.8} color="#ffffff" />
          )}

          {/* 穴マーカー */}
          {holeMarkerPos && <HoleMarker pos={holeMarkerPos} />}

          {/* 台座オーバーレイ（GLBモード時のみ） */}
          {!stlUrl && baseOverlay && <BaseOverlay {...baseOverlay} />}

          <Suspense fallback={<LoadingFallback />}>
            {stlUrl ? (
              <STLModel url={stlUrl} />
            ) : isPickMode ? (
              // ピックモード: クリック可能モデル（自動回転なし）
              <PickableModel url={glbUrl} onPick={onHolePick!} />
            ) : holeMarkerPos ? (
              // マーカー表示中は静止（回転なし）
              <StaticModel url={glbUrl} />
            ) : isMarket ? (
              // マーケットカード: 正面向きで静止（-90度でTripo3D正面を向く）
              <StaticModel url={glbUrl} initialRotationY={-Math.PI / 2} onLoad={onLoad} />
            ) : (
              // 通常モード（詳細ページ等）: 自動回転
              <RotatingModel url={glbUrl} />
            )}
            {!isMarket && <SafeEnvironment />}
            {!isMarket && <ContactShadows position={[0, -2.0, 0]} opacity={0.4} blur={2} />}
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom={!isMarket}
            autoRotate={false}
            autoRotateSpeed={2}
          />
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}
