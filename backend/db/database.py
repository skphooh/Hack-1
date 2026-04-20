"""
データベース接続設定（Neon / PostgreSQL + asyncpg）
"""
import os

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# DATABASE_URL は Railway の環境変数から取得
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # SQLログ出力（デバッグ時はTrueに）
    pool_pre_ping=True,  # 接続切れを自動検出
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """全モデルの基底クラス"""
    pass


async def get_db():
    """FastAPI の依存注入用セッションゲネレーター"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
