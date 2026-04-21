"""
ルーター: Depth推定（/api/depth）
即時プレビュー用。Depth Anything V2 を呼び出す。
"""
from fastapi import APIRouter, File, HTTPException, UploadFile

from db.schemas import DepthResponse
from services.depth import estimate_depth

router = APIRouter()

# HuggingFace API 未設定時に返すフォールバック画像（グレー 1px PNG）
_FALLBACK_DEPTH_IMAGE = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


@router.post("/depth", response_model=DepthResponse)
async def depth_estimation(
    file: UploadFile = File(..., description="Depth推定する画像ファイル"),
):
    """
    画像をアップロードするとDepthマップ画像URLを即時返す。
    認証不要（プレビューはログイン前でも表示）。
    外部API失敗時はフォールバック画像を返す（500エラーにしない）。
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="画像ファイルを送信してください")

    image_bytes = await file.read()

    try:
        depth_image_url = await estimate_depth(image_bytes)
    except Exception as e:
        # HuggingFace API 失敗時はフォールバック画像を返す（プレビューは必須機能ではないため）
        print(f"⚠️ Depth 推定失敗（フォールバック使用）: {e}", flush=True)
        depth_image_url = _FALLBACK_DEPTH_IMAGE

    return DepthResponse(depth_image_url=depth_image_url)
