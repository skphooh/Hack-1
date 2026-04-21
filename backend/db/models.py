"""
SQLAlchemy モデル定義（Neon / PostgreSQL）
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, ForeignKey, Integer, String, Text,
    TIMESTAMP, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


def utcnow():
    """タイムゾーン付きの現在UTC時刻を返すヘルパー"""
    return datetime.now(timezone.utc)


class User(Base):
    """ユーザーテーブル"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(Text, unique=True, nullable=False)
    display_name = Column(Text)
    # 出品者フラグ（公式・作家アカウント）
    is_creator = Column(Boolean, default=False)
    # 3Dプリンター保有フラグ（Phase 2: マッチング機能で使用）
    has_printer = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    works = relationship("Work", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="user")


class Work(Base):
    """作品テーブル（3Dモデルデータ）"""
    __tablename__ = "works"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(Text, nullable=False)
    # ジャンル: figure / anime / cosplay / original / official / other
    genre = Column(String(50))
    # 公式アカウントによる出品フラグ
    is_official = Column(Boolean, default=False)
    # 価格（円単位。0=無料）
    price = Column(Integer, default=0)
    thumbnail_url = Column(Text)
    stl_url = Column(Text)
    glb_url = Column(Text)
    # Tripo3D / Wonder3D のジョブID
    task_id = Column(Text)
    # ステータス: pending / processing / done / failed
    status = Column(String(20), default="pending")
    likes_count = Column(Integer, default=0)
    downloads = Column(Integer, default=0)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    user = relationship("User", back_populates="works")
    likes = relationship("Like", back_populates="work", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="work")

    @property
    def author_firebase_uid(self) -> str | None:
        if self.user:
            return self.user.firebase_uid
        return None

class Like(Base):
    """いいねテーブル"""
    __tablename__ = "likes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    # 同一ユーザーが同一作品に複数いいねできないようにユニーク制約
    __table_args__ = (UniqueConstraint("user_id", "work_id", name="uq_like_user_work"),)

    user = relationship("User", back_populates="likes")
    work = relationship("Work", back_populates="likes")


class Purchase(Base):
    """購入履歴テーブル（フロー③: 公式データ販売）"""
    __tablename__ = "purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), nullable=False)
    # 購入時点の価格を記録（後から価格変更されても履歴として残す）
    amount = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=utcnow)

    user = relationship("User", back_populates="purchases")
    work = relationship("Work", back_populates="purchases")
