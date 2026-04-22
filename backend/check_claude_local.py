import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Local SQLite URL
DATABASE_URL = "sqlite+aiosqlite:///backend/dev.db"

async def check_local_works():
    engine = create_async_engine(DATABASE_URL)
    SessionFactory = async_sessionmaker(engine)
    
    # We need to import the model. Since it's local, we can try to import normally.
    import sys
    sys.path.append("backend")
    from db.models import Work
    
    async with SessionFactory() as session:
        result = await session.execute(select(Work).where(Work.title == "くろーど"))
        works = result.scalars().all()
        
        print(f"--- Local Works with title 'くろーど' ---")
        for w in works:
            print(f"ID: {w.id}")
            print(f"GLB URL: {w.glb_url}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check_local_works())
