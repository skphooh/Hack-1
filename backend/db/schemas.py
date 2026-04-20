"""
Pydantic スキーマ（APIのリクエスト・レスポンス型定義）
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# ===== ユーザー =====

class UserResponse(BaseModel):
    """ユーザー情報レスポンス"""
    id: UUID
    firebase_uid: str
    display_name: Optional[str]
    is_creator: bool
    has_printer: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ===== 作品 =====

class WorkCreate(BaseModel):
    """作品登録リクエスト"""
    title: str
    genre: Optional[str] = None
    is_official: bool = False
    price: int = 0
    task_id: Optional[str] = None


class WorkResponse(BaseModel):
    """作品情報レスポンス"""
    id: UUID
    user_id: UUID
    title: str
    genre: Optional[str]
    is_official: bool
    price: int
    thumbnail_url: Optional[str]
    stl_url: Optional[str]
    glb_url: Optional[str]
    task_id: Optional[str]
    status: str
    likes_count: int
    downloads: int
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkListResponse(BaseModel):
    """作品一覧レスポンス（ページネーション付き）"""
    items: list[WorkResponse]
    total: int
    page: int
    per_page: int


# ===== いいね =====

class LikeResponse(BaseModel):
    """いいね操作レスポンス"""
    liked: bool         # True=いいね追加, False=いいね解除
    likes_count: int    # 操作後のいいね数


# ===== ジョブ =====

class GenerateRequest(BaseModel):
    """3D生成ジョブ開始リクエスト"""
    # モード: "photo"=実写(Tripo3D) / "anime"=イラスト(Wonder3D)
    mode: str = "photo"
    title: str = "新しい作品"
    genre: Optional[str] = None


class TaskStatusResponse(BaseModel):
    """ジョブステータスレスポンス"""
    task_id: str
    status: str          # pending / processing / done / failed
    progress: int = 0    # 進捗 0〜100
    glb_url: Optional[str] = None
    stl_url: Optional[str] = None
    error: Optional[str] = None


# ===== Depth推定 =====

class DepthResponse(BaseModel):
    """Depth推定レスポンス"""
    depth_image_url: str  # Depthマップ画像URL
