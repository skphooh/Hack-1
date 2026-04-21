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
    Wonder3D は現在未実装のため、anime モードも Tripo3D で処理する。
    """
    user = await get_or_create_user(uid, db)

    image_bytes = await file.read()

    # サムネイルをFirebase Storageにアップロード
    try:
        thumbnail_url = await upload_to_storage(
            image_bytes, f"thumbnails/{uid}/{file.filename}"
        )
    except Exception as e:
        print(f"⚠️ サムネイルアップロード失敗: {e}", flush=True)
        thumbnail_url = None

    # 3D生成ジョブを開始（anime モードも現時点は Tripo3D で処理）
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
    await db.commit()
    await db.refresh(work)
    return work


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    ジョブのステータスをポーリングする（フロントは3秒ごとに呼ぶ）。
    task_id のプレフィックスで使用APIを判定する。
    """
    result = await db.execute(select(Work).where(Work.task_id == task_id))
    work = result.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    progress = 0

    if work.status == "processing":
        try:
            if task_id.startswith("wonder_"):
                # ✅ Wonder3D 未実装: failed にしてポーリングを止める
                work.status = "failed"
                await db.commit()
                await db.refresh(work)
                print(f"⚠️ Wonder3D task {task_id} は未実装のため failed にしました", flush=True)
            else:
                # ✅ Tripo3D のステータスを取得
                tripo_data = await get_tripo_task_status(task_id)
                progress = tripo_data.get("progress", 0)
                new_status = tripo_data.get("status", "processing")

                work.status = new_status
                if tripo_data.get("glb_url"):
                    work.glb_url = tripo_data["glb_url"]
                await db.commit()
                await db.refresh(work)

        except Exception as e:
            print(f"⚠️ タスクステータス取得失敗 ({task_id}): {e}", flush=True)

    return TaskStatusResponse(
        task_id=task_id,
        status=work.status,
        progress=progress,
        glb_url=work.glb_url,
        stl_url=work.stl_url,
    )
