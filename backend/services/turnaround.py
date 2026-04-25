"""
サービス: gpt-image-1 によるターンアラウンドシート生成
元画像を images.edit に直接渡すことでデザインを忠実に再現する。
DALL-E 3 (テキスト経由) と異なり、ピクセル情報を参照するため色・衣装・髪型が保持される。
"""
import base64
import io
import os

import openai
from PIL import Image

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


async def generate_turnaround_image(image_bytes: bytes) -> bytes:
    """
    アップロード画像からキャラクターのターンアラウンドシートを生成する。
    gpt-image-1 の images.edit に元画像を直接渡すため、
    テキスト説明経由の DALL-E 3 より色・衣装・髪型が忠実に再現される。
    Returns: PNG バイト列（1536×1024）
    """
    if not OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY が設定されていません。Render の環境変数に OPENAI_API_KEY を追加してください。"
        )

    client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)

    # PNG + RGBA に変換（JPEG・透過なし PNG にも対応。edit API は RGBA PNG が必要）
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    png_buf = io.BytesIO()
    img.save(png_buf, format="PNG")
    png_buf.seek(0)
    png_buf.name = "character.png"

    prompt = (
        "Create a professional 3D character reference turnaround sheet. "
        "Show exactly FOUR panels in a single horizontal row, "
        "each clearly labeled below: [FRONT] [SIDE RIGHT] [SIDE LEFT] [BACK]. "
        "Reproduce THIS EXACT character with perfectly identical: "
        "hair color and hairstyle, outfit colors and every design detail, "
        "skin tone, accessories, body proportions, and art style. "
        "Pure white background. No shadows. Same scale and pose style across all panels."
    )

    resp = await client.images.edit(
        model="gpt-image-1",
        image=png_buf,
        prompt=prompt,
        n=1,
        size="1536x1024",
    )

    b64_data = resp.data[0].b64_json
    if not b64_data:
        raise ValueError("gpt-image-1 から画像データが返ってきませんでした")

    print("✅ ターンアラウンド生成完了 (gpt-image-1)", flush=True)
    return base64.b64decode(b64_data)


def split_turnaround(image_bytes: bytes) -> list[bytes]:
    """
    ターンアラウンドシート（横4ビュー）を正面・右横・左横・後ろの4枚に均等分割する。
    Returns: [front_bytes, side_r_bytes, side_l_bytes, back_bytes]
    """
    img = Image.open(io.BytesIO(image_bytes))
    w, h = img.size
    count = 4
    segment = w // count

    views = []
    for i in range(count):
        view = img.crop((i * segment, 0, min((i + 1) * segment, w), h))
        buf = io.BytesIO()
        view.save(buf, format="PNG")
        views.append(buf.getvalue())
    return views
