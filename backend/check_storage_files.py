import os
import json
import firebase_admin
from firebase_admin import credentials, storage
from pathlib import Path

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

async def check_files():
    env = load_env_safe()
    sa_json = env.get("FIREBASE_SERVICE_ACCOUNT")
    bucket_name = env.get("FIREBASE_STORAGE_BUCKET") or "utinoko-7e0ab.firebasestorage.app"
    bucket_name = bucket_name.replace("gs://", "").rstrip("/")
    
    try:
        cred = credentials.Certificate(json.loads(sa_json))
        firebase_admin.initialize_app(cred, {'storageBucket': bucket_name})
        bucket = storage.bucket()
        
        blobs = bucket.list_blobs(prefix="models/")
        print("--- Bucket Files (models/) ---")
        for b in blobs:
            print(f"Name: {b.name}, Size: {b.size}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_files())
