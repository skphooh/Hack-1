"""
サービス: Gemini API によるフィギュア複面投影図生成
元画像を参照して front / right / left / back の4方向を並列生成し、
横並びシートに合成して返す。3D変換は Tripo3D multiview で行う。
"""
import asyncio
import base64
import io
import os

from google import genai
from google.genai import types
from PIL import Image

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Gemini 画像生成モデル
_MODEL = "gemini-3.1-flash-image-preview"

# 生成する4方向（順序は Tripo3D multiview の入力順に合わせる）
_VIEWS = [
    "front view",
    "right side view",
    "left side view",
    "back view",
]

# フィギュア生成プロンプトテンプレート（Google AI Studio で動作確認済みのプロンプトを踏襲）
_PROMPT_TEMPLATE = (
    "Create a 1/7 scale commercialized figurine of the character in the picture, "
    "{view} only, in a realistic style, isolated on a plain white background. "
    "The figurine has a round transparent acrylic base, with no text on the base. "
    "Show only the figurine, with no other objects or environment visible."
)


async def _generate_single_view(
    client: genai.Client,
    png_bytes: bytes,
    view: str,
) -> bytes:
    """1方向のフィギュア画像を Gemini で生成する"""
    prompt = _PROMPT_TEMPLATE.format(view=view)

    response = await client.aio.models.generate_content(
        model=_MODEL,
        contents=[
            types.Part.from_bytes(data=png_bytes, mime_type="image/png"),
            types.Part.from_text(text=prompt),
        ],
        config=types.GenerateContentConfig(
            response_modalities=["image"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            raw = part.inline_data.data
            # SDK バージョンによって bytes / base64 文字列の両方がありうる
            return raw if isinstance(raw, bytes) else base64.b64decode(raw)

    raise ValueError(f"Gemini から {view} の画像が返ってきませんでした")


async def generate_turnaround_image(image_bytes: bytes) -> bytes:
    """
    元画像から4方向（front/right/left/back）のフィギュア投影図を並列生成し、
    横並びシートとして返す。
    Returns: PNG バイト列（4枚横並び）
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY が設定されていません。Render の環境変数に追加してください。")

    client = genai.Client(api_key=GEMINI_API_KEY)

    # 入力画像を PNG に統一
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    png_buf = io.BytesIO()
    img.save(png_buf, format="PNG")
    png_bytes = png_buf.getvalue()

    print(f"🎨 Gemini でフィギュア {len(_VIEWS)} ビュー並列生成開始...", flush=True)

    # 4方向を並列生成
    results = await asyncio.gather(
        *[_generate_single_view(client, png_bytes, view) for view in _VIEWS],
        return_exceptions=True,
    )

    # エラーチェック
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            raise ValueError(f"{_VIEWS[i]} の生成に失敗しました: {r}")

    view_images = [Image.open(io.BytesIO(b)).convert("RGB") for b in results]

    # 全ビューを同じサイズに揃えて横に並べる
    max_w = max(vi.width for vi in view_images)
    max_h = max(vi.height for vi in view_images)
    sheet = Image.new("RGB", (max_w * len(view_images), max_h), (255, 255, 255))
    for i, vi in enumerate(view_images):
        vi_resized = vi.resize((max_w, max_h), Image.LANCZOS)
        sheet.paste(vi_resized, (i * max_w, 0))

    sheet_buf = io.BytesIO()
    sheet.save(sheet_buf, format="PNG")
    print("✅ ターンアラウンドシート生成完了 (Gemini)", flush=True)
    return sheet_buf.getvalue()


def split_turnaround(image_bytes: bytes) -> list[bytes]:
    """
    ターンアラウンドシート（横4ビュー）を4枚に均等分割する。
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
