"""
ルーター: 3D生成ジョブ（/api/generate, /api/task/{task_id}, /api/generate/turnaround）

設計方針:
  - GLB保存完了直後に status=done をコミット → マーケットに即反映
  - STL変換は BackgroundTasks で非同期実行 → 失敗してもGLBには影響なし
"""
import uuid

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db, AsyncSessionLocal
from db.models import Work
from db.schemas import TaskStatusResponse, WorkResponse
from services.auth import get_current_uid, get_or_create_user
from services.mesh import convert_to_stl
from services.storage import upload_to_storage
from services.tripo3d import generate_3d_tripo, generate_3d_tripo_multiview, get_tripo_task_status, TripoContentPolicyError
from services.turnaround import generate_turnaround_image, split_turnaround

router = APIRouter()


# ── バックグラウンド: STL変換（失敗してもGLB/doneには影響しない） ─────────────

async def _convert_and_save_stl(work_id: int, glb_bytes: bytes, user_id: int, task_id: str) -> None:
    """
    GLBをSTLに変換してFirebaseに保存し、DBを更新する。
    BackgroundTasks で呼ばれるため、失敗しても生成結果(GLB・done)に影響しない。
    """
    async with AsyncSessionLocal() as db:
        try:
            print(f"🔧 バックグラウンドSTL変換開始: {task_id}", flush=True)
            stl_bytes = await convert_to_stl(glb_bytes, "glb")
            firebase_stl_url = await upload_to_storage(
                stl_bytes, f"stl/{user_id}/{task_id}.stl"
            )
            result = await db.execute(select(Work).where(Work.id == work_id))
            work = result.scalar_one_or_none()
            if work:
                work.stl_url = firebase_stl_url
                await db.commit()
                print(f"✅ STL保存完了 (Firebase): {task_id}", flush=True)
        except Exception as stl_err:
            print(f"⚠️ バックグラウンドSTL変換失敗（GLBは保存済み）: {stl_err}", flush=True)


# ── エンドポイント ─────────────────────────────────────────────────────────────

@router.post("/generate", response_model=WorkResponse)
async def start_generate(
    file: UploadFile = File(..., description="変換する画像ファイル"),
    title: str = Form("新しい作品"),
    genre: str = Form(None),
    quality: str = Form("standard", description="standard / high"),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    画像を受け取り3D生成ジョブを開始する。
    quality=high の場合は Tripo3D にテクスチャ・PBR を有効化して送る。
    """
    user = await get_or_create_user(uid, db)
    image_bytes = await file.read()

    safe_filename = f"{uuid.uuid4().hex}_{file.filename or 'image.png'}"
    thumbnail_url = await upload_to_storage(
        image_bytes, f"thumbnails/{uid}/{safe_filename}"
    )

    try:
        task_id = await generate_3d_tripo(image_bytes, quality=quality)
    except TripoContentPolicyError as e:
        print(f"⚠️ コンテンツポリシー違反: {e}", flush=True)
        raise HTTPException(status_code=422, detail=str(e))
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
    work.user = user
    print(f"✅ 生成ジョブ開始: task_id={task_id}, quality={quality}, user={uid}", flush=True)
    return work


@router.post("/generate/turnaround/preview")
async def turnaround_preview(
    file: UploadFile = File(..., description="元画像"),
):
    """
    アップロード画像から Gemini でフィギュア4方向ビューを生成してURLを返す。
    認証不要（プレビューはログイン前でも確認できるよう）。
    生成画像は Firebase に保存して永続 URL を返す。
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="画像ファイルを送信してください")

    image_bytes = await file.read()
    try:
        turnaround_bytes = await generate_turnaround_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"❌ ターンアラウンド生成失敗: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"ターンアラウンド生成に失敗しました: {e}")

    turnaround_url = await upload_to_storage(
        turnaround_bytes, f"turnarounds/preview/{uuid.uuid4().hex}.png"
    )
    return {"turnaround_url": turnaround_url}


