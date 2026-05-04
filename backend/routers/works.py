"""
ルーター: 作品CRUD（/api/works）
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Like, User, Work
from db.schemas import LikeResponse, WorkCreate, WorkUpdate, WorkListResponse, WorkResponse
from services.auth import get_current_uid, get_or_create_user
from services.storage import upload_to_storage, upload_url_to_storage

router = APIRouter()


@router.get("/works", response_model=WorkListResponse)
async def list_works(
    genre: Optional[str] = Query(None, description="ジャンルでフィルタ"),
    user_id: Optional[str] = Query(None, description="Firebase UIDでフィルタ"),
    search: Optional[str] = Query(None, description="タイトル検索"),
    is_official: Optional[bool] = Query(None, description="公式作品フィルタ"),
    min_price: Optional[int] = Query(None, description="最低価格フィルタ（1以上で有料作品のみ）"),
    max_price: Optional[int] = Query(None, description="最高価格フィルタ（0で無料のみ）"),
    status: str = Query("done", description="ステータスでフィルタ"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """作品一覧取得（フィルタ・ページネーション対応）"""
    query = select(Work).where(Work.status == status)
    if genre:
        query = query.where(Work.genre == genre)
    if user_id:
        # 自分の作品一覧（マイページ）: 非公開も含めて表示
        query = query.join(Work.user).where(User.firebase_uid == user_id)
    else:
        # マーケット閲覧: 公開作品のみ（is_public=True, または is_public が NULL の旧データは公開扱い）
        query = query.where((Work.is_public == True) | (Work.is_public == None))  # noqa: E711
    if search:
        query = query.where(Work.title.ilike(f"%{search}%"))
    if is_official is not None:
        query = query.where(Work.is_official == is_official)
    if min_price is not None:
        query = query.where(Work.price >= min_price)
    if max_price is not None:
        query = query.where(Work.price <= max_price)

    # 全件数カウント
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    # ページネーション
    query = query.options(selectinload(Work.user)).order_by(Work.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = result.scalars().all()

    return WorkListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/works/liked", response_model=WorkListResponse)
async def get_liked_works(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """自分がいいねした作品一覧を取得"""
    user = await get_or_create_user(uid, db)
    
    query = select(Work).join(Like, Work.id == Like.work_id).where(Like.user_id == user.id)
    
    # 全件数カウント
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()
    
    # ページネーション
    query = query.options(selectinload(Work.user)).order_by(Like.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return WorkListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/works/{work_id}", response_model=WorkResponse)
async def get_work(work_id: UUID, db: AsyncSession = Depends(get_db)):
    """作品詳細取得"""
    result = await db.execute(select(Work).options(selectinload(Work.user)).where(Work.id == work_id))
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
    work.user = user
    return work


@router.post("/works/upload", response_model=WorkResponse)
async def upload_work(
    title: str = Form(...),
    genre: Optional[str] = Form(None),
    price: int = Form(0),
    is_public: bool = Form(True),
    glb_file: UploadFile = File(...),
    thumbnail_file: Optional[UploadFile] = File(None),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """既存3DデータをアップロードしてWork登録（AI生成不要）"""
    user = await get_or_create_user(uid, db)

    # GLBファイルのみ受け付ける
    if glb_file.content_type not in ("model/gltf-binary", "application/octet-stream") and \
       not (glb_file.filename or "").lower().endswith(".glb"):
        raise HTTPException(status_code=400, detail="GLBファイルのみアップロード可能です")

    # Workレコードを先に作成してIDを確定
    work = Work(
        user_id=user.id,
        title=title,
        genre=genre,
        price=price,
        is_public=is_public,
        status="done",
    )
    db.add(work)
    await db.flush()

    # GLBをFirebase Storageにアップロード
    glb_bytes = await glb_file.read()
    glb_url = await upload_to_storage(glb_bytes, f"models/{user.id}/{work.id}.glb")
    work.glb_url = glb_url

    # サムネイルがあればアップロード
    if thumbnail_file and thumbnail_file.filename:
        thumb_bytes = await thumbnail_file.read()
        ext = (thumbnail_file.filename or "jpg").rsplit(".", 1)[-1].lower()
        thumb_url = await upload_to_storage(thumb_bytes, f"thumbnails/{user.id}/{work.id}.{ext}")
        work.thumbnail_url = thumb_url

    await db.commit()
    await db.refresh(work)
    work.user = user
    return work


@router.post("/works/{work_id}/download")
async def record_download(
    work_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """ダウンロード数を1件インクリメントする（認証不要）"""
    result = await db.execute(select(Work).where(Work.id == work_id))
    work = result.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="作品が見つかりません")

    await db.execute(
        update(Work).where(Work.id == work_id).values(downloads=Work.downloads + 1)
    )
    await db.commit()

    # 更新後のダウンロード数を返す
    result = await db.execute(select(Work.downloads).where(Work.id == work_id))
    count = result.scalar_one()
    return {"downloads": count}


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


@router.patch("/works/{work_id}", response_model=WorkResponse)
async def update_work(
    work_id: UUID,
    body: WorkUpdate,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """作品情報の更新（所有者のみ可能）"""
    user = await get_or_create_user(uid, db)
    
    result = await db.execute(
        select(Work).options(selectinload(Work.user)).where(Work.id == work_id)
    )
    work = result.scalar_one_or_none()
    
    if not work:
        raise HTTPException(status_code=404, detail="作品が見つかりません")
        
    if work.user_id != user.id:
        raise HTTPException(status_code=403, detail="他人の作品は編集できません")
        
    # フィールドの更新
    update_data = body.model_dump(exclude_unset=True)
    
    # GLB URL が更新された場合、Firebase Storage に永続化を試みる
    if "glb_url" in update_data and update_data["glb_url"]:
        raw_url = update_data["glb_url"]
        if "tripo3d.com" in raw_url or "wonder3d" in raw_url:
            print(f"🔄 Permanentizing GLB to Firebase: {raw_url}", flush=True)
            try:
                # ユーザーディレクトリ配下に保存
                firebase_url = await upload_url_to_storage(
                    raw_url, f"models/{user.id}/{work.id}.glb"
                )
                update_data["glb_url"] = firebase_url
                print(f"✅ GLB permanentized: {firebase_url}", flush=True)
            except Exception as e:
                print(f"⚠️ GLB permanentization failed: {e}", flush=True)

    for key, value in update_data.items():
        setattr(work, key, value)
        
    await db.commit()
    await db.refresh(work)
    return work
