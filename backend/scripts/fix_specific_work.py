import asyncio
import os
import sys
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# --- 設定 ---
BASE_DIR = Path(__file__).parent
sys.path.append(str(BASE_DIR))
from db.models import Work

# RenderのDB接続情報
DATABASE_URL = "postgresql+asyncpg://user:password@host/dbname"
engine = create_async_engine(DATABASE_URL, echo=False)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)

# 【重要】ここにFirebaseでコピーしたURLを貼り付けてください
FIX_GLB_URL = "https://firebasestorage.googleapis.com/v0/b/utinoko-7e0ab.firebasestorage.app/o/models%2F96944a53-ea9b-4fa4-9590-54944940e85b%2Ftripo_pbr_model_1221e990-e744-4a32-9256-4f88e9fdf275.glb?alt=media&token=05a70010-44e6-4c63-b6b5-368084cfcd90"
# 作品のタイトル（またはID）
TARGET_TITLE = "ハルちゃん" 

async def fix_work():
    async with SessionFactory() as session:
        # タイトルで検索（IDがわかるなら .where(Work.id == "ID") でもOK）
        result = await session.execute(select(Work).where(Work.title == TARGET_TITLE))
        work = result.scalar_one_or_none()
        
        if not work:
            print(f"❌ 作品「{TARGET_TITLE}」が見つかりませんでした。")
            return

        print(f"🛠️ 更新中: {work.title} (ID: {work.id})")
        
        # GLBのURLをセットし、ステータスを完了にする
        work.glb_url = FIX_GLB_URL
        work.status = "done"
        
        await session.commit()
        print(f"🎉 紐付けが完了しました！マーケットを確認してください。")

if __name__ == "__main__":
    asyncio.run(fix_work())