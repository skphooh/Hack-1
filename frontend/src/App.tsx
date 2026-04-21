// アプリケーションルート: ルーティング設定
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import Top from './pages/Top'
import Generate from './pages/Generate'
import Market from './pages/Market'
import MyPage from './pages/MyPage'
import WorkDetail from './pages/WorkDetail'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Top />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/market" element={<Market />} />
        <Route path="/works/:id" element={<WorkDetail />} />
        <Route path="/mypage" element={<MyPage />} />
        {/* 404 フォールバック */}
        <Route
          path="*"
          element={
            <main
              style={{
                paddingTop: 80,
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <h1 className="gradient-text" style={{ fontSize: '4rem', fontWeight: 800 }}>
                404
              </h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>ページが見つかりません</p>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
