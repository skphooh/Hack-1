import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn, Sparkles, ShoppingBag, Upload, Cpu, Download } from 'lucide-react'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup } from 'firebase/auth'
import { useAuthState } from '../components/useAuthState'
import { WorkCard } from '../components/WorkCard'
import { fetchWorks, type WorkResponse } from '../lib/api'
import logo02Img from '../assets/logo02.png'
import logo03Img from '../assets/logo03.png'
import heroImg from '../assets/hero.png'

const FLOW_CARDS = [
  {
    emoji: '🎨',
    title: '写真→3Dデータ生成',
    description: '推しキャラや子どもの絵を1枚アップするだけ。AIが3Dメッシュを自動生成し、STLデータでダウンロードできます！',
    tag: '✨ フロー①',
    tagBg: '#FFEDF4',
    tagColor: '#FF6B9D',
    tagBorder: '#FFAECB',
    link: '/generate',
    dotColor: '#FF6B9D',
  },
  {
    emoji: '🛍️',
    title: 'マーケットで探す',
    description: 'コミュニティが作った3Dデータを検索・閲覧。自分のプリンターで印刷して手元に届けよう！',
    tag: '⭐ フロー②',
    tagBg: '#F5EDFF',
    tagColor: '#9B59B6',
    tagBorder: '#DDB3F5',
    link: '/market',
    dotColor: '#9B59B6',
  },
  {
    emoji: '🏢',
    title: '公式データを出品',
    description: 'メーカー・作家・サークルが3Dデータをアップして販売。送料ゼロ、在庫ゼロの新しい商品流通！',
    tag: '💎 フロー③',
    tagBg: '#EDFCFB',
    tagColor: '#4ECDC4',
    tagBorder: '#9EEAE6',
    link: '/market',
    dotColor: '#4ECDC4',
  },
]

const ISSUES = [
  { emoji: '😢', label: 'マイナーキャラのグッズ', value: '存在しない…' },
  { emoji: '😤', label: '人気すぎて買えない', value: '転売問題！' },
  { emoji: '🥺', label: '廃盤・絶版グッズ', value: '入手不可…' },
  { emoji: '💪', label: '送料・納期の壁', value: '解決します！' },
]

const DEMO_STEPS = [
  {
    icon: Upload,
    step: 'STEP 1',
    title: '写真をアップロード',
    description: 'スマホで撮った写真でもOK！イラスト・フィギュア・キャラクター画像を選ぶだけ。',
    color: '#FF6B9D',
    bg: '#FFEDF4',
    border: '#FFAECB',
    mockLines: ['📁 ファイルを選択', '✅ character.png (2.4MB)', '🖼️ プレビュー表示中...'],
  },
  {
    icon: Cpu,
    step: 'STEP 2',
    title: 'AIが自動で3D変換',
    description: 'ターンアラウンド画像を生成してから、Tripo AIが高精度な3Dメッシュを作成します。',
    color: '#9B59B6',
    bg: '#F5EDFF',
    border: '#DDB3F5',
    mockLines: ['🎨 ターンアラウンド生成中...', '🤖 3Dメッシュ変換中...', '✨ 最適化処理中...'],
  },
  {
    icon: Download,
    step: 'STEP 3',
    title: 'STLをダウンロード',
    description: '3Dプリンター対応のSTLファイルをダウンロード。マーケットへの出品もワンクリック！',
    color: '#4ECDC4',
    bg: '#EDFCFB',
    border: '#9EEAE6',
    mockLines: ['📦 model.stl (8.2MB)', '🖨️ 3Dプリンター対応', '🛍️ マーケットへ出品する →'],
  },
]

