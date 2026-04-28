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
from scipy import ndimage


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
    scipy.ndimage を使った networkx 不要の実装。
    """
    print("🔁 ボクセルベース差分にフォールバック", flush=True)
    extents = mesh.extents
    voxel_size = min(extents) / 50.0
    voxel_size = max(voxel_size, 2.0)  # OOM対策のため最小解像度を2.0mmに下げる

    # surface voxels のみ取得し、scipy で内部を flood-fill して solid にする
    vox_mesh   = mesh.voxelized(pitch=voxel_size)
    vox_cutter = cutter.voxelized(pitch=voxel_size)

    def _solidify(vg: trimesh.voxel.VoxelGrid) -> np.ndarray:
        """surface VoxelGrid を scipy で内部充填して solid boolean 配列を返す。"""
        # binary_fill_holes は穴（空洞）を埋める → 外側が False, 内部が True
        return ndimage.binary_fill_holes(vg.matrix)

    solid_mesh   = _solidify(vox_mesh)
    solid_cutter = _solidify(vox_cutter)

    # ボクセル差分（numpy操作のみ）
    vox_result = solid_mesh.copy()
    try:
        c_origin = np.round(
            (vox_cutter.origin - vox_mesh.origin) / voxel_size
        ).astype(int)
        c_shape = solid_cutter.shape
        # numpy スライスで一括処理（ループより高速）
        mx_s = max(c_origin[0], 0)
        my_s = max(c_origin[1], 0)
        mz_s = max(c_origin[2], 0)
        cx_s = mx_s - c_origin[0]
        cy_s = my_s - c_origin[1]
        cz_s = mz_s - c_origin[2]
        mx_e = min(c_origin[0] + c_shape[0], vox_result.shape[0])
        my_e = min(c_origin[1] + c_shape[1], vox_result.shape[1])
        mz_e = min(c_origin[2] + c_shape[2], vox_result.shape[2])
        cx_e = cx_s + (mx_e - mx_s)
        cy_e = cy_s + (my_e - my_s)
        cz_e = cz_s + (mz_e - mz_s)
        if mx_e > mx_s and my_e > my_s and mz_e > mz_s:
            vox_result[mx_s:mx_e, my_s:my_e, mz_s:mz_e] &= ~solid_cutter[cx_s:cx_e, cy_s:cy_e, cz_s:cz_e]
    except Exception as e:
        print(f"⚠️ ボクセル差分計算エラー: {e}", flush=True)

    result_vox = trimesh.voxel.VoxelGrid(vox_result, transform=vox_mesh.transform)
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
    angle_x: float = 0.0,
    angle_y: float = 0.0,
    angle_z: float = 0.0,
) -> bytes:
    """
    モデルにストラップ穴を開ける。

    Parameters
    ----------
    offset_x_pct      : モデル幅に対する左右オフセット（-50〜+50 %）
    offset_y_pct      : モデル奥行きに対する前後オフセット（-50〜+50 %）
    depth_from_top_mm : 上端からの穴の高さ位置（mm）
    hole_radius_mm    : 穴の半径（mm）。デフォルト1mm=直径2mm
    angle_x, angle_y, angle_z : 穴の回転角度（度）
    """
    mesh = _load_mesh(file_bytes, extension)
    _repair_mesh(mesh)

    bounds = mesh.bounds
    cx    = (bounds[0][0] + bounds[1][0]) / 2
    cy    = (bounds[0][1] + bounds[1][1]) / 2
    top_z = bounds[1][2]
    depth = bounds[1][1] - bounds[0][1]
    width = bounds[1][0] - bounds[0][0]

    # 穴の中心座標
    hx = cx + (offset_x_pct / 100.0) * width
    hy = cy + (offset_y_pct / 100.0) * depth
    hz = top_z - depth_from_top_mm

    # 穴シリンダー: 初期状態はZ軸方向
    hole_length = max(width, depth) * 3.0  # 十分な長さ
    hole = trimesh.creation.cylinder(
        radius=hole_radius_mm, height=hole_length, sections=32 # セクション数を減らしてメモリ節約
    )
    
    # ユーザー指定の角度（度 -> ラジアン）
    rad_x = np.radians(angle_x)
    rad_y = np.radians(angle_y)
    rad_z = np.radians(angle_z)

    # デフォルトはZ軸方向なので、まずY軸に90度倒してX軸方向（左右貫通）にする
    hole.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))

    # 追加の回転を適用
    if rad_x != 0: hole.apply_transform(trimesh.transformations.rotation_matrix(rad_x, [1, 0, 0]))
    if rad_y != 0: hole.apply_transform(trimesh.transformations.rotation_matrix(rad_y, [0, 1, 0]))
    if rad_z != 0: hole.apply_transform(trimesh.transformations.rotation_matrix(rad_z, [0, 0, 1]))

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
