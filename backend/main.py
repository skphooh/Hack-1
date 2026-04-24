"""
うちの子製作所 - FastAPI メインエントリポイント
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import engine, Base
from routers import depth, generate, convert, works, postprocess


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリ起動時にDBテーブルを自動作成"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ DB テーブルの初期化が完了しました", flush=True)
    except Exception as e:
        # DB接続失敗でもサーバーは起動させる（CORS ミドルウェアを有効にするため）
        print(f"⚠️ DB 初期化エラー（DATABASE_URL を確認してください）: {e}", flush=True)
    yield


app = FastAPI(
    title="うちの子製作所 API",
    description="写真・イラスト1枚から3Dメッシュを生成するWebサービスのバックエンドAPI",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS設定（フロントエンドのドメインを許可）
# Vercel のプレビューデプロイは毎回URLが変わるため allow_origin_regex で一括許可する
_allowed_origins = [
    "http://localhost:5173",
    "https://utinoko.skphooh.com",
]
if os.getenv("FRONTEND_URL"):
    _allowed_origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    # Vercel プレビューURL (https://hack-1-*-skphoohs-projects.vercel.app) を許可
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(depth.router, prefix="/api", tags=["depth"])
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(convert.router, prefix="/api", tags=["convert"])
app.include_router(works.router, prefix="/api", tags=["works"])
app.include_router(postprocess.router, prefix="/api", tags=["postprocess"])


@app.get("/health", tags=["health"])
async def health_check():
    """Render のヘルスチェック用エンドポイント"""
    return {"status": "ok"}
