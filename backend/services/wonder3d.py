"""
サービス: fal.ai TRELLIS連携（アニメ・イラスト・実写共通の画像→3D変換）
HuggingFace Spaceが不安定なため、fal.ai の TRELLIS（超高品質・高速なImage-to-3Dモデル）を使用します。
"""
import base64
import os
import uuid

import httpx

FAL_KEY = os.getenv("FAL_KEY", "")

# fal.ai の TRELLIS キューのベースURL
FAL_QUEUE_BASE = "https://queue.fal.run/fal-ai/trellis"


async def generate_3d_wonder(image_bytes: bytes) -> str:
    """
    画像を fal.ai の TRELLIS に送り、キューの request_id (task_id) を返す。
    キー未設定の場合はモックの task_id を返す。
    """
    if not FAL_KEY:
        # モック（FAL_KEY未設定の場合）
        return f"mock_task_fal_{uuid.uuid4().hex[:8]}"

    headers = {
        "Authorization": f"Key {FAL_KEY}",
        "Content-Type": "application/json",
    }

    # 画像を Base64 Data URLに変換
    b64_str = base64.b64encode(image_bytes).decode('utf-8')
    data_url = f"data:image/png;base64,{b64_str}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        # キューにタスクを登録
        resp = await client.post(
            FAL_QUEUE_BASE,
            headers=headers,
            json={"image_url": data_url},
        )
        
        print(f"🚀 fal.ai TRELLIS リクエスト: {resp.status_code}", flush=True)
        if not resp.is_success:
            print(f"❌ fal.ai Error: {resp.text}", flush=True)
        resp.raise_for_status()

        data = resp.json()
        request_id = data.get("request_id")
        
        print(f"✅ fal.ai タスクID発行: {request_id}", flush=True)
        return request_id


async def get_wonder_task_status(task_id: str) -> dict:
    """
    fal.ai のタスク進捗を確認する（フロントからのポーリングで毎秒〜3秒ごとに呼ばれる）。
    """
    # モックタスクの場合
    if task_id.startswith("mock_"):
        return {"status": "done", "progress": 100, "glb_url": None}
        
    headers = {"Authorization": f"Key {FAL_KEY}"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # ステータス確認
        status_url = f"{FAL_QUEUE_BASE}/requests/{task_id}/status"
        s_resp = await client.get(status_url, headers=headers)
        
        if not s_resp.is_success:
            print(f"⚠️ fal.ai status error: {s_resp.text}", flush=True)
            s_resp.raise_for_status()
            
        s_data = s_resp.json()
        fal_status = s_data.get("status", "")
        
        print(f"📊 fal.ai status: {fal_status}", flush=True)
        
        # キュー進行中
        if fal_status in ("IN_QUEUE", "IN_PROGRESS"):
            return {"status": "processing", "progress": 50, "glb_url": None}
            
        # 失敗
        if fal_status != "COMPLETED":
            return {"status": "failed", "progress": 0, "glb_url": None}
            
        # 完了（COMPLETED）なら結果を取得
        result_url = f"{FAL_QUEUE_BASE}/requests/{task_id}"
        r_resp = await client.get(result_url, headers=headers)
        r_resp.raise_for_status()
        
        r_data = r_resp.json()
        print(f"✅ fal.ai 完了レスポンス: {r_data.keys()}", flush=True)
        
        # モデルファイルURLを取得
        # TRELLIS の出力は通常 r_data["model_file"]["url"]
        glb_url = None
        model_file = r_data.get("model_file")
        if isinstance(model_file, dict):
            glb_url = model_file.get("url")
            
        return {"status": "done", "progress": 100, "glb_url": glb_url}