import os
import json
import firebase_admin
from firebase_admin import credentials, storage
from pathlib import Path

def load_env_safe():
    """ .env を安全に読み込む（UnicodeDecodeError 対策） """
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

async def update_cors():
    env = load_env_safe()
    
    # サービスアカウントの取得
    sa_json = env.get("FIREBASE_SERVICE_ACCOUNT")
    if not sa_json:
        print("❌ FIREBASE_SERVICE_ACCOUNT が .env に見つかりません")
        return

    bucket_name = env.get("FIREBASE_STORAGE_BUCKET") or "utinoko-7e0ab.firebasestorage.app"
    bucket_name = bucket_name.replace("gs://", "").rstrip("/")
    
    print(f"Bucket: {bucket_name}")
    
    try:
        # Firebase Admin 初期化 (すでに初期化されている場合はスキップ)
        try:
            cred = credentials.Certificate(json.loads(sa_json))
            firebase_admin.initialize_app(cred, {'storageBucket': bucket_name})
        except ValueError:
            pass

        # CORS設定の定義
        cors_config = [
            {
                "origin": ["https://utinoko.skphooh.com", "http://localhost:5173", "http://localhost:5174"],
                "method": ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
                "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
                "maxAgeSeconds": 3600
            }
        ]

        # Google Cloud Storage クライアントから CORS を設定
        bucket = storage.bucket()
        bucket.cors = cors_config
        bucket.patch()

        print("CORS configuration updated successfully!")
        print("Allowed origin: https://utinoko.skphooh.com")
        
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(update_cors())
