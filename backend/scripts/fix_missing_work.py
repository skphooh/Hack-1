import asyncio
import os
import sys
from pathlib import Path
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# --- 1. 基本設定 ---
BASE_DIR = Path(__file__).parent
sys.path.append(str(BASE_DIR))
from db.models import Work

# 本番DB接続先 (RenderのPostgreSQL)
DATABASE_URL = "postgresql+asyncpg://user:password@host/dbname"
engine = create_async_engine(DATABASE_URL, echo=False)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)

async def rescue_works():
    async with SessionFactory() as session:
        # ステータスが 'processing' のままの作品をすべて取得
        result = await session.execute(
            select(Work).where(Work.status == "processing")
        )
        processing_works = result.scalars().all()
        
        if not processing_works:
            print("🔍 現在 'processing' 状態の作品はありません。")
            return

        print(f"📋 救済対象の作品が {len(processing_works)} 件見つかりました。")
        
        for work in processing_works:
            print(f"🛠️ 更新中: {work.title} (ID: {work.id})")
            
            # ステータスを 'done' に変更
            work.status = "done"
            
            # もし glb_url が空の場合は、ログにあったIDを元に推測して入れることも可能ですが、
            # 基本的には status を 'done' にするだけでマーケットに表示されます。
            # 例: work.glb_url = "https://storage.googleapis.com/utinoko-7e0ab.firebasestorage.app/models/..."

        await session.commit()
        print("🎉 すべての対象作品をマーケットに公開しました！")

if __name__ == "__main__":
    asyncio.run(rescue_works())