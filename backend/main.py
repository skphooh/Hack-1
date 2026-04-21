"""
うちの子ファクトリー - FastAPI メインエントリポイント
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import engine, Base
from routers import depth, generate, convert, works


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリ起動時にDBテーブルを自動作成（開発用）"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="うちの子ファクトリー API",
    description="写真・イラスト1枚から3Dメッシュを生成するWebサービスのバックエンドAPI",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS設定（フロントエンドのドメインを許可）
_allowed_origins = [
    "http://localhost:5173",
    "https://utinoko.skphooh.com",
]
if os.getenv("FRONTEND_URL"):
    _allowed_origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(depth.router, prefix="/api", tags=["depth"])
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(convert.router, prefix="/api", tags=["convert"])
app.include_router(works.router, prefix="/api", tags=["works"])


@app.get("/health", tags=["health"])
async def health_check():
    """Railway のヘルスチェック用エンドポイント"""
    return {"status": "ok"}
