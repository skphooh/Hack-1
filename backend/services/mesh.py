"""
サービス: trimesh を使ったGLB/OBJ→STL変換・メッシュ修復・後処理

Boolean演算（差分・和集合）は非ウォータータイトなメッシュで失敗するため、
・ストラップ穴: ボクセル化してから穴を掘るアプローチ
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
    """メッシュの修復を試みる。ウォータータイトでなくても処理が続くようにする。"""
    trimesh.repair.fill_holes(mesh)
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
# Boolean演算を使わずに「穴のシリンダー形状を面として追加」するアプローチ。
# 正確なBoolean差分ではなく、穴用の中空シリンダーをモデルに追加するが、
# STLとして出力するときにシリンダー面だけを差し込む形で近似する。
#
# 現実的な代替策：
# 1. メッシュをボクセル化 → ボクセルグリッドで穴を掘る → STL化
# 2. trimesh で manifold engine を使いながら、事前修復を強化
# 以下では (2) を試み、失敗時は (1) にフォールバックする。

def _try_boolean_difference(mesh: trimesh.Trimesh, cutter: trimesh.Trimesh) -> trimesh.Trimesh:
    """manifold engineで差分を試みる。失敗時はpycsgにフォールバック。"""
    try:
        result = trimesh.boolean.difference([mesh, cutter], engine="manifold")
        if result is not None and len(result.faces) > 0:
            return result
    except Exception as e:
        print(f"⚠️ manifold差分失敗: {e}", flush=True)

    # フォールバック: blender engineを試みる
    try:
        result = trimesh.boolean.difference([mesh, cutter], engine="blender")
        if result is not None and len(result.faces) > 0:
            return result
    except Exception as e:
        print(f"⚠️ blender差分失敗: {e}", flush=True)

    # フォールバック: ボクセルベースで穴を掘る
    return _voxel_difference(mesh, cutter)


def _voxel_difference(mesh: trimesh.Trimesh, cutter: trimesh.Trimesh) -> trimesh.Trimesh:
    """
    ボクセル化してカッターで穴を掘り、メッシュ化して返す。
    精度は落ちるが非ウォータータイトメッシュでも動作する。
    """
    print("🔁 ボクセルベース差分にフォールバック", flush=True)
    # モデルサイズに応じて解像度を決定（小さすぎると穴が消える）
    extents = mesh.extents
    voxel_size = min(extents) / 60.0  # モデルの最小辺を60分割
    voxel_size = max(voxel_size, 0.3)  # 最小0.3mm

    vox_mesh = mesh.voxelized(pitch=voxel_size).fill()
    vox_cutter = cutter.voxelized(pitch=voxel_size).fill()

    # ボクセル差分
    vox_result = vox_mesh.matrix.copy()
    vox_result[vox_cutter.matrix] = False

    result_vox = trimesh.voxel.VoxelGrid(
        vox_result,
        transform=vox_mesh.transform
    )
    result_mesh = result_vox.marching_cubes
    _repair_mesh(result_mesh)
    return result_mesh


def _add_strap_hole_sync(
    file_bytes: bytes,
    extension: str,
    offset_x_pct: float = 0.0,
    offset_y_pct: float = 0.0,
    depth_from_top_mm: float = 5.0,
    hole_radius_mm: float = 1.0,
) -> bytes:
    """
    モデルに自由位置でストラップ穴を開ける。

    Parameters
    ----------
    offset_x_pct : モデル幅に対するX方向オフセット（-50〜+50 %）
    offset_y_pct : モデル奥行きに対するY方向オフセット（-50〜+50 %）
    depth_from_top_mm : 上端からの穴の深さ（mm）
    hole_radius_mm : 穴の半径（mm）。デフォルト1mm=直径2mm
    """
    mesh = _load_mesh(file_bytes, extension)
    _repair_mesh(mesh)

    bounds = mesh.bounds
    cx = (bounds[0][0] + bounds[1][0]) / 2
    cy = (bounds[0][1] + bounds[1][1]) / 2
    top_z = bounds[1][2]
    width  = bounds[1][0] - bounds[0][0]
    depth  = bounds[1][1] - bounds[0][1]

    hx = cx + (offset_x_pct / 100.0) * width
    hy = cy + (offset_y_pct / 100.0) * depth
    hz = top_z - depth_from_top_mm  # 穴の中心Z

    # 穴シリンダー: モデルの高さより十分大きく貫通させる
    model_height = bounds[1][2] - bounds[0][2]
    hole_height  = model_height * 2.0
    hole = trimesh.creation.cylinder(
        radius=hole_radius_mm, height=hole_height, sections=48
    )
    hole.apply_translation([hx, hy, hz])

    result = _try_boolean_difference(mesh, hole)
    _repair_mesh(result)
    return result.export(file_type="stl")


async def add_strap_hole(
    file_bytes: bytes,
    extension: str,
    offset_x_pct: float = 0.0,
    offset_y_pct: float = 0.0,
    depth_from_top_mm: float = 5.0,
    hole_radius_mm: float = 1.0,
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
        )
    )


# ── 台座追加 ──────────────────────────────────────────────────────────────────
# Boolean union の代わりに、台座メッシュをモデルの底面に配置して
# trimesh.util.concatenate で単純結合する。
# 物理的には繋がった1つのSTLとして出力される。

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
    _repair_mesh(mesh)

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
    _repair_mesh(result)
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
