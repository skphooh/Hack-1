"""
サービス: Firebase Storage ファイルアップロード
"""
import json
import os

import firebase_admin
from firebase_admin import credentials, storage
import httpx

_raw = os.getenv("FIREBASE_STORAGE_BUCKET") or os.getenv("VITE_FIREBASE_STORAGE_BUCKET", "")
STORAGE_BUCKET = _raw.replace("gs://", "").rstrip("/")

_firebase_storage_initialized = False


def _ensure_firebase_initialized() -> None:
    """Firebase Admin SDK が初期化されていなければ初期化する。"""
    global _firebase_storage_initialized
    if _firebase_storage_initialized:
        return
    try:
        firebase_admin.get_app()
    except ValueError:
        # まだ初期化されていない
        sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        if sa_json:
            cert = credentials.Certificate(json.loads(sa_json))
            firebase_admin.initialize_app(cert, {"storageBucket": STORAGE_BUCKET})
            print("✅ Firebase Admin SDK 初期化完了 (storage.py)", flush=True)
        else:
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT 環境変数が設定されていません。"
                "Render の環境変数にサービスアカウント JSON を設定してください。"
            )
    _firebase_storage_initialized = True


async def upload_to_storage(file_bytes: bytes, path: str) -> str:
    """
    Firebase Storage にファイルをアップロードし、公開URLを返す。
    """
    if not STORAGE_BUCKET:
        raise RuntimeError(
            "FIREBASE_STORAGE_BUCKET 環境変数が設定されていません。"
            "Render の環境変数に utinoko-7e0ab.firebasestorage.app を設定してください。"
        )

    _ensure_firebase_initialized()

    bucket = storage.bucket(STORAGE_BUCKET)
    blob = bucket.blob(path)
    blob.upload_from_string(file_bytes)
    blob.make_public()
    print(f"✅ Storage アップロード完了: {path}", flush=True)
    return blob.public_url


async def upload_url_to_storage(url: str, path: str) -> str:
    """外部URLからダウンロードして Firebase Storage にアップロードする。"""
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    return await upload_to_storage(resp.content, path)
