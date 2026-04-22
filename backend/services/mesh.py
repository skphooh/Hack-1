"""
サービス: trimesh を使ったGLB/OBJ→STL変換・メッシュ修復
"""
import asyncio
import io
from functools import partial

import trimesh


def _convert_sync(file_bytes: bytes, extension: str) -> bytes:
    """同期版の変換処理（run_in_executor から呼ぶ）"""
    file_obj = io.BytesIO(file_bytes)
    mesh = trimesh.load(file_obj, file_type=extension, force="mesh")

    # Sceneが返った場合はジオメトリを結合
    if isinstance(mesh, trimesh.Scene):
        geometries = list(mesh.geometry.values())
        if not geometries:
            raise ValueError("GLBにメッシュジオメトリが含まれていません")
        mesh = trimesh.util.concatenate(geometries) if len(geometries) > 1 else geometries[0]

    if not isinstance(mesh, trimesh.Trimesh):
        raise ValueError(f"Trimesh に変換できませんでした: {type(mesh)}")

    # メッシュ修復: 穴埋め・法線修正
    trimesh.repair.fill_holes(mesh)
    trimesh.repair.fix_normals(mesh)

    stl_bytes = mesh.export(file_type="stl")
    return stl_bytes


async def convert_to_stl(file_bytes: bytes, extension: str) -> bytes:
    """
    GLBまたはOBJのバイト列を受け取り、STLバイト列に変換して返す。
    trimesh の fill_holes / fix_normals で自動メッシュ修復も行う。
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_convert_sync, file_bytes, extension))
