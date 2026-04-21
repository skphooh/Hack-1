"""
サービス: Tripo3D API連携（実写写真→3D変換）
APIキーが設定されていれば実際に呼び出し、未設定ならモックを返す。
"""
import os

import httpx

TRIPO3D_API_BASE = "https://api.tripo3d.ai/v2/openapi"
TRIPO3D_API_KEY = os.getenv("TRIPO3D_API_KEY", "")


async def generate_3d_tripo(image_bytes: bytes) -> str:
    """
    実写写真をTripo3D APIに送り、task_idを返す。
    APIキー未設定の場合はモックのtask_idを返す。
    """
    if not TRIPO3D_API_KEY:
        # 開発用モック（APIキーなしで動作確認できる）
        return "mock_task_tripo_000"

    headers = {"Authorization": f"Bearer {TRIPO3D_API_KEY}"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Step 1: 画像をアップロードしてimage_tokenを取得
        upload_resp = await client.post(
            f"{TRIPO3D_API_BASE}/upload",
            headers=headers,
            files={"file": ("image.png", image_bytes, "image/png")},
        )
        upload_resp.raise_for_status()
        image_token = upload_resp.json()["data"]["image_token"]

        # Step 2: 3D生成タスクを作成してtask_idを取得
        task_resp = await client.post(
            f"{TRIPO3D_API_BASE}/task",
            headers={**headers, "Content-Type": "application/json"},
            json={
                "type": "image_to_model",
                "file": {"type": "png", "file_token": image_token},
            },
        )
        task_resp.raise_for_status()
        return task_resp.json()["data"]["task_id"]


async def get_tripo_task_status(task_id: str) -> dict:
    """
    Tripo3D のジョブステータスをポーリングする。
    returns: {"status": "done"|"processing"|"failed", "progress": 0-100, "glb_url": str|None}
    """
    if not TRIPO3D_API_KEY or task_id.startswith("mock_"):
        return {"status": "done", "progress": 100, "glb_url": None}

    headers = {"Authorization": f"Bearer {TRIPO3D_API_KEY}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{TRIPO3D_API_BASE}/task/{task_id}",
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()["data"]

    # Tripo3D のステータスを内部ステータスにマッピング
    tripo_status = data.get("status", "")
    if tripo_status == "success":
        status = "done"
    elif tripo_status in ("failed", "cancelled"):
        status = "failed"
    else:
        status = "processing"

    progress = data.get("progress", 0)

    # 完了時: output.model から GLB URL を取得
    glb_url = None
    output = data.get("output") or data.get("result") or {}
    if isinstance(output, dict):
        glb_url = output.get("model") or output.get("glb_url") or output.get("pbr_model")

    return {"status": status, "progress": progress, "glb_url": glb_url}
