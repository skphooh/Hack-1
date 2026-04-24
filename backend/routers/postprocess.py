"""
ルーター: 3Dモデル後処理（ストラップ穴・台座）
POST /api/works/{work_id}/strap-hole  → STLファイルを直接レスポンスで返す
POST /api/works/{work_id}/base        → STLファイルを直接レスポンスで返す

Firebase への保存・DB更新は行わない。
ユーザーはその場でダウンロードするだけ。
"""
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Work
from services.auth import get_current_uid
from services.mesh import add_base, add_strap_hole

router = APIRouter()


async def _download_model(url: str) -> bytes:
    """Firebase StorageからGLB/STLをダウンロードして返す。"""
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
    offset_x: float = Query(0.0, description="X方向オフセット（モデル幅の%。-50〜50）"),
    offset_y: float = Query(0.0, description="Y方向オフセット（モデル奥行きの%。-50〜50）"),
    depth_mm: float = Query(5.0, description="上端からの穴の深さ（mm）"),
    radius_mm: float = Query(1.0, description="穴の半径（mm）。1.0=直径2mm"),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    既存作品のGLB/STLにストラップ穴を開け、STLファイルとして直接返す。
    Firebase/DBへの保存は行わない。ユーザーがその場でダウンロードする。
    """
    work = await _get_work_or_404(work_id, db)

    source_url = work.glb_url or work.stl_url
    if not source_url:
        raise HTTPException(status_code=400, detail="3Dモデルデータがありません")

    extension = "glb" if work.glb_url else "stl"
    model_bytes = await _download_model(source_url)

    try:
        stl_bytes = await add_strap_hole(
            model_bytes, extension,
            offset_x_pct=offset_x,
            offset_y_pct=offset_y,
            depth_from_top_mm=depth_mm,
            hole_radius_mm=radius_mm,
        )
    except Exception as e:
        print(f"❌ ストラップ穴追加失敗: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"ストラップ穴の追加に失敗しました: {e}")

    safe_title = (work.title or "model").replace(" ", "_")
    filename = f"{safe_title}_hole_r{radius_mm}mm.stl"
    print(f"✅ ストラップ穴STL生成完了（直接返却）: {filename}", flush=True)

    return Response(
        content=stl_bytes,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/works/{work_id}/base")
async def add_base_endpoint(
    work_id: UUID,
    height_mm: float = Query(3.0, description="台座の高さ（mm）"),
    margin_pct: float = Query(15.0, description="モデル最大径に対する余白（%）"),
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    既存作品のGLB/STLに円形台座を追加し、STLファイルとして直接返す。
    Firebase/DBへの保存は行わない。ユーザーがその場でダウンロードする。
    """
    work = await _get_work_or_404(work_id, db)

    source_url = work.glb_url or work.stl_url
    if not source_url:
        raise HTTPException(status_code=400, detail="3Dモデルデータがありません")

    extension = "glb" if work.glb_url else "stl"
    model_bytes = await _download_model(source_url)

    try:
        stl_bytes = await add_base(model_bytes, extension, height_mm=height_mm, margin_pct=margin_pct)
    except Exception as e:
        print(f"❌ 台座追加失敗: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"台座の追加に失敗しました: {e}")

    safe_title = (work.title or "model").replace(" ", "_")
    filename = f"{safe_title}_base_{height_mm}mm.stl"
    print(f"✅ 台座付きSTL生成完了（直接返却）: {filename}", flush=True)

    return Response(
        content=stl_bytes,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
