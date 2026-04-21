"""
サービス: Depth Anything V2 による深度推定（即時プレビュー用）
"""
import base64
import os

import httpx

HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "")

# ✅ 修正: 正しいモデルURL（pipeline API形式）
DEPTH_API_URL = "https://router.huggingface.co/hf-inference/models/depth-anything/Depth-Anything-V2-Small-hf"


async def estimate_depth(image_bytes: bytes) -> str:
    """
    Depth Anything V2 で深度推定し、Depthマップ画像のbase64 Data URLを返す。
    HuggingFaceトークン未設定またはAPI失敗時はモック画像URLを返す。
    """
    if not HUGGINGFACE_TOKEN or "貼り付け" in HUGGINGFACE_TOKEN:
        return _mock_depth()

    headers = {
        "Authorization": f"Bearer {HUGGINGFACE_TOKEN}",
        "Content-Type": "application/octet-stream",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                DEPTH_API_URL,
                headers=headers,
                content=image_bytes,
            )
            resp.raise_for_status()
            depth_b64 = base64.b64encode(resp.content).decode()
            return f"data:image/png;base64,{depth_b64}"
    except Exception as e:
        print(f"⚠️ Depth 推定失敗（フォールバック使用）: {e}", flush=True)
        return _mock_depth()


def _mock_depth() -> str:
    """グレー画像のBase64（開発・フォールバック用）"""
    return (
        "data:image/png;base64,"
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC"
        "AAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    )