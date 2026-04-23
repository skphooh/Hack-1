// Three.js 3Dビューアコンポーネント（GLB / OBJ 対応）
import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import type { Mesh } from 'three'
import { ErrorBoundary } from './ErrorBoundary'

/** 自動回転するGLBモデル */
function RotatingModel({ url }: { url: string }) {
  // Tripo3D等のDraco圧縮されたファイルにも対応するため、第2引数にデコーダーのパスを指定
  const { scene } = useGLTF(url, 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
  // useGLTF はシーンをグローバルキャッシュで共有する。Three.js の Object3D は
  // 1つの Canvas にしか属せないため、複数カードで同じシーンを奪い合わないようクローンする。
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const groupRef = useRef<Mesh>(null!)

  // 毎フレーム少しずつ回転
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
  })

  return <primitive ref={groupRef} object={cloned} scale={2.2} />
}

/** ローディングプレースホルダー */
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#a78bfa" wireframe />
    </mesh>
  )
}

interface Viewer3DProps {
  /** 表示するGLBファイルのURL */
  glbUrl: string
  /** ビューアの高さ */
  height?: number
  /** マーケット等で多数表示する際の軽量モード */
  isMarket?: boolean
  /** 読み込みエラー時のコールバック */
  onError?: () => void
}

export function Viewer3D({ glbUrl, height = 400, isMarket = false, onError }: Viewer3DProps) {
  return (
    <div
      id="model-viewer"
      style={{
        width: '100%',
        height,
        borderRadius: isMarket ? 0 : 'var(--radius-lg)',
        overflow: 'hidden',
        background: isMarket ? 'transparent' : 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d14 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ErrorBoundary
        onCatch={onError}
        fallback={
          <div style={{ color: '#ef4444', textAlign: 'center', padding: isMarket ? '10px' : '20px' }}>
            <p style={{ fontWeight: 'bold', fontSize: isMarket ? '0.8rem' : '1rem', marginBottom: '4px' }}>表示エラー</p>
            {!isMarket && <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>読み込みに失敗しました。</p>}
          </div>
        }
      >
        <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} gl={{ antialias: !isMarket, powerPreference: 'high-performance' }}>
          <ambientLight intensity={isMarket ? 0.8 : 0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Suspense fallback={<LoadingFallback />}>
            <RotatingModel url={glbUrl} />
            {!isMarket && <Environment preset="city" />}
            {!isMarket && <ContactShadows position={[0, -2.0, 0]} opacity={0.4} blur={2} />}
          </Suspense>
          <OrbitControls enablePan={false} enableZoom={!isMarket} autoRotate={isMarket} autoRotateSpeed={2} />
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}
