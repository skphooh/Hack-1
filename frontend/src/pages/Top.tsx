// トップページ（ランディングページ）
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, ShoppingBag, Building2 } from 'lucide-react'

/** サービスの3つのフローを紹介するカード */
const FLOW_CARDS = [
  {
    icon: <Sparkles size={28} color="var(--color-accent-primary)" />,
    title: '写真→3Dデータ生成',
    description: '推しキャラや子どもの絵を1枚アップするだけ。AIが3Dメッシュを自動生成し、STLデータでダウンロードできます。',
    tag: 'フロー①',
    tagColor: 'var(--color-accent-primary)',
    link: '/generate',
  },
  {
    icon: <ShoppingBag size={28} color="var(--color-accent-secondary)" />,
    title: 'マーケットで探す',
    description: 'コミュニティが作った3Dデータを検索・閲覧。自分のプリンターで印刷して手元に届けよう。',
    tag: 'フロー②',
    tagColor: 'var(--color-accent-secondary)',
    link: '/market',
  },
  {
    icon: <Building2 size={28} color="var(--color-accent-blue)" />,
    title: '公式データを出品',
    description: 'メーカー・作家・サークルが3Dデータをアップして販売。送料ゼロ、在庫ゼロの新しい商品流通。',
    tag: 'フロー③',
    tagColor: 'var(--color-accent-blue)',
    link: '/market',
  },
]

/** ユーザーの課題（イシュー）を示す統計数値 */
const STATS = [
  { label: 'マイナーキャラのグッズ', value: '存在しない' },
  { label: '人気すぎて買えない', value: '転売問題' },
  { label: '廃盤・絶版グッズ', value: '入手不可' },
  { label: '送料・納期の壁', value: '解決する' },
]

export default function Top() {
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
        {/* 背景グロー */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* バッジ */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            background: 'rgba(167, 139, 250, 0.12)',
            border: '1px solid var(--color-border)',
            borderRadius: 100,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-accent-primary)',
            marginBottom: 32,
          }}
          className="animate-fade-in"
        >
          <Sparkles size={14} />
          写真1枚から3Dフィギュアへ
        </div>

        {/* メインキャッチコピー */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 24,
            fontFamily: 'var(--font-display)',
          }}
          className="animate-fade-in"
        >
          <span className="gradient-text">うちの子</span>を、
          <br />
          自分の手で立体にする。
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: 'var(--color-text-secondary)',
            maxWidth: 560,
            marginBottom: 48,
            lineHeight: 1.8,
          }}
          className="animate-fade-in"
        >
          写真・イラスト1枚から3Dメッシュを生成。
          <br />
          STLデータで出力して、3Dプリンターで印刷できます。
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/generate" id="cta-generate" className="btn-primary">
            <Sparkles size={18} />
            いますぐつくる
            <ArrowRight size={16} />
          </Link>
          <Link to="/market" id="cta-market" className="btn-outline">
            <ShoppingBag size={18} />
            マーケットを見る
          </Link>
        </div>
      </section>

      {/* ===== 課題提起セクション ===== */}
      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="page-container">
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            「欲しい」と「買える」の間にある壁
          </h2>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              marginBottom: 48,
            }}
          >
            製造・流通・在庫の巨大なコストが、グッズの世界を遠ざけている
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
            }}
          >
            {STATS.map(({ label, value }) => (
              <div
                key={label}
                className="glass-card"
                style={{ padding: '24px', textAlign: 'center' }}
              >
                <p
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: 'var(--color-accent-secondary)',
                    marginBottom: 8,
                  }}
                >
                  {value}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3つのフロー紹介 ===== */}
      <section className="section">
        <div className="page-container">
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
              fontWeight: 700,
              marginBottom: 48,
            }}
          >
            3つの使い方
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {FLOW_CARDS.map((card) => (
              <Link
                key={card.tag}
                to={card.link}
                id={`flow-card-${card.tag}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="glass-card"
                  style={{
                    padding: '32px 28px',
                    height: '100%',
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-glow)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(167, 139, 250, 0.1)',
                      marginBottom: 16,
                    }}
                  >
                    {card.icon}
                  </div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: card.tagColor,
                      marginBottom: 8,
                    }}
                  >
                    {card.tag}
                  </span>
                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      marginBottom: 12,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {card.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                    {card.description}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 20,
                      color: card.tagColor,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    試してみる <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== フッター ===== */}
      <footer
        style={{
          padding: '40px 24px',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.875rem',
        }}
      >
        <p className="gradient-text" style={{ fontWeight: 700, marginBottom: 8 }}>
          うちの子ファクトリー
        </p>
        <p>Hack-1 グランプリ 2026「小さくなる日本」</p>
      </footer>
    </main>
  )
}