export default function Top() {
  const navigate = useNavigate()
  const { user } = useAuthState()
  const [demoWorks, setDemoWorks] = useState<WorkResponse[]>([])

  useEffect(() => {
    // デモ用に最新の作品を6件取得
    fetchWorks({ status: 'done', per_page: 6 })
      .then(res => setDemoWorks(res.items))
      .catch(err => console.error("デモ作品の取得に失敗しました", err))
  }, [])

  const handleAuthAction = async (path: string) => {
    if (user) {
      navigate(path)
      return
    }
    try {
      await signInWithPopup(auth, googleProvider)
      navigate(path)
    } catch (e) {
      console.error('ログインエラー:', e)
    }
  }

  return (
    <main>
      {/* ===== ヒーローセクション ===== */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景デコレーション */}
        <div style={{ position: 'absolute', top: '15%', right: '8%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255, 107, 157, 0.1)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '5%', width: 250, height: 250, borderRadius: '50%', background: 'rgba(78, 205, 196, 0.12)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '12%', width: 150, height: 150, borderRadius: '50%', background: 'rgba(155, 89, 182, 0.08)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        {/* フローティング絵文字 */}
        <div style={{ position: 'absolute', top: '18%', left: '7%', fontSize: '2rem', pointerEvents: 'none', animation: 'float 4s ease-in-out infinite', opacity: 0.7 }}>✨</div>
        <div style={{ position: 'absolute', top: '25%', right: '9%', fontSize: '2.5rem', pointerEvents: 'none', animation: 'float 3s ease-in-out infinite 0.5s', opacity: 0.65 }}>💫</div>
        <div style={{ position: 'absolute', bottom: '28%', right: '6%', fontSize: '2rem', pointerEvents: 'none', animation: 'float 5s ease-in-out infinite 1s', opacity: 0.6 }}>🌟</div>
        <div style={{ position: 'absolute', bottom: '32%', left: '9%', fontSize: '1.8rem', pointerEvents: 'none', animation: 'float 3.5s ease-in-out infinite 1.5s', opacity: 0.6 }}>🎀</div>

        {/* ロゴ */}
        <div style={{ marginBottom: 40 }} className="animate-fade-in">
          <img src={logo02Img} alt="うちの子製作所" style={{ height: 'clamp(80px, 15vw, 140px)', width: 'auto', filter: 'drop-shadow(0 10px 20px rgba(255, 107, 157, 0.25))' }} />
        </div>

        {/* バッジ */}
        <div
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 22px', background: 'white', border: '2px solid var(--color-pink-light)', borderRadius: 100, fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-pink)', marginBottom: 32, boxShadow: '0 4px 14px rgba(255, 107, 157, 0.15)' }}
          className="animate-fade-in"
        >
          ✨ 写真1枚から3Dフィギュアへ
        </div>

        {/* キャッチコピー */}
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.2, marginBottom: 24, fontFamily: 'var(--font-display)', color: 'var(--color-text)' }} className="animate-fade-in">
          <span className="gradient-text">うちの子</span>を、
          <br />
          自分の手で立体にする。🎉
        </h1>

        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--color-text-sub)', maxWidth: 540, marginBottom: 48, lineHeight: 1.85, fontWeight: 500 }} className="animate-fade-in">
          写真・イラスト1枚から3Dメッシュを生成。
          <br />
          STLデータで出力して、3Dプリンターで印刷できます！
        </p>

        {/* CTAボタン */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            id="cta-generate"
            onClick={() => handleAuthAction('/generate')}
            className="btn-primary"
            style={{ padding: '14px 32px', fontSize: '1.05rem', cursor: 'pointer' }}
          >
            {user ? <Sparkles size={18} /> : <LogIn size={18} />}
            {user ? '✨ いますぐつくる' : 'ログインしてつくる'}
            <ArrowRight size={18} />
          </button>
          <button
            id="cta-market"
            onClick={() => handleAuthAction('/market')}
            className="btn-outline"
            style={{ padding: '14px 32px', fontSize: '1.05rem', cursor: 'pointer' }}
          >
            {user ? <ShoppingBag size={18} /> : <LogIn size={18} />}
            {user ? '🛍️ マーケットを見る' : 'ログインしてみる'}
          </button>
        </div>

        {/* 未ログイン時のヒント */}
        {!user && (
          <p style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            🔒 Googleアカウントで無料ログイン — 30秒で完了！
          </p>
        )}
      </section>

      {/* ===== デモセクション（使い方3ステップ） ===== */}
      <section className="section" style={{ background: 'linear-gradient(135deg, #FFF9FB 0%, #F0EAFF 100%)' }}>
        <div className="page-container">
          <h2 className="section-title">使い方はたった3ステップ 🚀</h2>
          <p className="section-sub">アカウント登録してすぐに使えます。難しい操作は一切なし！</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {DEMO_STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.step} style={{ position: 'relative' }}>
                  {/* ステップ間の矢印 */}
                  {i < DEMO_STEPS.length - 1 && (
                    <div style={{ position: 'absolute', top: 60, right: -16, zIndex: 1, fontSize: '1.4rem', display: 'none' }}>→</div>
                  )}
                  <div
                    style={{
                      background: 'white',
                      border: `2px solid ${s.border}`,
                      borderRadius: 'var(--radius-xl)',
                      padding: '28px 24px',
                      boxShadow: 'var(--shadow-card)',
                      height: '100%',
                    }}
                  >
                    {/* ステップバッジ */}
                    <span style={{ display: 'inline-block', padding: '3px 12px', background: s.bg, color: s.color, border: `1.5px solid ${s.border}`, borderRadius: 100, fontSize: '0.72rem', fontWeight: 800, marginBottom: 16 }}>
                      {s.step}
                    </span>

                    {/* アイコン */}
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Icon size={26} color={s.color} />
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>{s.title}</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--color-text-sub)', lineHeight: 1.75, marginBottom: 20 }}>{s.description}</p>

                    {/* モックUI */}
                    <div style={{ background: '#F8F9FC', borderRadius: 10, padding: '14px 16px', border: '1px solid #EEF0F5' }}>
                      {s.mockLines.map((line, li) => (
                        <div
                          key={li}
                          style={{
                            fontSize: '0.8rem',
                            color: li === s.mockLines.length - 1 ? s.color : 'var(--color-text-sub)',
                            fontWeight: li === s.mockLines.length - 1 ? 700 : 400,
                            padding: '4px 0',
                            borderBottom: li < s.mockLines.length - 1 ? '1px solid #EEF0F5' : 'none',
                            fontFamily: 'monospace',
                          }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ログインCTA */}
          {!user && (
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <button
                onClick={() => handleAuthAction('/generate')}
                className="btn-primary"
                style={{ padding: '16px 40px', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                <LogIn size={20} />
                Googleで無料ログインして始める
                <ArrowRight size={18} />
              </button>
              <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>クレジットカード不要 · 30秒で完了</p>
            </div>
          )}
        </div>
      </section>

      {/* ===== デモマーケットセクション ===== */}
      {demoWorks.length > 0 && (
        <section className="section" style={{ background: '#FFFFFF' }}>
          <div className="page-container">
            <h2 className="section-title">みんなの作品を見てみよう！ 👀</h2>
            <p className="section-sub">マーケットにはたくさんの3Dモデルが並んでいます。</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginTop: 32 }}>
              {demoWorks.map(work => (
                <div key={work.id} onClick={() => handleAuthAction(`/works/${work.id}`)} style={{ cursor: 'pointer' }}>
                  {/* 未ログイン状態でも表示させるが、クリック時はログインを促す */}
                  <div style={{ pointerEvents: user ? 'auto' : 'none' }}>
                    <WorkCard work={work} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <button
                onClick={() => handleAuthAction('/market')}
                className="btn-outline"
                style={{ padding: '12px 28px', fontSize: '1rem', cursor: 'pointer', background: 'white' }}
              >
                🛍️ もっと見る
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== 課題提起セクション ===== */}
      <section className="section" style={{ background: 'linear-gradient(135deg, #FFF9FB 0%, #F9F5FF 100%)' }}>
        <div className="page-container">
          <h2 className="section-title">「欲しい」と「買える」の間にある壁 🧱</h2>
          <p className="section-sub">製造・流通・在庫の巨大なコストが、グッズの世界を遠ざけている</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {ISSUES.map(({ emoji, label, value }) => (
              <div
                key={label}
                style={{ background: 'white', border: '2px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '28px 20px', textAlign: 'center', boxShadow: 'var(--shadow-card)', transition: 'all 0.25s ease' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hover)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)' }}
              >
                <p style={{ fontSize: '2.2rem', marginBottom: 10 }}>{emoji}</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-pink)', marginBottom: 6, fontFamily: 'var(--font-base)' }}>{value}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)', fontWeight: 500 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3つのフロー紹介 ===== */}
      <section className="section">
        <div className="page-container">
          <h2 className="section-title">3つの使い方 🎯</h2>
          <p className="section-sub">あなたにぴったりの使い方を見つけてね！</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {FLOW_CARDS.map((card) => (
              <div
                key={card.tag}
                id={`flow-card-${card.tag}`}
                onClick={() => handleAuthAction(card.link)}
                style={{ cursor: 'pointer', textDecoration: 'none' }}
              >
                <div
                  style={{ background: 'white', border: '2px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '32px 28px', height: '100%', transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: 'var(--shadow-card)', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px) scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hover)'; (e.currentTarget as HTMLElement).style.borderColor = card.tagBorder }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}
                >
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: card.tagBg, opacity: 0.6, pointerEvents: 'none' }} />
                  <div style={{ fontSize: '3rem', marginBottom: 16, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>{card.emoji}</div>
                  <span style={{ display: 'inline-block', padding: '3px 12px', background: card.tagBg, color: card.tagColor, border: `1.5px solid ${card.tagBorder}`, borderRadius: 100, fontSize: '0.72rem', fontWeight: 800, marginBottom: 12 }}>
                    {card.tag}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 10, color: 'var(--color-text)', fontFamily: 'var(--font-base)' }}>{card.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-sub)', lineHeight: 1.75 }}>{card.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 20, color: card.tagColor, fontSize: '0.88rem', fontWeight: 700 }}>
                    {user ? '試してみる！' : 'ログインして試す！'} <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== フッター ===== */}
      <footer style={{ padding: '40px 24px', borderTop: '2px solid var(--color-border)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
          <img src={logo03Img} alt="うちの子製作所" style={{ height: 64, width: 'auto' }} />
        </div>
        <p>Hack-1 グランプリ 2026</p>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </main>
  )
}
