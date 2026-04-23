# うちの子製作所 (Uchi-no-ko Factory)

> **好きなものを、手のひらに。**

<p align="center">
  <img src="./logo02.png" alt="うちの子製作所" width="480" />
</p>

<p align="center">
  <a href="https://utinoko.skphooh.com">🌐 Live Demo</a> ·
  <a href="#-セットアップ">🛠 Setup</a> ·
  <a href="#-システム構成">🏗 Architecture</a>
</p>

写真やイラスト **1枚** から AI が高品質な 3D モデルを生成し、3D プリンターで印刷可能な STL データを即座に出力する「最短のクリエイティブ・パイプライン」です。

---

## 🌟 プロジェクト概要

「うちの子製作所」は、**3D モデリングの知識ゼロでも、画像 1 枚から物理的なモノを作れる** 体験を提供します。

既存の 3D 生成 AI をコアエンジンに採用し、3D プリントに必要な「厚み付け」「メッシュ補完」「ファイル変換」を自動化することで、誰でも簡単に「思い出の具現化」ができるプラットフォームを目指しています。

### 解決する課題：流通の壁をゼロに

| 課題 | 解決 |
|------|------|
| マイナーキャラのグッズが存在しない | 画像さえあれば誰でも立体化できる |
| 送料・納期・在庫コストの壁 | データ配信なので送料ゼロ・即時 |
| 公式グッズの転売・品切れ | 公式が 3D データを直接ファンへ販売できる |
| 同人・個人創作のグッズ化が困難 | 個人作家が自分のキャラを STL で販売できる |

---

## ✨ 主な機能

| 機能 | 説明 |
|------|------|
| 📸 **AI 3D Generation** | Tripo3D API で画像→GLB を非同期生成。`standard` / `high`（PBR テクスチャ）品質を選択可 |
| 🔄 **Turnaround Generation** | GPT-4o + DALL-E 3 で「見えない裏面」を補完した 4 面ターンアラウンドシートを生成し、マルチビュー 3D 化の精度を向上 |
| 🎨 **3D Viewer** | React Three Fiber / Three.js によるブラウザ内インタラクティブビューア |
| 🛠️ **Print-Ready Export** | trimesh + manifold3d で GLB → STL 自動変換・メッシュ修復・ストラップ穴・台座追加 |
| 🛒 **Marketplace** | 生成作品の公開・共有・売買ができるコミュニティ機能 |

---

## 🛠️ 技術スタック

### Frontend（Vercel）

| カテゴリ | 技術 |
|----------|------|
| Framework | React 18 + Vite (TypeScript) |
| 3D Rendering | React Three Fiber / Three.js |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Auth | Firebase Authentication (クライアント SDK) |

### Backend（Render）

| カテゴリ | 技術 |
|----------|------|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy (async) + asyncpg |
| Database | PostgreSQL (Render managed) |
| Storage | Firebase Storage |
| Auth | Firebase Admin SDK (JWT 検証) |
| AI — 3D 生成 | Tripo3D API |
| AI — ターンアラウンド | OpenAI GPT-4o / DALL-E 3 |
| Mesh 処理 | trimesh + manifold3d |

---

## 🏗️ システム構成

```mermaid
flowchart TB
    User(["👤 ユーザー"])

    subgraph Vercel["☁️ Vercel — Frontend"]
        direction TB
        FE["React + Vite\n(TypeScript)"]
        Viewer["Three.js 3D Viewer"]
        FE --> Viewer
    end

    subgraph FirebaseServices["🔥 Firebase"]
        FA["Firebase Auth\n(Google / Email)"]
        FS["Firebase Storage\n(GLB / STL / 画像)"]
    end

    subgraph Render["🖥️ Render — Backend (FastAPI)"]
        direction TB
        API["API Gateway\n+ JWT 検証"]

        subgraph Routers["Routers"]
            R1["/api/generate\n画像→3D生成開始"]
            R2["/api/task/:id\nジョブ状態ポーリング"]
            R3["/api/generate/turnaround\nターンアラウンド生成"]
            R4["/api/convert\nGLB→STL 変換"]
            R5["/api/postprocess\n穴あけ・台座追加"]
            R6["/api/works\nCRUD"]
            R7["/api/depth\n深度推定"]
        end

        API --> Routers

        subgraph Services["Services"]
            S1["tripo3d.py\n3D生成"]
            S2["turnaround.py\nターンアラウンド"]
            S3["mesh.py\nメッシュ変換・修復"]
            S4["storage.py\nFirebase Storage 操作"]
            S5["auth.py\nFirebase JWT 検証"]
        end

        Routers --> Services
    end

    subgraph DB["🗄️ PostgreSQL (Render)"]
        T1["users"]
        T2["works\n(task_id, status, urls)"]
    end

    subgraph ExternalAI["🤖 外部 AI API"]
        AI1["Tripo3D API\n画像→GLB"]
        AI2["OpenAI\nGPT-4o / DALL-E 3"]
    end

    %% ユーザーフロー
    User -->|"① 画像アップロード"| FE
    User -->|"② ログイン"| FA
    FA -->|"ID Token"| FE
    FE -->|"③ API Request\n(Bearer Token)"| API

    %% バックエンド内部フロー
    S1 -->|"生成リクエスト"| AI1
    AI1 -->|"GLB URL"| S1
    S2 -->|"画像補完リクエスト"| AI2
    AI2 -->|"ターンアラウンド画像"| S2
    S3 -->|"メッシュ処理"| S1
    Services --> S4
    S4 -->|"ファイル保存"| FS
    Services --> DB

    %% フロントエンドへの返却
    FS -->|"④ 署名付き URL"| FE
    Viewer -->|"GLB / STL 表示"| User
```

