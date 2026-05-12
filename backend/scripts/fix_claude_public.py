import asyncio
import os
import json
import firebase_admin
from firebase_admin import credentials, storage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://utinoko_db_user:REDACTED@dpg-d7jih57avr4c73cb88tg-a.singapore-postgres.render.com/utinoko_db"

def load_env_safe():
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    content = open(env_file, "rb").read().decode("utf-8", errors="replace")
    env = {}
    for line in content.splitlines():
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip("'").strip('"')
    return env

async def fix():
    env = load_env_safe()
    sa_json = env.get("FIREBASE_SERVICE_ACCOUNT")
    bucket_name = "utinoko-7e0ab.firebasestorage.app"
    
    # Firebase
    try:
        cred = credentials.Certificate(json.loads(sa_json))
        firebase_admin.initialize_app(cred, {'storageBucket': bucket_name})
    except: pass
    
    bucket = storage.bucket()
    # 確実に実在するファイル
    path = "models/96944a53-ea9b-4fa4-9590-54944940e85b/b962f4be-3e58-423d-818b-42c5f2936bb1.glb"
    blob = bucket.blob(path)
    blob.make_public()
    public_url = blob.public_url
    print(f"Verified Public URL: {public_url}")

    # Database
    engine = create_async_engine(DATABASE_URL)
    SessionFactory = async_sessionmaker(engine)
    from db.models import Work
    
    async with SessionFactory() as session:
        result = await session.execute(select(Work).where(Work.title == "くろーど"))
        works = result.scalars().all()
        for w in works:
            w.glb_url = public_url
            w.status = "done"
            print(f"Updated work {w.id}")
        await session.commit()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(fix())
