import asyncio
import asyncpg

# あなたのデータベース接続URL
DATABASE_URL = "postgresql://utinoko_db_user:REDACTED@dpg-d7jih57avr4c73cb88tg-a.singapore-postgres.render.com/utinoko_db"

async def fix():
    print("🚀 データベースに接続中...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        # エラーの原因となっているカラムを追加
        print("🛠️  turnaround_url カラムを追加しています...")
        await conn.execute("ALTER TABLE works ADD COLUMN IF NOT EXISTS turnaround_url TEXT;")
        
        # ログに likes_count もあったので、念のため確認して追加
        print("🛠️  likes_count カラムを確認しています...")
        await conn.execute("ALTER TABLE works ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;")
        
        await conn.close()
        print("✅ 完了しました！エラーが解消されたはずです。")
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")

if __name__ == "__main__":
    asyncio.run(fix())