# fix_work_url.py の中身を以下に差し替え
import asyncio
import os
import sys
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, storage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# --- 1. 設定 ---
BASE_DIR = Path(__file__).parent
os.environ["FIREBASE_STORAGE_BUCKET"] = ""
SERVICE_ACCOUNT_FILE = BASE_DIR / ""

# パソコンに保存した GLB ファイルの名前
LOCAL_GLB_FILE = "claude_model.glb" 

# --- 2. Firebase初期化 ---
if not firebase_admin._apps:
    cred = credentials.Certificate(str(SERVICE_ACCOUNT_FILE))
    firebase_admin.initialize_app(cred, {'storageBucket': os.environ["FIREBASE_STORAGE_BUCKET"]})

# パスの設定
sys.path.append(str(BASE_DIR))
from db.models import Work
from services.storage import upload_to_storage # ローカルバイト用

# DB接続
DATABASE_URL = "postgresql+asyncpg://user:password@host/dbname"
engine = create_async_engine(DATABASE_URL, echo=False)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)

async def fix_claude_from_local():
    async with SessionFactory() as session:
        # 作品「くろーど」を探す
        result = await session.execute(select(Work).where(Work.title == "くろーど"))
        work = result.scalar_one_or_none()
        
        if not work:
            print("❌ 作品「くろーど」が見つかりませんでした。")
            return

        glb_path = BASE_DIR / LOCAL_GLB_FILE
        if not glb_path.exists():
            print(f"❌ ローカルファイルが見つかりません: {glb_path}")
            return

        print(f"🔄 「くろーど」(ID: {work.id}) の3Dモデルをローカルからアップロード中...")
        
        try:
            # 1. ファイルを読み込む
            glb_bytes = glb_path.read_bytes()
            
            # 2. Firebase Storage にアップロード
            # パス: models/{user_id}/{作品ID}.glb
            storage_path = f"models/{work.user_id}/{work.id}.glb"
            firebase_url = await upload_to_storage(glb_bytes, storage_path)
            
            if "mock-storage" in firebase_url:
                print("❌ 認証エラーによりモックURLが返されました。鍵ファイルを確認してください。")
                return

            # 3. データベースを更新
            work.glb_url = firebase_url
            work.status = "done"
            
            await session.commit()
            print(f"✅ 更新完了！")
            print(f"🔗 Firebase URL: {firebase_url}")
            
        except Exception as e:
            print(f"🔥 エラー: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(fix_claude_from_local())