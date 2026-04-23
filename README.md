# うちの子製作所 (Uchi-no-ko Factory)

> **好きなものを、手のひらに。**

![Uchi-no-ko Factory Logo](./logo02.png)

1枚の写真やイラストからAIで高品質な3Dモデルを生成し、3Dプリンターで印刷可能なデータとして即座に書き出す「最短のクリエイティブ・パイプライン」です。

---

## 🌟 プロジェクトの概要

「うちの子製作所」は、**3Dモデリングの知識がなくても、画像1枚から物理的なモノを作れる**体験を提供します。

既存の3D生成AIをコアエンジンに採用し、3Dプリントに必要な「厚み付け」「メッシュ補完」「ファイル変換」を自動化することで、誰でも簡単に「思い出の具現化」ができるプラットフォームを目指しています。

### 🚀 解決する課題：流通の壁をゼロに
- **物流コストの解消**: データを送るだけなので送料・納期がゼロ。
- **ニッチ需要への対応**: 公式グッズがないマイナーキャラや個人の創作物も立体化可能。
- **クリエイター支援**: 公式や個人作家が3Dデータを直接ファンに販売できる新しい流通形態。

## ✨ 主な機能

- 📸 **AI 3D Generation**: 画像に最適化されたAIエンジンで3D化。
- ⚡ **Instant Preview**: アップロード直後に Depth Anything V2 による深度推定で立体感を即座に確認。
- 🎨 **3D Viewer**: Browser上で生成されたモデルを全方位から確認できる高精細ビューア。
- 🛠️ **Print-Ready Export**: 3Dプリンタでそのまま扱える `.stl` / `.obj` 形式への自動変換とメッシュ修復。
- 🛒 **Marketplace**: 生成した作品の公開・共有、および3Dデータの売買が可能なコミュニティ機能。

## 🛠️ 技術スタック

### Frontend
- **Framework**: React + Vite
- **3D Rendering**: React Three Fiber / Three.js
- **Styling**: Vanilla CSS / Tailwind CSS
- **State Management**: Zustand
- **Backend Integration**: Firebase SDK / Axios

### Backend
- **Framework**: FastAPI (Python)
- **Database**: Neon (PostgreSQL) / SQLAlchemy (Async)
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication
- **AI Engines**: 
  - Tripo3D API (Real-life images)
  - Wonder3D / HuggingFace (Illustrations)
  - Depth Anything V2 (Instant Preview)
- **Mesh Processing**: trimesh (GLB to STL conversion)

### Infrastructure
- **Hosting**: Firebase Hosting
- **Server**: Railway (FastAPI Container)
- **CI/CD**: GitHub Actions / Railway Deploy

## 🏗️ システム構成図

```mermaid
graph TD
    User([ユーザー]) -->|画像アップロード| FE[React Frontend]
    FE -->|API Request| BE[FastAPI Backend]
    BE -->|生成リクエスト| AI1[Tripo3D API]
    BE -->|生成リクエスト| AI2[Wonder3D / HF]
    BE -->|メタデータ保存| DB[(Neon PostgreSQL)]
    BE -->|ファイル保存| ST[Firebase Storage]
    FE -->|Auth| FA[Firebase Auth]
    AI1 -->|GLB取得| BE
    AI2 -->|OBJ取得| BE
    BE -->|STL変換| TR[trimesh]
    TR -->|保存| ST
    FE -->|表示| Viewer[Three.js Viewer]
```

## 📋 セットアップ

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## 🗺️ ロードマップ
- [x] 写真・イラストからの3D生成
- [x] ブラウザ上での3Dプレビュー
- [x] STL形式への書き出し
- [ ] 近くの3Dプリンター保有者とのマッチング機能
- [ ] 公式ライセンス管理機能（DRM）
- [ ] ARによる現実世界でのサイズ感シミュレーション

---

*うちの子製作所 — Hack-1グランプリ 2026出展作品*
