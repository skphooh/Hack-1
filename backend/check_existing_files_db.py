import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://utinoko_db_user:REDACTED@dpg-d7jih57avr4c73cb88tg-a.singapore-postgres.render.com/utinoko_db"

async def check_ids():
    engine = create_async_engine(DATABASE_URL)
    SessionFactory = async_sessionmaker(engine)
    from db.models import Work
    
    ids = [
        "b962f4be-3e58-423d-818b-42c5f2936bb1",
        "cd2678fc-abf5-416a-b9c2-fb9d487b6c40"
    ]
    
    async with SessionFactory() as session:
        for i in ids:
            result = await session.execute(select(Work).where(Work.id == i))
            w = result.scalar_one_or_none()
            if w:
                print(f"ID: {i} Title: {w.title} GLB: {w.glb_url}")
            else:
                print(f"ID: {i} Not found in DB.")

if __name__ == "__main__":
    asyncio.run(check_ids())
