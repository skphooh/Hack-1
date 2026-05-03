"""
うちの子製作所 - FastAPI メインエントリポイント
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from db.database import engine, Base
from routers import depth, generate, convert, works, postprocess, purchases, competitions, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリ起動時にDBテーブルを自動作成・マイグレーション"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # purchases テーブルに後から追加したカラムをマイグレーション
            # IF NOT EXISTS で冪等（何度実行しても安全）
            await conn.execute(text(
                "ALTER TABLE purchases ADD COLUMN IF NOT EXISTS "
                "stripe_session_id TEXT"
            ))
            await conn.execute(text(
                "ALTER TABLE purchases ADD COLUMN IF NOT EXISTS "
                "status VARCHAR(20) DEFAULT 'completed'"
            ))
            await conn.execute(text(
                "ALTER TABLE works ADD COLUMN IF NOT EXISTS "
                "is_public BOOLEAN DEFAULT TRUE"
            ))
        print("✅ DB テーブルの初期化・マイグレーションが完了しました", flush=True)
    except Exception as e:
        print(f"⚠️ DB 初期化エラー（DATABASE_URL を確認してください）: {e}", flush=True)
    yield


app = FastAPI(
    title="うちの子製作所 API",
    description="写真・イラスト1枚から3Dメッシュを生成するWebサービスのバックエンドAPI",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS設定
# フロントエンドは Firebase Auth の Bearer トークン（Authorization ヘッダー）で認証するため
# Cookie ベースの credentials は不要。allow_origins=["*"] で全オリジンを許可する。
# ※ allow_credentials=True + allow_origin_regex の組み合わせは一部環境でバグがあるため廃止。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(depth.router, prefix="/api", tags=["depth"])
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(convert.router, prefix="/api", tags=["convert"])
app.include_router(works.router, prefix="/api", tags=["works"])
app.include_router(postprocess.router, prefix="/api", tags=["postprocess"])
app.include_router(purchases.router, prefix="/api", tags=["purchases"])
app.include_router(competitions.router, prefix="/api", tags=["competitions"])
app.include_router(admin.router, prefix="/api", tags=["admin"])


@app.get("/health", tags=["health"])
async def health_check():
    """Render のヘルスチェック用エンドポイント"""
    return {"status": "ok"}
