"""
管理者専用API（X-Admin-Password ヘッダー認証）
"""
import os
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.database import get_db
from db.models import Report, User, Work, Purchase

router = APIRouter()

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")


def _check_admin(pw: Optional[str]):
    if pw != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")


# ─── 統計 ─────────────────��───────────────────────────────────────────────────

@router.get("/admin/stats")
async def get_stats(
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    user_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    work_count = (await db.execute(select(func.count(Work.id)).where(Work.status == "done"))).scalar_one()
    purchase_count = (await db.execute(select(func.count(Purchase.id)))).scalar_one()
    return {"user_count": user_count, "work_count": work_count, "purchase_count": purchase_count}


# ─── ユーザー管理 ────────────────��─────────────────────────��──────────────────

@router.get("/admin/users")
async def list_users(
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(200))
    users = result.scalars().all()
    items = []
    for u in users:
        cnt = (await db.execute(select(func.count(Work.id)).where(Work.user_id == u.id))).scalar_one()
        items.append({
            "id": str(u.id),
            "firebase_uid": u.firebase_uid,
            "display_name": u.display_name,
            "is_creator": u.is_creator,
            "has_printer": u.has_printer,
            "work_count": cnt,
            "created_at": u.created_at.isoformat(),
        })
    return {"items": items}


@router.patch("/admin/users/{user_id}")
async def update_user(
    user_id: str,
    body: dict,
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for key in ["is_creator", "has_printer", "display_name"]:
        if key in body:
            setattr(user, key, body[key])
    await db.commit()
    return {"id": str(user.id), "is_creator": user.is_creator, "has_printer": user.has_printer}


# ─── 作品管理 ────────────────────────────────────���────────────────────────────

@router.get("/admin/works")
async def list_admin_works(
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    result = await db.execute(
        select(Work).options(selectinload(Work.user))
        .where(Work.status == "done")
        .order_by(Work.created_at.desc())
        .limit(200)
    )
    works = result.scalars().all()
    return {"items": [{
        "id": str(w.id),
        "title": w.title,
        "genre": w.genre,
        "is_official": w.is_official,
        "price": w.price,
        "likes_count": w.likes_count,
        "downloads": w.downloads,
        "thumbnail_url": w.thumbnail_url,
        "author": w.user.display_name if w.user else None,
        "created_at": w.created_at.isoformat(),
    } for w in works]}


@router.patch("/admin/works/{work_id}")
async def update_admin_work(
    work_id: str,
    body: dict,
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    result = await db.execute(select(Work).where(Work.id == UUID(work_id)))
    work = result.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    for key in ["is_official", "price", "status", "title", "genre"]:
        if key in body:
            setattr(work, key, body[key])
    await db.commit()
    return {"id": str(work.id), "is_official": work.is_official, "price": work.price}


@router.delete("/admin/works/{work_id}")
async def delete_admin_work(
    work_id: str,
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    result = await db.execute(select(Work).where(Work.id == UUID(work_id)))
    work = result.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    await db.delete(work)
    await db.commit()
    return {"message": "deleted"}


# ─── 通報管理 ────────────────────────────────────────────────────────────────

@router.get("/admin/reports")
async def list_reports(
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    result = await db.execute(select(Report).order_by(Report.created_at.desc()).limit(200))
    reports = result.scalars().all()
    return {"items": [{
        "id": str(r.id),
        "workId": str(r.work_id),
        "workTitle": r.work_title or "不明",
        "reason": r.reason,
        "status": r.status,
        "date": r.created_at.strftime("%Y-%m-%d") if r.created_at else "",
    } for r in reports]}


@router.patch("/admin/reports/{report_id}")
async def update_report(
    report_id: str,
    body: dict,
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    result = await db.execute(select(Report).where(Report.id == UUID(report_id)))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if "status" in body:
        report.status = body["status"]
    await db.commit()
    return {"id": str(report.id), "status": report.status}
