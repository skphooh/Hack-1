
import asyncio
import os
import sys
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# .env ファイルを手動で読み込む（dotenv 不要）
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())
    print("✅ .env 読み込み完了")

# Firebase 設定を確認
firebase_bucket = os.getenv("FIREBASE_STORAGE_BUCKET") or os.getenv("VITE_FIREBASE_STORAGE_BUCKET")
print(f"📦 Firebase Storage Bucket: {firebase_bucket or '未設定（mock になります）'}")

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from db.models import Work

# 本番の PostgreSQL に接続（asyncpg 用に変換）
DATABASE_URL = "postgresql+asyncpg://utinoko_db_user:REDACTED@dpg-d7jih57avr4c73cb88tg-a.singapore-postgres.render.com/utinoko_db"

engine = create_async_engine(DATABASE_URL, echo=False)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)

async def fix_claude(glb_url: str):
    """
    「くろーど」というタイトルの作品を探し、提供された GLB URL で更新しつつ、
    Firebase Storage に永続化します。
    """
    async with SessionFactory() as session:
        # 全作品一覧を表示して確認
        result = await session.execute(select(Work))
        all_works = result.scalars().all()
        print(f"📋 全作品数: {len(all_works)}")
        for w in all_works:
            print(f"  - '{w.title}' (ID={w.id}, status={w.status}, glb_url={w.glb_url[:40] if w.glb_url else 'None'}...)")
        
        # 「くろーど」を検索
        work = next((w for w in all_works if w.title == "くろーど"), None)
        
        if not work:
            print("\n❌ 作品「くろーど」が見つかりませんでした。上記のタイトル一覧を確認してください。")
            return

        print(f"\n🔍 作品発見: ID={work.id}, 現ステータス={work.status}")
        
        # Firebase に永続化
        from services.storage import upload_url_to_storage
        print(f"🔄 GLBをFirebaseに永続化中...")
        try:
            firebase_url = await upload_url_to_storage(
                glb_url, f"models/{work.user_id}/{work.id}.glb"
            )
            print(f"✅ Firebase永続化完了: {firebase_url}")
            
            work.glb_url = firebase_url
            work.status = "done"
            
            await session.commit()
            print("🎉 データベースの更新が完了しました！マーケットを確認してください。")
            
        except Exception as e:
            print(f"🔥 エラーが発生しました: {e}")
            await session.rollback()

if __name__ == "__main__":
    TARGET_URL = "https://tripo-data.rg1.data.tripo3d.com/tcli_00909302733e432bbacd791e8b26e31a/20260421/a0033cd1-4d8a-4c29-a7a9-6460034790a6/tripo_pbr_model_a0033cd1-4d8a-4c29-a7a9-6460034790a6.glb?Key-Pair-Id=K1676C64NMVM2J&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly90cmlwby1kYXRhLnJnMS5kYXRhLnRyaXBvM2QuY29tL3RjbGlfMDA5MDkzMDI3MzNlNDMyYmJhY2Q3OTFlOGIyNmUzMWEvMjAyNjA0MjEvYTAwMzNjZDEtNGQ4YS00YzI5LWE3YTktNjQ2MDAzNDc5MGE2L3RyaXBvX3Bicl9tb2RlbF9hMDAzM2NkMS00ZDhhLTRjMjktYTdhOS02NDYwMDM0NzkwYTYuZ2xiIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzc2ODE2MDAwfX19XX0_&Signature=V9quYXIaJSW7-Z0XfU6DtjE1lytWa7T5cOXxllwb7R6mwvTEjf1qkQjG9YWJy8EZ2zC42KSZ1KeACTGSuBrmD6TX3EPDn8EyohOiz-u0hlH9zMluvNbk0w2Jl4-9CXRyl1kdymdDA40URfQOn8OsBYzq-SuPOcrLmSZ-JqzjigpkJimnhI~7s6S9TFSbgCC9JYh9eoXtr73IXIYdNoVDEWncuU--jOJpLYoLiUIZAXJ5V7EP8gaPQshWiEy89DZWvX9VdPEtBAIL5T9ApTggtycsDA644JaPDSPjJQ~ilAOMomsHx~KBxqqBfLnMvmwBtPex6eMD~1IY6CFZ52tLEg__"
    
    asyncio.run(fix_claude(TARGET_URL))
