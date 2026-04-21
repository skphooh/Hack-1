"""
ルーター: 3D生成ジョブ（/api/generate, /api/task/{task_id}）
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Work
from db.schemas import TaskStatusResponse, WorkResponse
from services.auth import get_current_uid, get_or_create_user
from services.wonder3d import generate_3d_wonder, get_wonder_task_status
from services.storage import upload_to_storage

router = APIRouter()


@router.post("/generate", response_model=WorkResponse)
async def start_generate(
    file: UploadFile = File(..., description="変換する画像ファイル"),
    title: str = Form("新しい作品"),
    genre: str = Form(None),
    mode: str = Form("photo"),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    画像を受け取り3D生成ジョブを開始する。
    Wonder3D（HuggingFace）で処理する。
    """
    user = await get_or_create_user(uid, db)
    image_bytes = await file.read()

    safe_filename = file.filename or "image.png"
    thumbnail_url = await upload_to_storage(
        image_bytes, f"thumbnails/{uid}/{safe_filename}"
    )

    try:
        task_id = await generate_3d_wonder(image_bytes)
    except Exception as e:
        print(f"❌ 3D生成ジョブ開始失敗: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"3D生成の開始に失敗しました: {str(e)}")

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
    print(f"✅ 生成ジョブ開始: task_id={task_id}, user={uid}", flush=True)
    return work


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    ジョブのステータスをポーリングする（フロントは3秒ごとに呼ぶ）。
    """
    result = await db.execute(select(Work).where(Work.task_id == task_id))
    work = result.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    if work.status in ("done", "failed"):
        return TaskStatusResponse(
            task_id=task_id,
            status=work.status,
            progress=100 if work.status == "done" else 0,
            glb_url=work.glb_url,
            stl_url=work.stl_url,
        )

    progress = 0
    try:
        wonder_data = await get_wonder_task_status(task_id)
        progress = wonder_data.get("progress", 0)
        new_status = wonder_data.get("status", "processing")

        print(f"📊 タスク状況: {task_id} → {new_status} ({progress}%)", flush=True)

        if new_status != work.status or wonder_data.get("glb_url"):
            work.status = new_status
            if wonder_data.get("glb_url"):
                work.glb_url = wonder_data["glb_url"]
                print(f"✅ GLB保存完了: {task_id}", flush=True)
            await db.commit()
            await db.refresh(work)

    except Exception as e:
        print(f"⚠️ ステータス取得失敗: {e}", flush=True)

    return TaskStatusResponse(
        task_id=task_id,
        status=work.status,
        progress=progress,
        glb_url=work.glb_url,
        stl_url=work.stl_url,
    )