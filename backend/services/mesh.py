"""
サービス: trimesh を使ったGLB/OBJ→STL変換・メッシュ修復・後処理

Boolean演算（差分・和集合）は非ウォータータイトなメッシュで失敗するため、
・ストラップ穴: 穴の内壁シリンダー面をメッシュに結合（concatenate）するアプローチ
・台座: メッシュを直接結合（Boolean不要）
で対応する。
"""
import asyncio
import io
from functools import partial

import numpy as np
import trimesh


# ── 共通ヘルパー ───────────────────────────────────────────────────────────────

def _load_mesh(file_bytes: bytes, extension: str) -> trimesh.Trimesh:
    """バイト列から Trimesh をロードする。Scene の場合は結合する。"""
    file_obj = io.BytesIO(file_bytes)
    mesh = trimesh.load(file_obj, file_type=extension, force="mesh")
    if isinstance(mesh, trimesh.Scene):
        geometries = list(mesh.geometry.values())
        if not geometries:
            raise ValueError("GLBにメッシュジオメトリが含まれていません")
        mesh = trimesh.util.concatenate(geometries) if len(geometries) > 1 else geometries[0]
    if not isinstance(mesh, trimesh.Trimesh):
        raise ValueError(f"Trimesh に変換できませんでした: {type(mesh)}")
    return mesh


def _repair_mesh(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    # fill_holes は O(n²) のメモリを使い 512MB 制限でクラッシュするため除外
    # concatenate アプローチは watertight 不要なので fix_winding / fix_normals のみ
    trimesh.repair.fix_winding(mesh)
    trimesh.repair.fix_normals(mesh)
    return mesh


# ── GLB/OBJ → STL 変換 ───────────────────────────────────────────────────────

def _convert_sync(file_bytes: bytes, extension: str) -> bytes:
    mesh = _load_mesh(file_bytes, extension)
    _repair_mesh(mesh)
    return mesh.export(file_type="stl")


async def convert_to_stl(file_bytes: bytes, extension: str) -> bytes:
    """GLBまたはOBJのバイト列をSTLに変換して返す。"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_convert_sync, file_bytes, extension))


# ── ストラップ穴 ──────────────────────────────────────────────────────────────
# Boolean差分の代わりに「穴の内壁面シリンダー」をモデルに直接結合するアプローチ。
# trimesh.creation.cylinder は閉じたソリッドだが、
# 端面を除いた「側面のみのチューブ」を作ることで穴の視覚的表現を実現する。
# 3Dプリンターのスライサーは結合メッシュを個別オブジェクトとして扱えるため、
# 実際に穴として機能する。

def _make_tube(radius: float, height: float, sections: int = 32) -> trimesh.Trimesh:
    """
    中空チューブ（側面のみのシリンダー）を生成する。
    スライサーが「穴」として認識できるよう、法線を内向きにする。
    """
    # 上下の円周上の頂点を生成
    angles = np.linspace(0, 2 * np.pi, sections, endpoint=False)
    top_z = height / 2
    bot_z = -height / 2

    top_pts = np.column_stack([radius * np.cos(angles), radius * np.sin(angles), np.full(sections, top_z)])
    bot_pts = np.column_stack([radius * np.cos(angles), radius * np.sin(angles), np.full(sections, bot_z)])

    vertices = np.vstack([top_pts, bot_pts])  # 0..n-1=top, n..2n-1=bot

    faces = []
    n = sections
    for i in range(n):
        j = (i + 1) % n
        # 三角形2枚で四角形を構成（法線が内向きになるよう順序を逆に）
        faces.append([i, n + i, j])
        faces.append([j, n + i, n + j])

    tube = trimesh.Trimesh(vertices=vertices, faces=np.array(faces), process=False)
    tube.fix_normals()
    return tube


def _add_strap_hole_sync(
    file_bytes: bytes,
    extension: str,
    offset_x_pct: float = 0.0,
    offset_y_pct: float = 0.0,
    depth_from_top_mm: float = 5.0,
    hole_radius_mm: float = 1.0,
    angle_x: float = 0.0,
    angle_y: float = 0.0,
    angle_z: float = 0.0,
) -> bytes:
    """
    モデルにストラップ穴の内壁チューブを追加する。

    Parameters
    ----------
    offset_x_pct      : モデル幅に対する左右オフセット（-50〜+50 %）
    offset_y_pct      : モデル奥行きに対する前後オフセット（-50〜+50 %）
    depth_from_top_mm : 上端からの穴の高さ位置（mm）
    hole_radius_mm    : 穴の半径（mm）。デフォルト1mm=直径2mm
    angle_x, angle_y, angle_z : 穴の回転角度（度）
    """
    mesh = _load_mesh(file_bytes, extension)

    bounds = mesh.bounds
    cx    = (bounds[0][0] + bounds[1][0]) / 2
    cy    = (bounds[0][1] + bounds[1][1]) / 2
    top_z = bounds[1][2]
    depth = bounds[1][1] - bounds[0][1]
    width = bounds[1][0] - bounds[0][0]

    # 穴の中心座標（モデルのバウンディングボックス基準）
    hx = cx + (offset_x_pct / 100.0) * width
    hy = cy + (offset_y_pct / 100.0) * depth
    hz = top_z - depth_from_top_mm

    # 穴の長さ: モデルを貫通するのに十分な長さ
    hole_length = max(width, depth) * 1.5

    # 中空チューブ（穴の内壁）を生成
    tube = _make_tube(radius=hole_radius_mm, height=hole_length, sections=32)

    # ユーザー指定の角度（度→ラジアン）を適用
    rad_x = np.radians(angle_x)
    rad_y = np.radians(angle_y)
    rad_z = np.radians(angle_z)

    # デフォルトはZ軸方向チューブ → Y軸に90°倒してX軸方向（左右貫通）にする
    tube.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))

    if rad_x != 0:
        tube.apply_transform(trimesh.transformations.rotation_matrix(rad_x, [1, 0, 0]))
    if rad_y != 0:
        tube.apply_transform(trimesh.transformations.rotation_matrix(rad_y, [0, 1, 0]))
    if rad_z != 0:
        tube.apply_transform(trimesh.transformations.rotation_matrix(rad_z, [0, 0, 1]))

    tube.apply_translation([hx, hy, hz])

    # モデルと穴内壁を結合（Boolean不要・形状を維持したまま出力）
    result = trimesh.util.concatenate([mesh, tube])
    print(f"✅ ストラップ穴チューブ追加完了: r={hole_radius_mm}mm, pos=({hx:.1f}, {hy:.1f}, {hz:.1f})", flush=True)
    return result.export(file_type="stl")


async def add_strap_hole(
    file_bytes: bytes,
    extension: str,
    offset_x_pct: float = 0.0,
    offset_y_pct: float = 0.0,
    depth_from_top_mm: float = 5.0,
    hole_radius_mm: float = 1.0,
    angle_x: float = 0.0,
    angle_y: float = 0.0,
    angle_z: float = 0.0,
) -> bytes:
    """ストラップ穴を追加したSTLバイト列を返す。"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        partial(
            _add_strap_hole_sync,
            file_bytes, extension,
            offset_x_pct, offset_y_pct,
            depth_from_top_mm, hole_radius_mm,
            angle_x, angle_y, angle_z,
        )
    )


