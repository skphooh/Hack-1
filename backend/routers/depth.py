"""
ルーター: Depth推定（/api/depth）
即時プレビュー用。Depth Anything V2 を呼び出す。
"""
from fastapi import APIRouter, File, HTTPException, UploadFile

from db.schemas import DepthResponse
from services.depth import estimate_depth

router = APIRouter()


@router.post("/depth", response_model=DepthResponse)
async def depth_estimation(
    file: UploadFile = File(..., description="Depth推定する画像ファイル"),
):
    """
    画像をアップロードするとDepthマップ画像URLを即時返す。
    認証不要（プレビューはログイン前でも表示）。
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="画像ファイルを送信してください")

    image_bytes = await file.read()
    depth_image_url = await estimate_depth(image_bytes)

    return DepthResponse(depth_image_url=depth_image_url)
