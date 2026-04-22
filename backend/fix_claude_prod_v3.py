import asyncio
import os
import json
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from pathlib import Path

# .env を安全に読み込む
def load_env_safe():
    env_vars = {}
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        content = env_file.read_bytes().decode("utf-8", errors="replace")
        for line in content.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars

async def fix_data():
    env = load_env_safe()
    DATABASE_URL = "postgresql+asyncpg://utinoko_db_user:qsCxKGFtFBba16KcYOoeMSYeVXevDb7k@dpg-d7jih57avr4c73cb88tg-a.singapore-postgres.render.com/utinoko_db"
    
    # Firebase 初期化
    sa_json = env.get("FIREBASE_SERVICE_ACCOUNT")
    bucket_name = env.get("FIREBASE_STORAGE_BUCKET") or "utinoko-7e0ab.firebasestorage.app"
    bucket_name = bucket_name.replace("gs://", "").rstrip("/")
    
    import firebase_admin
    from firebase_admin import credentials, storage
    try:
        cred = credentials.Certificate(json.loads(sa_json))
        firebase_admin.initialize_app(cred, {'storageBucket': bucket_name})
    except Exception as e:
        print(f"Firebase Init Error: {e}")

    engine = create_async_engine(DATABASE_URL)
    SessionFactory = async_sessionmaker(engine)
    
    from db.models import Work
    
    # ターゲットの URL (Tripo3D)
    GLB_SOURCE_URL = "https://tripo-data.rg1.data.tripo3d.com/tcli_00909302733e432bbacd791e8b26e31a/20260421/a0033cd1-4d8a-4c29-a7a9-6460034790a6/tripo_pbr_model_a0033cd1-4d8a-4c29-a7a9-6460034790a6.glb?Key-Pair-Id=K1676C64NMVM2J&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly90cmlwby1kYXRhLnJnMS5kYXRhLnRyaXBvM2QuY29tL3RjbGlfMDA5MDkzMDI3MzNlNDMyYmJhY2Q3OTFlOGIyNmUzMWEvMjAyNjA0MjEvYTAwMzNjZDEtNGQ4YS00YzI5LWE3YTktNjQ2MDAzNDc5MGE2LmdsYmkiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkRhdGVMZXNzVGhhbiI6MTc3NjgxNjAwMH19fV19&Signature=V9quYXIaJSW7-Z0XfU6DtjE1lytWa7T5cOXxllwb7R6mwvTEjf1qkQjG9YWJy8EZ2zC42KSZ1KeACTGSuBrmD6TX3EPDn8EyohOiz-u0hlH9zMluvNbk0w2Jl4-9CXRyl1kdymdDA40URfQOn8OsBYzq-SuPOcrLmSZ-JqzjigpkJimnhI~7s6S9TFSbgCC9JYh9eoXtr73IXIYdNoVDEWncuU--jOJpLYoLiUIZAXJ5V7EP8gaPQshWiEy89DZWvX9VdPEtBAIL5T9ApTggtycsDA644JaPDSPjJQ~ilAOMomsHx~KBxqqBfLnMvmwBtPex6eMD~1IY6CFZ52tLEg__"

    async with SessionFactory() as session:
        result = await session.execute(select(Work).where(Work.title == "くろーど"))
        works = result.scalars().all()
        
        if not works:
            print("No Claude works found.")
            return

        print(f"Found {len(works)} Claude works. Fixing...")
        
        # GLB ファイルをメモリにダウンロード
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get(GLB_SOURCE_URL)
                resp.raise_for_status()
                glb_content = resp.content
                print("GLB downloaded successfully.")
        except Exception as e:
            print(f"Failed to download GLB: {e}")
            return

        bucket = storage.bucket()
        
        for w in works:
            path = f"models/{w.user_id}/{w.id}.glb"
            print(f"Uploading to Firebase: {path}")
            try:
                blob = bucket.blob(path)
                blob.upload_from_string(glb_content, content_type="model/gltf-binary")
                blob.make_public()
                w.glb_url = blob.public_url
                w.status = "done"
                print(f"Fixed: {w.id} -> {w.glb_url}")
            except Exception as e:
                print(f"Upload failed for {w.id}: {e}")

        await session.commit()
        print("Production database updated successfully!")

if __name__ == "__main__":
    asyncio.run(fix_data())
