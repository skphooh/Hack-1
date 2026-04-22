"""
サービス: GPT-4o + DALL-E 3 によるターンアラウンドシート生成
"""
import base64
import io
import os

import openai
from PIL import Image

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


async def generate_turnaround_image(image_bytes: bytes) -> str:
    """
    アップロード画像からキャラクターのターンアラウンドシートを生成する。
    GPT-4o でキャラクター説明を取得し、DALL-E 3 で正面・横・後ろの3ビューを生成。
    Returns: DALL-E 3 が返す一時画像URL
    """
    if not OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY が設定されていません。Render の環境変数に OPENAI_API_KEY を追加してください。"
        )

    client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
    b64 = base64.b64encode(image_bytes).decode()

    # Step 1: GPT-4o でキャラクター説明を生成（英語で詳細に）
    analysis = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Describe this character for a 3D reference turnaround sheet. "
                            "Cover: art style (anime/realistic/etc), body proportions, "
                            "hair (color, length, style), outfit (colors, details), "
                            "accessories, color palette. Max 80 words. English only."
                        ),
                    },
                ],
            }
        ],
        max_tokens=150,
    )
    description = analysis.choices[0].message.content or "anime character"
    print(f"🎨 ターンアラウンド用キャラ説明: {description[:60]}...", flush=True)

    # Step 2: DALL-E 3 でターンアラウンドシートを生成
    prompt = (
        f"Professional 3D character reference turnaround sheet. "
        f"Exactly three panels arranged horizontally, clearly labeled: "
        f"[FRONT] [SIDE RIGHT] [BACK]. "
        f"Character: {description}. "
        f"Pure white background. Same character in all panels with identical colors, "
        f"proportions, and design. Clean anime style. High quality reference art."
    )

    resp = await client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        n=1,
        size="1792x1024",
        quality="standard",
        response_format="url",
    )

    url = resp.data[0].url
    if not url:
        raise ValueError("DALL-E 3 から画像URLが返ってきませんでした")
    print(f"✅ ターンアラウンド生成完了", flush=True)
    return url


def split_turnaround(image_bytes: bytes) -> list[bytes]:
    """
    ターンアラウンドシート（横3ビュー）を正面・横・後ろの3枚に均等分割する。
    Returns: [front_bytes, side_bytes, back_bytes]
    """
    img = Image.open(io.BytesIO(image_bytes))
    w, h = img.size
    third = w // 3

    views = []
    for i in range(3):
        view = img.crop((i * third, 0, min((i + 1) * third, w), h))
        buf = io.BytesIO()
        view.save(buf, format="PNG")
        views.append(buf.getvalue())
    return views
