"""
ルーター: STL変換（/api/convert/stl）
GLBまたはOBJファイルをSTLに変換してダウンロードURLを返す。
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from services.auth import get_current_uid
from services.mesh import convert_to_stl

router = APIRouter()


@router.post("/convert/stl")
async def convert_to_stl_endpoint(
    file: UploadFile = File(..., description="GLBまたはOBJファイル"),
    uid: str = Depends(get_current_uid),
):
    """
    アップロードした GLB / OBJ ファイルを STL に変換して返す。
    trimesh で自動メッシュ修復（fill_holes / fix_normals）も行う。
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="ファイル名が必要です")

    extension = file.filename.rsplit(".", 1)[-1].lower()
    if extension not in ("glb", "obj"):
        raise HTTPException(status_code=400, detail="GLBまたはOBJファイルのみ対応しています")

    file_bytes = await file.read()
    stl_bytes = await convert_to_stl(file_bytes, extension)

    return Response(
        content=stl_bytes,
        media_type="model/stl",
        headers={"Content-Disposition": f"attachment; filename=model.stl"},
    )
