"""
データベース接続設定（PostgreSQL + asyncpg / ローカル開発は SQLite）
"""
import os

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# DATABASE_URL 環境変数から取得（Render は postgresql:// 形式で提供されるため asyncpg 用に変換）
_raw_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")
if _raw_url.startswith("postgresql://"):
    # Render の PostgreSQL URL を asyncpg ドライバ用に変換
    DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("postgres://"):
    # 古い形式にも対応
    DATABASE_URL = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
else:
    DATABASE_URL = _raw_url

# PostgreSQL の場合はコネクションプール設定を追加、SQLite の場合はシンプルに
_engine_kwargs: dict = {"echo": False, "pool_pre_ping": True}
if not DATABASE_URL.startswith("sqlite"):
    _engine_kwargs.update({"pool_size": 5, "max_overflow": 10})

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)

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
