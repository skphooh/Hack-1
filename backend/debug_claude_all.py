import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://utinoko_db_user:REDACTED@dpg-d7jih57avr4c73cb88tg-a.singapore-postgres.render.com/utinoko_db"

async def debug_id():
    engine = create_async_engine(DATABASE_URL)
    SessionFactory = async_sessionmaker(engine)
    from db.models import Work
    
    # Subagent saw errors for some URLs. Let's find those works.
    async with SessionFactory() as session:
        # Get ALL works to be sure
        result = await session.execute(select(Work))
        works = result.scalars().all()
        print(f"Total works in DB: {len(works)}")
        for w in works:
            if "くろーど" in (w.title or "") or "Claude" in (w.title or ""):
                print(f"ID: {w.id} Title: {w.title} GLB: {w.glb_url}")

if __name__ == "__main__":
    asyncio.run(debug_id())
