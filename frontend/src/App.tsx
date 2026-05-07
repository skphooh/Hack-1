// アプリケーションルート: ルーティング設定
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { View } from '@react-three/drei'
import { Navbar } from './components/Navbar'
import { wakeBackend } from './lib/api'
import Top from './pages/Top'
import Generate from './pages/Generate'
import Market from './pages/Market'
import MyPage from './pages/MyPage'
import WorkDetail from './pages/WorkDetail'
import LikedWorks from './pages/LikedWorks'
import Purchases from './pages/Purchases'
import Shop from './pages/Shop'
import Competition from './pages/Competition'
import Admin from './pages/Admin'
import Profile from './pages/Profile'
import Sell from './pages/Sell'
import Demo from './pages/Demo'

function App() {
  useEffect(() => { wakeBackend() }, [])

  return (
    <BrowserRouter>
      {/* 全WorkCardで共有するグローバルCanvas（WebGLコンテキスト1つで上限問題を根本解決） */}
      <Canvas
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
        eventSource={typeof document !== 'undefined' ? (document.getElementById('root') ?? document.body) : undefined as any}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
        dpr={[1, 1.5]}
        flat
        frameloop="always"
      >
        <View.Port />
      </Canvas>
      <Navbar />
      <Routes>
        <Route path="/" element={<Top />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/market" element={<Market />} />
        <Route path="/works/:id" element={<WorkDetail />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/liked" element={<LikedWorks />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/competition" element={<Competition />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/demo" element={<Demo />} />
        {/* 404 フォールバック */}
        <Route
          path="*"
          element={
            <main
              style={{
                paddingTop: 104,
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 20,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '5rem' }}>🔍</div>
              <h1 className="gradient-text" style={{ fontSize: '5rem', fontWeight: 900, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                404
              </h1>
              <p style={{ color: 'var(--color-text-sub)', fontWeight: 600, fontSize: '1rem' }}>
                ページが見つからなかったよ…😢
              </p>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
