"""
サービス: trimesh を使ったGLB/OBJ→STL変換・メッシュ修復・後処理
"""
import asyncio
import io
from functools import partial

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


# ── GLB/OBJ → STL 変換 ───────────────────────────────────────────────────────

def _convert_sync(file_bytes: bytes, extension: str) -> bytes:
    mesh = _load_mesh(file_bytes, extension)
    trimesh.repair.fill_holes(mesh)
    trimesh.repair.fix_normals(mesh)
    return mesh.export(file_type="stl")


async def convert_to_stl(file_bytes: bytes, extension: str) -> bytes:
    """GLBまたはOBJのバイト列をSTLに変換して返す。"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_convert_sync, file_bytes, extension))


# ── ストラップ穴 ──────────────────────────────────────────────────────────────

_STRAP_POSITIONS = {
    "top_center": (0.0,   0.0),
    "top_left":   (-0.25, 0.0),
    "top_right":  ( 0.25, 0.0),
}


def _add_strap_hole_sync(
    file_bytes: bytes, extension: str, position: str = "top_center"
) -> bytes:
    """モデルの上部に直径2mm(半径1mm)のストラップ穴を開ける。"""
    mesh = _load_mesh(file_bytes, extension)
    bounds = mesh.bounds
    cx = (bounds[0][0] + bounds[1][0]) / 2
    cy = (bounds[0][1] + bounds[1][1]) / 2
    top_z = bounds[1][2]
    width = bounds[1][0] - bounds[0][0]

    ox, oy = _STRAP_POSITIONS.get(position, (0.0, 0.0))
    hx = cx + ox * width
    hy = cy + oy * width

    # 上端から5mm下を穴の中心に配置、長さ15mmで貫通
    hole = trimesh.creation.cylinder(radius=1.0, height=15.0, sections=32)
    hole.apply_translation([hx, hy, top_z - 8.0])

    result = trimesh.boolean.difference([mesh, hole], engine="manifold")
    trimesh.repair.fix_normals(result)
    return result.export(file_type="stl")


async def add_strap_hole(
    file_bytes: bytes, extension: str, position: str = "top_center"
) -> bytes:
    """ストラップ穴を追加したSTLバイト列を返す。"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, partial(_add_strap_hole_sync, file_bytes, extension, position)
    )


# ── 台座追加 ──────────────────────────────────────────────────────────────────

def _add_base_sync(file_bytes: bytes, extension: str) -> bytes:
    """モデルの底面に円形台座（高さ3mm）を追加する。"""
    mesh = _load_mesh(file_bytes, extension)
    bounds = mesh.bounds
    width = bounds[1][0] - bounds[0][0]
    depth = bounds[1][1] - bounds[0][1]
    radius = max(width, depth) / 2 * 1.15  # 15%余白
    cx = (bounds[0][0] + bounds[1][0]) / 2
    cy = (bounds[0][1] + bounds[1][1]) / 2
    bz = bounds[0][2]

    base = trimesh.creation.cylinder(radius=radius, height=3.0, sections=64)
    base.apply_translation([cx, cy, bz - 1.5])

    result = trimesh.boolean.union([mesh, base], engine="manifold")
    trimesh.repair.fix_normals(result)
    return result.export(file_type="stl")


async def add_base(file_bytes: bytes, extension: str) -> bytes:
    """台座を追加したSTLバイト列を返す。"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_add_base_sync, file_bytes, extension))