@router.post("/generate/turnaround", response_model=WorkResponse)
async def start_generate_turnaround(
    turnaround_url: str = Form(..., description="ターンアラウンドシート画像URL"),
    title: str = Form("新しい作品"),
    genre: str = Form(None),
    original_image: UploadFile = File(None, description="元画像（サムネイル用）"),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    ターンアラウンドシートを4ビューに分割し、Tripo3D multiview_to_model で3D生成する。
    original_image が渡された場合はそれをサムネイルに使う（元画像を保持するため）。
    """
    user = await get_or_create_user(uid, db)

    # ターンアラウンド画像をダウンロードして4分割
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(turnaround_url)
            resp.raise_for_status()
            turnaround_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ターンアラウンド画像のダウンロードに失敗: {e}")

    # 4ビューに分割（Tripo3D multiview 用）
    views = split_turnaround(turnaround_bytes)

    # サムネイル: 元画像があればそれを使う、なければ正面ビューで代用
    if original_image and original_image.filename:
        original_bytes = await original_image.read()
        thumbnail_url = await upload_to_storage(
            original_bytes, f"thumbnails/{uid}/{uuid.uuid4().hex}_original.png"
        )
    else:
        thumbnail_url = await upload_to_storage(
            views[0], f"thumbnails/{uid}/{uuid.uuid4().hex}_turnaround.png"
        )

    # turnaround_url は preview 時に既に Firebase に保存済みのため再アップロード不要

    # Tripo3D 複数ビュー生成
    try:
        task_id = await generate_3d_tripo_multiview(views)
    except TripoContentPolicyError as e:
        print(f"⚠️ コンテンツポリシー違反: {e}", flush=True)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"❌ ターンアラウンド3D生成失敗: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"3D生成の開始に失敗しました: {e}")

    work = Work(
        user_id=user.id,
        title=title,
        genre=genre,
        thumbnail_url=thumbnail_url,
        turnaround_url=turnaround_url,
        task_id=task_id,
        status="processing",
    )
    db.add(work)
    await db.flush()
    work.user = user
    print(f"✅ ターンアラウンド生成ジョブ開始: task_id={task_id}, user={uid}", flush=True)
    return work


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    background_tasks: BackgroundTasks,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    ジョブのステータスをポーリングする（フロントは3秒ごとに呼ぶ）。

    GLB保存完了と同時に status=done をコミットしてマーケットに即反映する。
    STL変換は BackgroundTasks で非同期実行し、失敗しても作品には影響しない。
    """
    result = await db.execute(select(Work).where(Work.task_id == task_id))
    work = result.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    # すでに完了・失敗済みならTripo3D APIを叩かない
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
        tripo_data = await get_tripo_task_status(task_id)
        progress = tripo_data.get("progress", 0)
        new_status = tripo_data.get("status", "processing")
        glb_url_from_tripo = tripo_data.get("glb_url")

        if glb_url_from_tripo and not work.glb_url:
            # ─── ① GLBをダウンロードしてFirebaseに保存 ────────────────────
            print(f"🔄 GLBダウンロード中: {glb_url_from_tripo}", flush=True)
            async with httpx.AsyncClient(timeout=120.0) as client:
                glb_resp = await client.get(glb_url_from_tripo)
                glb_resp.raise_for_status()
                glb_bytes = glb_resp.content

            firebase_glb_url = await upload_to_storage(
                glb_bytes, f"models/{work.user_id}/{task_id}.glb"
            )
            work.glb_url = firebase_glb_url
            print(f"✅ GLB保存完了 (Firebase): {task_id}", flush=True)

            # ─── ② GLB保存直後に status=done でコミット（マーケット即反映） ─
            # STL変換が重くてクラッシュしても、ここですでにDBが確定している
            work.status = "done"
            await db.commit()
            await db.refresh(work)
            print(f"✅ status=done コミット済み（マーケット反映）: {task_id}", flush=True)

            # ─── ③ STL変換はバックグラウンドで実行（失敗してもdoneは保持） ─
            background_tasks.add_task(
                _convert_and_save_stl,
                work.id, glb_bytes, work.user_id, task_id
            )

        elif new_status == "failed" and work.status != "failed":
            # Tripo3D側でfailed になった場合
            work.status = "failed"
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
