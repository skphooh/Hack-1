import asyncio
import os
import json
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Render's production Postgres URL
DATABASE_URL = "postgresql+asyncpg://user:password@host/dbname"

async def fix_claude_final():
    engine = create_async_engine(DATABASE_URL)
    SessionFactory = async_sessionmaker(engine)
    
    from db.models import Work
    
    # ローカルで動作確認済みの正しいデータ
    VALID_ID = "b962f4be-3e58-423d-818b-42c5f2936bb1"
    VALID_GLB = "https://firebasestorage.googleapis.com/v0/b/utinoko-7e0ab.firebasestorage.app/o/models%2F96944a53-ea9b-4fa4-9590-54944940e85b%2Fb962f4be-3e58-423d-818b-42c5f2936bb1.glb?alt=media&token=8664184c-be82-416b-a25b-2401826d9595"
    
    async with SessionFactory() as session:
        # ID 63ac9d64... を正しいデータで上書きする
        TARGET_IDS = ["63ac9d64-e461-46bc-920f-074092497678", "fc056486-0fd9-450f-8d52-be5ff5692ecb"]
        
        for tid in TARGET_IDS:
            result = await session.execute(select(Work).where(Work.id == tid))
            w = result.scalar_one_or_none()
            if w:
                print(f"Updating work {tid} with valid GLB URL...")
                w.glb_url = VALID_GLB
                w.status = "done"
            else:
                print(f"Work {tid} not found in production DB.")
        
        await session.commit()
        print("🎉 Production database updated with valid Claude model URL!")

if __name__ == "__main__":
    asyncio.run(fix_claude_final())
