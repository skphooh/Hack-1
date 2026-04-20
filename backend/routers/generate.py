"""
ルーター: 3D生成ジョブ（/api/generate, /api/task/{task_id}）
"""
import os
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Work
from db.schemas import GenerateRequest, TaskStatusResponse, WorkResponse
from services.auth import get_current_uid, get_or_create_user
from services.tripo3d import generate_3d_tripo
from services.wonder3d import generate_3d_wonder
from services.storage import upload_to_storage

router = APIRouter()


@router.post("/generate", response_model=WorkResponse)
async def start_generate(
    file: UploadFile = File(..., description="変換する画像ファイル"),
    title: str = Form("新しい作品"),
    genre: str = Form(None),
    mode: str = Form("photo", description="photo=実写(Tripo3D) / anime=イラスト(Wonder3D)"),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    画像を受け取り3D生成ジョブを開始する。
    即座にDB登録して work_id を返す（ポーリングは /api/task/{task_id} で行う）。
    """
    user = await get_or_create_user(uid, db)

    # 画像をFlrebase Storageにアップロード
    image_bytes = await file.read()
    thumbnail_url = await upload_to_storage(image_bytes, f"thumbnails/{uid}/{file.filename}")

    # 3D生成ジョブを開始
    if mode == "anime":
        task_id = await generate_3d_wonder(image_bytes)
    else:
        task_id = await generate_3d_tripo(image_bytes)

    # DBに作品を仮登録
    work = Work(
        user_id=user.id,
        title=title,
        genre=genre,
        thumbnail_url=thumbnail_url,
        task_id=task_id,
        status="processing",
    )
    db.add(work)
    await db.flush()
    return work


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    ジョブのステータスをポーリングする（フロントは3秒ごとに呼ぶ）。
    完了時は STL/GLB URL を返す。
    """
    result = await db.execute(select(Work).where(Work.task_id == task_id))
    work = result.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    return TaskStatusResponse(
        task_id=task_id,
        status=work.status,
        glb_url=work.glb_url,
        stl_url=work.stl_url,
    )
