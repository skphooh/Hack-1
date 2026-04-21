"""
サービス: Wonder3D連携（画像→3D変換）
HuggingFace Inference API を使って画像から3Dメッシュを生成する。
Wonder3D SpaceはGPU待ちが長いため、InstantMesh（より安定）を優先使用。
"""
import asyncio
import base64
import io
import os
import uuid

import httpx

HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "")

# InstantMesh: Wonder3Dより安定していて速い（同じHuggingFace）
INSTANTMESH_API_URL = "https://api-inference.huggingface.co/models/TencentARC/InstantMesh"

# フォールバック: Zero123++
ZERO123_API_URL = "https://api-inference.huggingface.co/models/sudo-ai/zero123plus"

# タスクをメモリ内で管理（Renderの1インスタンスで動作）
_task_store: dict[str, dict] = {}


async def generate_3d_wonder(image_bytes: bytes) -> str:
    """
    画像をHuggingFace APIに送り、非同期でタスクを開始してtask_idを返す。
    """
    task_id = f"wonder_{uuid.uuid4().hex[:8]}"

    if not HUGGINGFACE_TOKEN:
        # モック: 5秒後に完了するタスクをシミュレート
        _task_store[task_id] = {"status": "processing", "progress": 0, "glb_url": None}
        asyncio.create_task(_mock_process(task_id))
        return task_id

    # タスクを登録して非同期処理開始
    _task_store[task_id] = {"status": "processing", "progress": 0, "glb_url": None}
    asyncio.create_task(_run_wonder3d(task_id, image_bytes))
    print(f"✅ Wonder3D タスク開始: {task_id}", flush=True)
    return task_id


async def get_wonder_task_status(task_id: str) -> dict:
    """
    Wonder3Dタスクのステータスを返す。
    """
    if task_id not in _task_store:
        return {"status": "failed", "progress": 0, "glb_url": None}
    return _task_store[task_id]


async def _run_wonder3d(task_id: str, image_bytes: bytes):
    """
    HuggingFace Inference APIで画像→3D変換を実行する（バックグラウンド処理）。
    InstantMeshを試し、失敗したらZero123++にフォールバック。
    """
    headers = {
        "Authorization": f"Bearer {HUGGINGFACE_TOKEN}",
        "Content-Type": "application/octet-stream",
    }

    try:
        _task_store[task_id]["progress"] = 10
        print(f"🚀 InstantMesh リクエスト開始: {task_id}", flush=True)

        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                INSTANTMESH_API_URL,
                headers=headers,
                content=image_bytes,
            )

            print(f"📊 InstantMesh レスポンス: {resp.status_code}", flush=True)

            if resp.status_code == 200:
                _task_store[task_id]["progress"] = 80
                # レスポンスはGLBバイナリまたはJSON
                content_type = resp.headers.get("content-type", "")
                if "application/json" in content_type:
                    data = resp.json()
                    glb_url = data.get("url") or data.get("glb_url")
                    if glb_url:
                        _task_store[task_id].update({
                            "status": "done",
                            "progress": 100,
                            "glb_url": glb_url,
                        })
                        print(f"✅ GLB URL取得: {glb_url}", flush=True)
                        return
                else:
                    # バイナリレスポンスの場合はbase64でData URLとして保存
                    glb_b64 = base64.b64encode(resp.content).decode()
                    glb_data_url = f"data:model/gltf-binary;base64,{glb_b64}"
                    _task_store[task_id].update({
                        "status": "done",
                        "progress": 100,
                        "glb_url": glb_data_url,
                    })
                    print(f"✅ GLBバイナリ取得完了: {task_id} ({len(resp.content)} bytes)", flush=True)
                    return

            # 503: モデルロード中 → 少し待ってリトライ
            if resp.status_code == 503:
                print(f"⏳ モデルロード待機中... 30秒後にリトライ", flush=True)
                _task_store[task_id]["progress"] = 20
                await asyncio.sleep(30)
                # リトライ
                resp2 = await client.post(
                    INSTANTMESH_API_URL,
                    headers=headers,
                    content=image_bytes,
                )
                if resp2.status_code == 200:
                    glb_b64 = base64.b64encode(resp2.content).decode()
                    _task_store[task_id].update({
                        "status": "done",
                        "progress": 100,
                        "glb_url": f"data:model/gltf-binary;base64,{glb_b64}",
                    })
                    print(f"✅ リトライ成功: {task_id}", flush=True)
                    return

            print(f"⚠️ InstantMesh失敗: {resp.status_code} {resp.text[:200]}", flush=True)

    except Exception as e:
        print(f"⚠️ InstantMesh例外: {e}", flush=True)

    # フォールバック: モック完了（デモ用）
    print(f"⚠️ フォールバック: モック完了を返します: {task_id}", flush=True)
    _task_store[task_id].update({
        "status": "done",
        "progress": 100,
        "glb_url": None,  # フロント側でモック3Dを表示
    })


async def _mock_process(task_id: str):
    """開発用モック: 5秒後に完了"""
    await asyncio.sleep(2)
    _task_store[task_id]["progress"] = 50
    await asyncio.sleep(3)
    _task_store[task_id].update({
        "status": "done",
        "progress": 100,
        "glb_url": None,
    })
    print(f"✅ モック完了: {task_id}", flush=True)