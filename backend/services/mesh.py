"""
サービス: trimesh を使ったGLB/OBJ→STL変換・メッシュ修復
"""
import io

import trimesh


async def convert_to_stl(file_bytes: bytes, extension: str) -> bytes:
    """
    GLBまたはOBJのバイト列を受け取り、STLバイト列に変換して返す。
    trimesh の fill_holes / fix_normals で自動メッシュ修復も行う。
    """
    # バイト列からメッシュをロード
    file_obj = io.BytesIO(file_bytes)
    mesh = trimesh.load(file_obj, file_type=extension)

    # CompositeSceneの場合はメッシュを結合
    if isinstance(mesh, trimesh.Scene):
        mesh = mesh.dump(concatenate=True)

    # メッシュ修復: 穴埋め・法線修正
    trimesh.repair.fill_holes(mesh)
    trimesh.repair.fix_normals(mesh)

    # STLとしてエクスポート
    stl_bytes = mesh.export(file_type="stl")
    return stl_bytes
