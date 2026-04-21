
import asyncio
import os
import sys

# プロジェクトルートをパスに追加（backendディレクトリで実行されることを想定）
sys.path.append(os.getcwd())

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from db.models import Work, User
from db.database import engine, AsyncSessionLocal
from services.storage import upload_url_to_storage

async def fix_claude(glb_url: str):
    """
    「くろーど」というタイトルの作品を探し、提供された GLB URL で更新しつつ、
    Firebase Storage に永続化します。
    """
    async with AsyncSessionLocal() as session:
        # 作品を検索
        result = await session.execute(select(Work).where(Work.title == "くろーど"))
        work = result.scalar_one_or_none()
        
        if not work:
            print("❌ 作品「くろーど」が見つかりませんでした。")
            return

        print(f"🔍 作品発見: ID={work.id}, 現ステータス={work.status}")
        
        # Firebase に永続化
        print(f"🔄 GLBをFirebaseに永続化中... {glb_url[:50]}...")
        try:
            firebase_url = await upload_url_to_storage(
                glb_url, f"models/{work.user_id}/{work.id}.glb"
            )
            print(f"✅ Firebase永続化完了: {firebase_url}")
            
            # DB更新
            work.glb_url = firebase_url
            work.status = "done"  # 表示エラー解消のため done に設定
            
            await session.commit()
            print("🎉 データベースの更新が完了しました！マーケットを確認してください。")
            
        except Exception as e:
            print(f"🔥 エラーが発生しました: {e}")
            await session.rollback()

if __name__ == "__main__":
    # ユーザーから提供されたURL
    TARGET_URL = "https://tripo-data.rg1.data.tripo3d.com/tcli_00909302733e432bbacd791e8b26e31a/20260421/a0033cd1-4d8a-4c29-a7a9-6460034790a6/tripo_pbr_model_a0033cd1-4d8a-4c29-a7a9-6460034790a6.glb?Key-Pair-Id=K1676C64NMVM2J&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly90cmlwby1kYXRhLnJnMS5kYXRhLnRyaXBvM2QuY29tL3RjbGlfMDA5MDkzMDI3MzNlNDMyYmJhY2Q3OTFlOGIyNmUzMWEvMjAyNjA0MjEvYTAwMzNjZDEtNGQ4YS00YzI5LWE3YTktNjQ2MDAzNDc5MGE2L3RyaXBvX3Bicl9tb2RlbF9hMDAzM2NkMS00ZDhhLTRjMjktYTdhOS02NDYwMDM0NzkwYTYuZ2xiIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzc2ODE2MDAwfX19XX0_&Signature=V9quYXIaJSW7-Z0XfU6DtjE1lytWa7T5cOXxllwb7R6mwvTEjf1qkQjG9YWJy8EZ2zC42KSZ1KeACTGSuBrmD6TX3EPDn8EyohOiz-u0hlH9zMluvNbk0w2Jl4-9CXRyl1kdymdDA40URfQOn8OsBYzq-SuPOcrLmSZ-JqzjigpkJimnhI~7s6S9TFSbgCC9JYh9eoXtr73IXIYdNoVDEWncuU--jOJpLYoLiUIZAXJ5V7EP8gaPQshWiEy89DZWvX9VdPEtBAIL5T9ApTggtycsDA644JaPDSPjJQ~ilAOMomsHx~KBxqqBfLnMvmwBtPex6eMD~1IY6CFZ52tLEg__"
    
    asyncio.run(fix_claude(TARGET_URL))
