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
from services.tripo3d import generate_3d_tripo, get_tripo_task_status
from services.storage import upload_to_storage, upload_url_to_storage
from services.mesh import convert_to_stl

router = APIRouter()


@router.post("/generate", response_model=WorkResponse)
async def start_generate(
    file: UploadFile = File(..., description="変換する画像ファイル"),
    title: str = Form("新しい作品"),
    genre: str = Form(None),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    画像を受け取り3D生成ジョブを開始する。
    Tripo3D APIで処理する（モード問わず統一）。
    """
    user = await get_or_create_user(uid, db)
    image_bytes = await file.read()

    import uuid
    # サムネイルをFirebase Storageにアップロード（上書き防止のためUUIDを付与）
    safe_filename = f"{uuid.uuid4().hex}_{file.filename or 'image.png'}"
    thumbnail_url = await upload_to_storage(
        image_bytes, f"thumbnails/{uid}/{safe_filename}"
    )

    # Tripo3Dでジョブ開始
    try:
        task_id = await generate_3d_tripo(image_bytes)
    except Exception as e:
        print(f"❌ 3D生成ジョブ開始失敗: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"3D生成の開始に失敗しました: {str(e)}")

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
    work.user = user
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

    # すでに完了・失敗済みならDBの値をそのまま返す
    if work.status in ("done", "failed"):
        return TaskStatusResponse(
            task_id=task_id,
            status=work.status,
            progress=100 if work.status == "done" else 0,
            glb_url=work.glb_url,
            stl_url=work.stl_url,
        )

    # Tripo3Dタスクのステータスを取得してDBを更新
    progress = 0
    try:
        tripo_data = await get_tripo_task_status(task_id)
        progress = tripo_data.get("progress", 0)
        new_status = tripo_data.get("status", "processing")

        if new_status != work.status or tripo_data.get("glb_url"):
            work.status = new_status
            
            # glb_url が新規に届いた場合はFirebaseに永続化してCORSを解除
            if tripo_data.get("glb_url"):
                raw_glb_url = tripo_data["glb_url"]
                print(f"🔄 downloading {raw_glb_url} to firebase...", flush=True)

                # GLBをダウンロードしFirebase Storageに保存
                import httpx
                async with httpx.AsyncClient(timeout=120.0) as client:
                    glb_resp = await client.get(raw_glb_url)
                    glb_resp.raise_for_status()
                    glb_bytes = glb_resp.content

                firebase_glb_url = await upload_to_storage(
                    glb_bytes, f"models/{work.user_id}/{task_id}.glb"
                )
                work.glb_url = firebase_glb_url
                print(f"✅ GLB保存完了 (Firebase): {task_id}", flush=True)

                # GLBをSTLに変換してFirebase Storageに保存
                try:
                    print(f"🔧 GLB→STL変換中: {task_id}", flush=True)
                    stl_bytes = await convert_to_stl(glb_bytes, "glb")
                    firebase_stl_url = await upload_to_storage(
                        stl_bytes, f"stl/{work.user_id}/{task_id}.stl"
                    )
                    work.stl_url = firebase_stl_url
                    print(f"✅ STL保存完了 (Firebase): {task_id}", flush=True)
                except Exception as stl_err:
                    # STL変換失敗はGLBの保存を妨げない
                    print(f"⚠️ STL変換失敗（GLBは保存済み）: {stl_err}", flush=True)

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