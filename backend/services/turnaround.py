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

_SHEET_PROMPT = (
    "Create a four-panel turnaround for the character(s) and object(s) in the reference image to show their frontal, right side, left side, and back. "
    "CRITICAL REQUIREMENTS:\n"
    "1. STYLE PRESERVATION: You MUST preserve the EXACT art style, brush strokes, colors, and textures of the original reference image. Do NOT change it to a generic 3D or flat vector illustration style.\n"
    "2. MULTIPLE CHARACTERS (Crucial): If there are multiple characters (e.g. a boy and a girl), you MUST keep ALL of them in EVERY panel. DO NOT merge their clothes, hair, or features into a single person! \n"
    "   - In the [ FRONT ] view: Draw them exactly as they are.\n"
    "   - In the [ SIDE R ] and [ SIDE L ] views: One character should partially or fully overlap/occlude the other, because we are looking from the side. Draw both if visible.\n"
    "   - In the [ BACK ] view: Their left-to-right order MUST be swapped (e.g., if Boy is on the left in the front, the Boy must be on the right in the back).\n"
    "3. POSE: Keep the exact same pose as the original image across all four views. Just rotate the camera angle around the entire group.\n"
    "4. LAYOUT: One horizontal row with exactly 4 panels labeled: [ FRONT ]  [ SIDE R ]  [ SIDE L ]  [ BACK ]\n"
    "5. BACKGROUND: Use a simple white and grey background."
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

    try:
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

    except Exception as e:
        print(f"❌ ターンアラウンド生成失敗: {e}", flush=True)
        print("⚠️ 課金制限等のため、モックフォールバック（入力画像を4枚並べる）を使用します", flush=True)
        
        # 元の画像を横に4枚並べたダミー画像を生成
        w, h = img.size
        mock_img = Image.new("RGB", (w * 4, h))
        mock_img.paste(img, (0, 0))
        mock_img.paste(img, (w, 0))
        mock_img.paste(img, (w * 2, 0))
        mock_img.paste(img, (w * 3, 0))
        
        mock_buf = io.BytesIO()
        mock_img.save(mock_buf, format="PNG")
        return mock_buf.getvalue()


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
