"""
サービス: Wonder3D連携（アニメ・イラスト→3D変換）
HuggingFace Spaces の Wonder3D を gradio_client で呼び出す。
"""
import os
import uuid

HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "")
WONDER3D_SPACE = "flamehaze1115/Wonder3D-demo"


async def generate_3d_wonder(image_bytes: bytes) -> str:
    """
    アニメ・イラスト画像をWonder3D（HuggingFace Spaces）に送り、task_idを返す。
    実際の処理は非同期ポーリングで別途完了を確認する。
    トークン未設定の場合はモックのtask_idを返す。
    """
    if not HUGGINGFACE_TOKEN:
        # 開発用モック
        return f"mock_task_wonder_{uuid.uuid4().hex[:8]}"

    # TODO: APIキー取得後に gradio_client を使って実装する
    # from gradio_client import Client
    # client = Client(WONDER3D_SPACE, hf_token=HUGGINGFACE_TOKEN)
    # result = client.predict(...)
    return f"wonder_{uuid.uuid4().hex[:8]}"
