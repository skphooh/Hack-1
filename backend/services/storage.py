"""
サービス: Firebase Storage ファイルアップロード
"""
import json
import os
import uuid

import firebase_admin
from firebase_admin import storage

STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET") or os.getenv("VITE_FIREBASE_STORAGE_BUCKET", "")


async def upload_to_storage(file_bytes: bytes, path: str) -> str:
    """
    Firebase Storage にファイルをアップロードし、公開URLを返す。
    バケットが設定されていない場合はモックURLを返す。
    """
    if not STORAGE_BUCKET:
        # 開発用モック: 実際にアップロードせず仮URLを返す
        return f"https://mock-storage.example.com/{path}"

    bucket = storage.bucket(STORAGE_BUCKET)
    blob = bucket.blob(path)
    blob.upload_from_string(file_bytes)
    blob.make_public()
    return blob.public_url
