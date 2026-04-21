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
        return "mock_task_tripo_000"

    headers = {"Authorization": f"Bearer {TRIPO3D_API_KEY}"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Step 1: STS エンドポイントで画像をアップロード（最新仕様）
        upload_resp = await client.post(
            f"{TRIPO3D_API_BASE}/upload/sts",
            headers=headers,
            files={"file": ("image.png", image_bytes, "image/png")},
        )
        print(f"📤 Upload status: {upload_resp.status_code}", flush=True)
        if not upload_resp.is_success:
            print(f"❌ Upload error: {upload_resp.text}", flush=True)
        upload_resp.raise_for_status()

        upload_data = upload_resp.json()
        print(f"📤 Upload response: {upload_data}", flush=True)
        data = upload_data.get("data", {})

        # STSレスポンスからobjectまたはimage_tokenを取得
        object_info = data.get("object")
        image_token = data.get("image_token")

        # Step 2: 3D生成タスクを作成
        if object_info:
            task_body = {
                "type": "image_to_model",
                "file": {"object": object_info},
                "model_version": "v2.5-20240925",
            }
        elif image_token:
            task_body = {
                "type": "image_to_model",
                "file": {"type": "png", "file_token": image_token},
                "model_version": "v2.5-20240925",
            }
        else:
            raise ValueError(f"Unexpected upload response: {upload_data}")

        task_resp = await client.post(
            f"{TRIPO3D_API_BASE}/task",
            headers={**headers, "Content-Type": "application/json"},
            json=task_body,
        )
        print(f"🚀 Task status: {task_resp.status_code}", flush=True)
        if not task_resp.is_success:
            print(f"❌ Task error: {task_resp.text}", flush=True)
        task_resp.raise_for_status()

        task_id = task_resp.json()["data"]["task_id"]
        print(f"✅ Task started: {task_id}", flush=True)
        return task_id


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

    tripo_status = data.get("status", "")
    if tripo_status == "success":
        status = "done"
    elif tripo_status in ("failed", "cancelled"):
        status = "failed"
    else:
        status = "processing"

    progress = data.get("progress", 0)

    glb_url = None
    output = data.get("output") or data.get("result") or {}
    if isinstance(output, dict):
        glb_url = (
            output.get("model")
            or output.get("glb_url")
            or output.get("pbr_model")
        )

    print(f"📊 Task {task_id}: {status} ({progress}%) glb={glb_url}", flush=True)
    return {"status": status, "progress": progress, "glb_url": glb_url}