"""
サービス: Tripo3D API連携（実写写真→3D変換）
APIキーが設定されていれば実際に呼び出し、未設定ならモックを返す。
"""
import os

import httpx

TRIPO3D_API_BASE = "https://api.tripo3d.ai/v2/openapi"
TRIPO3D_API_KEY = os.getenv("TRIPO3D_API_KEY", "")


async def _upload_image(client: httpx.AsyncClient, headers: dict, image_bytes: bytes, filename: str = "image.png") -> dict:
    """画像をTripo3D STSにアップロードしてファイル参照情報を返す。"""
    upload_resp = await client.post(
        f"{TRIPO3D_API_BASE}/upload/sts",
        headers=headers,
        files={"file": (filename, image_bytes, "image/png")},
    )
    print(f"📤 Upload status: {upload_resp.status_code}", flush=True)
    if not upload_resp.is_success:
        print(f"❌ Upload error: {upload_resp.text}", flush=True)
    upload_resp.raise_for_status()

    data = upload_resp.json().get("data", {})
    object_info = data.get("object")
    image_token = data.get("image_token")

    if object_info:
        return {"object": object_info}
    elif image_token:
        return {"type": "png", "file_token": image_token}
    else:
        raise ValueError(f"Unexpected upload response: {upload_resp.json()}")


async def generate_3d_tripo(image_bytes: bytes, quality: str = "standard") -> str:
    """
    実写写真をTripo3D APIに送り、task_idを返す。
    quality="high" の場合はテクスチャ・PBRを有効化する。
    APIキー未設定の場合はモックのtask_idを返す。
    """
    if not TRIPO3D_API_KEY:
        return "mock_task_tripo_000"

    headers = {"Authorization": f"Bearer {TRIPO3D_API_KEY}"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        file_ref = await _upload_image(client, headers, image_bytes)

        task_body: dict = {"type": "image_to_model", "file": file_ref}
        if quality == "high":
            task_body["texture"] = True
            task_body["pbr"] = True

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


async def generate_3d_tripo_multiview(image_bytes_list: list[bytes]) -> str:
    """
    複数アングルの画像をTripo3D multiview_to_model で処理してtask_idを返す。
    失敗した場合は最初の画像だけで通常生成にフォールバックする。
    """
    if not TRIPO3D_API_KEY:
        return "mock_task_tripo_multiview_000"

    headers = {"Authorization": f"Bearer {TRIPO3D_API_KEY}"}

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            file_refs = []
            for i, img_bytes in enumerate(image_bytes_list):
                ref = await _upload_image(client, headers, img_bytes, f"view_{i}.png")
                file_refs.append(ref)

            task_resp = await client.post(
                f"{TRIPO3D_API_BASE}/task",
                headers={**headers, "Content-Type": "application/json"},
                json={"type": "multiview_to_model", "files": file_refs},
            )
            if task_resp.is_success:
                task_id = task_resp.json()["data"]["task_id"]
                print(f"✅ Multiview task started: {task_id}", flush=True)
                return task_id
            print(f"⚠️ Multiview task failed ({task_resp.status_code}), falling back to single image", flush=True)
        except Exception as e:
            print(f"⚠️ Multiview upload failed: {e}, falling back to single image", flush=True)

        # フォールバック: 正面ビューのみで通常生成
        ref = await _upload_image(client, headers, image_bytes_list[0])
        task_resp = await client.post(
            f"{TRIPO3D_API_BASE}/task",
            headers={**headers, "Content-Type": "application/json"},
            json={"type": "image_to_model", "file": ref},
        )
        task_resp.raise_for_status()
        task_id = task_resp.json()["data"]["task_id"]
        print(f"✅ Fallback single-image task started: {task_id}", flush=True)
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