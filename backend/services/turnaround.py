"""
サービス: Gemini API によるフィギュア複面投影図生成
4方向を1回の API 呼び出しで1枚のシートとして生成することで
ポーズ・プロポーション・スケールの一貫性を保証する。
"""
import base64
import io
import os

from google import genai
from google.genai import types
from PIL import Image

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

_MODEL = "gemini-3.1-flash-image-preview"

# 4パネルを1枚の画像として生成するプロンプト
# 複数回呼び出すとポーズが不一致になるため、必ず1回で全ビューを生成する
_SHEET_PROMPT = (
    "You are a professional character designer. "
    "Create a single image containing a 4-panel orthographic reference sheet "
    "for 3D character modeling, based on the reference image provided.\n\n"

    "LAYOUT: One horizontal row with exactly 4 panels labeled below each:\n"
    "  [ FRONT ]  [ SIDE R ]  [ SIDE L ]  [ BACK ]\n\n"

    "POSE REQUIREMENTS (critical for 3D reconstruction):\n"
    "- A-pose in ALL 4 panels: arms at 45° from body, palms facing forward\n"
    "- Legs straight, feet slightly apart\n"
    "- IDENTICAL pose across all 4 panels — only the viewing angle changes\n\n"

    "PROJECTION REQUIREMENTS:\n"
    "- Orthographic projection (no perspective distortion)\n"
    "- Parallel lines remain parallel\n"
    "- Same scale and proportions in all 4 panels\n\n"

    "STYLE:\n"
    "- Reproduce the exact character design from the reference image\n"
    "- Same hair, outfit, colors, and accessories\n"
    "- Clean flat illustration style suitable for 3D modeling reference\n"
    "- Pure white background, no shadows, no gradients\n"
    "- Thin border lines between panels"
)


async def generate_turnaround_image(image_bytes: bytes) -> bytes:
    """
    元画像から4方向の複面投影図を1回の API 呼び出しで生成する。
    1枚のシート画像（4パネル横並び）を返す。
    split_turnaround() で4分割して Tripo3D に渡す。
    Returns: PNG バイト列
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY が設定されていません。Render の環境変数に追加してください。")

    client = genai.Client(api_key=GEMINI_API_KEY)

    # 入力画像を PNG に統一
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    png_buf = io.BytesIO()
    img.save(png_buf, format="PNG")
    png_bytes = png_buf.getvalue()

    print("🎨 Gemini で複面投影図シートを生成中 (1 call)...", flush=True)

    response = await client.aio.models.generate_content(
        model=_MODEL,
        contents=[
            types.Part.from_bytes(data=png_bytes, mime_type="image/png"),
            types.Part.from_text(text=_SHEET_PROMPT),
        ],
        config=types.GenerateContentConfig(
            response_modalities=["image"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            raw = part.inline_data.data
            result = raw if isinstance(raw, bytes) else base64.b64decode(raw)
            print("✅ 複面投影図シート生成完了 (Gemini)", flush=True)
            return result

    raise ValueError("Gemini から画像が返ってきませんでした")


def split_turnaround(image_bytes: bytes) -> list[bytes]:
    """
    4パネルシートを均等に4分割して返す。
    Returns: [front_bytes, right_bytes, left_bytes, back_bytes]
    """
    img = Image.open(io.BytesIO(image_bytes))
    w, h = img.size
    segment = w // 4

    views = []
    for i in range(4):
        view = img.crop((i * segment, 0, min((i + 1) * segment, w), h))
        buf = io.BytesIO()
        view.save(buf, format="PNG")
        views.append(buf.getvalue())
    return views