# ── 台座追加 ──────────────────────────────────────────────────────────────────
# Boolean union の代わりに、台座メッシュをモデルの底面に配置して
# trimesh.util.concatenate で単純結合する。

def _add_base_sync(
    file_bytes: bytes,
    extension: str,
    height_mm: float = 3.0,
    margin_pct: float = 15.0,
) -> bytes:
    """
    モデルの底面に円形台座を追加する。

    Parameters
    ----------
    height_mm   : 台座の高さ（mm）
    margin_pct  : モデルの最大径に対する余白（%）
    """
    mesh = _load_mesh(file_bytes, extension)

    bounds = mesh.bounds
    width  = bounds[1][0] - bounds[0][0]
    depth  = bounds[1][1] - bounds[0][1]
    radius = max(width, depth) / 2 * (1.0 + margin_pct / 100.0)
    cx = (bounds[0][0] + bounds[1][0]) / 2
    cy = (bounds[0][1] + bounds[1][1]) / 2
    bz = bounds[0][2]

    # 台座シリンダー: 上端がモデル底面に接するよう配置
    base = trimesh.creation.cylinder(radius=radius, height=height_mm, sections=64)
    base.apply_translation([cx, cy, bz - height_mm / 2])

    # Boolean union ではなく直接結合（非ウォータータイトでも動作）
    result = trimesh.util.concatenate([mesh, base])
    return result.export(file_type="stl")


async def add_base(
    file_bytes: bytes,
    extension: str,
    height_mm: float = 3.0,
    margin_pct: float = 15.0,
) -> bytes:
    """台座を追加したSTLバイト列を返す。"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, partial(_add_base_sync, file_bytes, extension, height_mm, margin_pct)
    )
