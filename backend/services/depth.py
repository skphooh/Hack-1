"""
サービス: Depth Anything V2 による深度推定（即時プレビュー用）
"""
import base64
import io
import os

import httpx

HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "")
DEPTH_API_URL = "https://api-inference.huggingface.co/models/depth-anything/Depth-Anything-V2-Small-hf"


async def estimate_depth(image_bytes: bytes) -> str:
    """
    Depth Anything V2 で深度推定し、Depthマップ画像のbase64 Data URLを返す。
    HuggingFaceトークン未設定の場合はモック画像URLを返す。
    """
    if not HUGGINGFACE_TOKEN or "貼り付け" in HUGGINGFACE_TOKEN:
        # 開発用モック: グレー画像のBase64
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

    headers = {"Authorization": f"Bearer {HUGGINGFACE_TOKEN}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            DEPTH_API_URL,
            headers=headers,
            content=image_bytes,
        )
        resp.raise_for_status()
        # レスポンスは画像バイト列
        depth_b64 = base64.b64encode(resp.content).decode()
        return f"data:image/png;base64,{depth_b64}"
