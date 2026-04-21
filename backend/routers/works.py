"""
ルーター: 作品CRUD（/api/works）
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Like, User, Work
from db.schemas import LikeResponse, WorkCreate, WorkListResponse, WorkResponse
from services.auth import get_current_uid, get_or_create_user

router = APIRouter()


@router.get("/works", response_model=WorkListResponse)
async def list_works(
    genre: Optional[str] = Query(None, description="ジャンルでフィルタ"),
    status: str = Query("done", description="ステータスでフィルタ"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """作品一覧取得（ジャンル・ページネーション対応）"""
    query = select(Work).where(Work.status == status)
    if genre:
        query = query.where(Work.genre == genre)

    # 全件数カウント
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    # ページネーション
    query = query.order_by(Work.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = result.scalars().all()

    return WorkListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/works/{work_id}", response_model=WorkResponse)
async def get_work(work_id: UUID, db: AsyncSession = Depends(get_db)):
    """作品詳細取得"""
    result = await db.execute(select(Work).where(Work.id == work_id))
    work = result.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="作品が見つかりません")
    return work


@router.post("/works", response_model=WorkResponse)
async def create_work(
    body: WorkCreate,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """作品をDBに保存（生成完了後に呼ぶ）"""
    user = await get_or_create_user(uid, db)
    work = Work(
        user_id=user.id,
        title=body.title,
        genre=body.genre,
        is_official=body.is_official,
        price=body.price,
        task_id=body.task_id,
        status="pending",
    )
    db.add(work)
    await db.flush()
    return work


@router.post("/works/{work_id}/like", response_model=LikeResponse)
async def toggle_like(
    work_id: UUID,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """いいねの追加・解除（トグル）"""
    user = await get_or_create_user(uid, db)

    # 既存のいいねを検索
    existing = await db.execute(
        select(Like).where(Like.user_id == user.id, Like.work_id == work_id)
    )
    like = existing.scalar_one_or_none()

    if like:
        # すでにいいね済み → 解除
        await db.delete(like)
        delta = -1
        liked = False
    else:
        # まだいいねしていない → 追加
        db.add(Like(user_id=user.id, work_id=work_id))
        delta = 1
        liked = True

    # likes_count を更新
    await db.execute(
        update(Work).where(Work.id == work_id).values(likes_count=Work.likes_count + delta)
    )

    # 更新後のいいね数を取得
    result = await db.execute(select(Work.likes_count).where(Work.id == work_id))
    count = result.scalar_one()

    return LikeResponse(liked=liked, likes_count=count)


@router.delete("/works/{work_id}")
async def delete_work(
    work_id: UUID,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """作品の削除（本人のみ可能）"""
    user = await get_or_create_user(uid, db)
    
    result = await db.execute(select(Work).where(Work.id == work_id))
    work = result.scalar_one_or_none()
    
    if not work:
        raise HTTPException(status_code=404, detail="作品が見つかりません")
        
    if work.user_id != user.id:
        raise HTTPException(status_code=403, detail="他人の作品は削除できません")
        
    await db.delete(work)
    await db.commit()
    return {"message": "deleted"}
