// Three.js 3Dビューアコンポーネント（GLB / OBJ 対応）
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei'
import type { Mesh } from 'three'
import { ErrorBoundary } from './ErrorBoundary'

/** 自動回転するGLBモデル */
function RotatingModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const groupRef = useRef<Mesh>(null!)

  // 毎フレーム少しずつ回転
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
  })

  return <primitive ref={groupRef} object={scene} scale={1.5} />
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
}

export function Viewer3D({ glbUrl, height = 400 }: Viewer3DProps) {
  return (
    <div
      id="model-viewer"
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d14 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ErrorBoundary
        fallback={
          <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>モデルの読み込みに失敗しました</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>URLが不正か、ブラウザによってブロックされました。</p>
          </div>
        }
      >
        <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Suspense fallback={<LoadingFallback />}>
            <RotatingModel url={glbUrl} />
            <Environment preset="city" />
            <ContactShadows position={[0, -1.5, 0]} opacity={0.4} blur={2} />
          </Suspense>
          <OrbitControls enablePan={false} autoRotate={false} />
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}
