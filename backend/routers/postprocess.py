"""
ルーター: 3Dモデル後処理（ストラップ穴・台座）
POST /api/works/{work_id}/strap-hole
POST /api/works/{work_id}/base
"""
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Work
from services.auth import get_current_uid
from services.mesh import add_base, add_strap_hole
from services.storage import upload_to_storage

router = APIRouter()


async def _download_model(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


async def _get_work_or_404(work_id: UUID, db: AsyncSession) -> Work:
    result = await db.execute(select(Work).where(Work.id == work_id))
    work = result.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="作品が見つかりません")
    return work


@router.post("/works/{work_id}/strap-hole")
async def add_strap_hole_endpoint(
    work_id: UUID,
    position: str = Query(
        "top_center",
        description="穴の位置: top_center / top_left / top_right",
    ),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    既存作品のGLB/STLにストラップ穴（直径2mm）を開け、
    別ファイルとしてFirebase Storageに保存してURLを返す。
    """
    work = await _get_work_or_404(work_id, db)

    source_url = work.glb_url or work.stl_url
    if not source_url:
        raise HTTPException(status_code=400, detail="3Dモデルデータがありません")

    extension = "glb" if work.glb_url else "stl"
    model_bytes = await _download_model(source_url)

    try:
        stl_bytes = await add_strap_hole(model_bytes, extension, position)
    except Exception as e:
        print(f"❌ ストラップ穴追加失敗: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"ストラップ穴の追加に失敗しました: {e}")

    storage_path = f"stl/{work.user_id}/{work_id}_strap_{position}.stl"
    stl_url = await upload_to_storage(stl_bytes, storage_path)
    print(f"✅ ストラップ穴STL保存: {storage_path}", flush=True)
    return {"stl_url": stl_url}


@router.post("/works/{work_id}/base")
async def add_base_endpoint(
    work_id: UUID,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    既存作品のGLB/STLに円形台座（高さ3mm）を追加し、
    別ファイルとしてFirebase Storageに保存してURLを返す。
    """
    work = await _get_work_or_404(work_id, db)

    source_url = work.glb_url or work.stl_url
    if not source_url:
        raise HTTPException(status_code=400, detail="3Dモデルデータがありません")

    extension = "glb" if work.glb_url else "stl"
    model_bytes = await _download_model(source_url)

    try:
        stl_bytes = await add_base(model_bytes, extension)
    except Exception as e:
        print(f"❌ 台座追加失敗: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"台座の追加に失敗しました: {e}")

    storage_path = f"stl/{work.user_id}/{work_id}_base.stl"
    stl_url = await upload_to_storage(stl_bytes, storage_path)
    print(f"✅ 台座付きSTL保存: {storage_path}", flush=True)
    return {"stl_url": stl_url}
