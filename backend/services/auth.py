"""
サービス: Firebase Authトークン検証・ユーザー管理
"""
import json
import os

import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User

# Firebase Admin SDK 初期化（サービスアカウントJSON文字列から）
_firebase_initialized = False


def _init_firebase():
    """Firebase Admin SDKを初期化する（一度だけ実行）"""
    global _firebase_initialized
    if _firebase_initialized:
        return
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    if service_account_json:
        cert = credentials.Certificate(json.loads(service_account_json))
        firebase_admin.initialize_app(cert)
    else:
        # 開発環境: 環境変数なしの場合はデフォルト初期化（エミュレーター想定）
        firebase_admin.initialize_app()
    _firebase_initialized = True


async def get_current_uid(authorization: str = Header(...)) -> str:
    """
    Authorization ヘッダーの Bearer トークンを検証し、Firebase UIDを返す。
    FastAPIの依存注入（Depends）で使用する。
    """
    _init_firebase()
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearerトークンが必要です")
    token = authorization.removeprefix("Bearer ")
    try:
        decoded = auth.verify_id_token(token)
        return decoded["uid"]
    except Exception as e:
        print(f"🔥 Firebase Auth Token Verification Failed: {e}", flush=True)
        raise HTTPException(status_code=401, detail=f"トークンが無効です: {e}")


async def get_or_create_user(uid: str, db: AsyncSession) -> User:
    """
    Firebase UID からDBのユーザーを取得、存在しなければ新規作成する。
    """
    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()
    if not user:
        user = User(firebase_uid=uid)
        db.add(user)
        await db.flush()
    return user
