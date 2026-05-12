import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Render's production Postgres URL
DATABASE_URL = "postgresql+asyncpg://utinoko_db_user:REDACTED@dpg-d7jih57avr4c73cb88tg-a.singapore-postgres.render.com/utinoko_db"

async def check_works():
    engine = create_async_engine(DATABASE_URL)
    SessionFactory = async_sessionmaker(engine)
    
    from db.models import Work
    
    async with SessionFactory() as session:
        result = await session.execute(select(Work).where(Work.title == "くろーど"))
        works = result.scalars().all()
        
        print(f"--- Works with title 'くろーど' ---")
        for w in works:
            print(f"ID: {w.id}")
            print(f"Title: {w.title}")
            print(f"Status: {w.status}")
            print(f"GLB URL: {w.glb_url}")
            print(f"Thumbnail URL: {w.thumbnail_url}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check_works())
