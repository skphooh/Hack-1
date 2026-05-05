"""
ルーター: ユーザー自身の情報取得・更新（/api/users/me）
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import User
from services.auth import get_current_uid, get_or_create_user

router = APIRouter()


@router.get("/users/me")
async def get_me(
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """ログイン中のユーザー情報を返す"""
    user = await get_or_create_user(uid, db)
    return {
        "id": str(user.id),
        "firebase_uid": user.firebase_uid,
        "display_name": user.display_name,
        "is_creator": user.is_creator,
        "has_printer": user.has_printer,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.patch("/users/me")
async def update_me(
    body: dict,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """表示名を更新する"""
    user = await get_or_create_user(uid, db)
    if "display_name" in body:
        name = (body["display_name"] or "").strip()
        if len(name) > 50:
            name = name[:50]
        user.display_name = name or None
    await db.commit()
    return {"display_name": user.display_name}
