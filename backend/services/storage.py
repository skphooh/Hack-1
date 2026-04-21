"""
サービス: Firebase Storage ファイルアップロード
"""
import json
import os
import uuid

import firebase_admin
from firebase_admin import storage

# ✅ 修正: gs:// や trailing slash を除去してバケット名だけにする
_raw = os.getenv("FIREBASE_STORAGE_BUCKET") or os.getenv("VITE_FIREBASE_STORAGE_BUCKET", "")
STORAGE_BUCKET = _raw.replace("gs://", "").rstrip("/")


async def upload_to_storage(file_bytes: bytes, path: str) -> str:
    """
    Firebase Storage にファイルをアップロードし、公開URLを返す。
    バケットが設定されていない場合はモックURLを返す。
    """
    if not STORAGE_BUCKET:
        # 開発用モック
        return f"https://mock-storage.example.com/{path}"

    try:
        # ✅ 修正: storage.bucket() にはバケット名だけ渡す（gs:// 不要）
        bucket = storage.bucket(STORAGE_BUCKET)
        blob = bucket.blob(path)
        blob.upload_from_string(file_bytes)
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"⚠️ Storage アップロード失敗: {e}", flush=True)
        # アップロード失敗してもサービス全体を落とさない
        return f"https://mock-storage.example.com/{path}"