### データフロー詳細（3D 生成）

```
① 画像アップロード
   ブラウザ → POST /api/generate (multipart)
   
② ジョブ開始
   Backend → Tripo3D API (非同期タスク発行)
   PostgreSQL: work.status = "processing"

③ ポーリング
   Frontend → GET /api/task/{task_id} (3秒間隔)
   Backend → Tripo3D API でステータス確認

④ 完成時
   Backend: GLB を Firebase Storage に保存
   trimesh で STL に変換 → Firebase Storage に保存
   PostgreSQL: work.status = "completed", URLs を更新

⑤ 表示
   Frontend: 署名付き URL で Three.js Viewer に読み込み
   ダウンロードボタンで STL / GLB を取得
```

---

## 📋 セットアップ

### 前提条件

- Node.js 20+
- Python 3.12+
- Firebase プロジェクト（Auth + Storage 有効化）
- Tripo3D API キー
- OpenAI API キー

### Frontend

```bash
cd frontend
cp ../.env.example .env      # VITE_ 変数を設定
npm install
npm run dev                  # http://localhost:5173
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate     # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env      # バックエンド変数を設定
uvicorn main:app --reload    # http://localhost:8000
```

---

## 🔐 環境変数

`.env.example` を各ディレクトリの `.env` にコピーして設定してください。

| 変数 | 対象 | 説明 |
|------|------|------|
| `VITE_FIREBASE_*` | Frontend | Firebase クライアント設定 |
| `VITE_API_BASE_URL` | Frontend | FastAPI サーバー URL |
| `DATABASE_URL` | Backend | PostgreSQL 接続文字列 (`postgresql+asyncpg://...`) |
| `TRIPO3D_API_KEY` | Backend | Tripo3D API キー |
| `OPENAI_API_KEY` | Backend | OpenAI API キー |
| `FIREBASE_SERVICE_ACCOUNT` | Backend | Firebase Admin SDK 用 JSON (1行) |

---

## 📡 主要 API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| `POST` | `/api/generate` | 画像→3D 生成ジョブ開始 |
| `GET` | `/api/task/{task_id}` | 生成ジョブ状態ポーリング |
| `POST` | `/api/generate/turnaround` | ターンアラウンドシート生成 |
| `POST` | `/api/convert` | GLB → STL 変換 |
| `POST` | `/api/postprocess` | メッシュ後処理（穴あけ・台座） |
| `GET` | `/api/works` | 作品一覧取得 |
| `GET` | `/health` | ヘルスチェック |

---

## 🗺️ ロードマップ

- [x] 1枚の画像からの 3D 生成（Tripo3D）
- [x] GPT-4o によるターンアラウンド生成とマルチビュー 3D 化
- [x] ブラウザ上での 3D プレビュー
- [x] STL 形式への書き出し・ストラップ穴・台座追加
- [ ] Wonder3D / 高品質モデルへの切り替え
- [ ] マーケットプレイス（検索・タグ・購入フロー）
- [ ] 企業向けグッズコンペ機能
- [ ] 公式ライセンス管理（DRM）
- [ ] クリエイター実績・ポートフォリオ機能

---

*うちの子製作所 — Hack-1 グランプリ 2026 出展作品*
