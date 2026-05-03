"""
コンペティション公開API + 管理API
"""
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Competition

router = APIRouter()

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")


def _check_admin(pw: Optional[str]):
    if pw != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="管理者権限が必要です")


def _to_dict(c: Competition) -> dict:
    return {
        "id": str(c.id),
        "title": c.title,
        "description": c.description,
        "company_name": c.company_name,
        "company_logo_url": c.company_logo_url,
        "prize": c.prize,
        "deadline": c.deadline.isoformat() if c.deadline else None,
        "status": c.status,
        "created_at": c.created_at.isoformat(),
    }


@router.get("/competitions")
async def list_competitions(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Competition).order_by(Competition.created_at.desc())
    if status:
        q = q.where(Competition.status == status)
    result = await db.execute(q)
    return {"items": [_to_dict(c) for c in result.scalars().all()]}


@router.post("/competitions")
async def create_competition(
    body: dict,
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    comp = Competition(
        title=body["title"],
        description=body.get("description"),
        company_name=body["company_name"],
        company_logo_url=body.get("company_logo_url"),
        prize=body.get("prize"),
        deadline=datetime.fromisoformat(body["deadline"]) if body.get("deadline") else None,
        status=body.get("status", "active"),
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return _to_dict(comp)


@router.patch("/competitions/{comp_id}")
async def update_competition(
    comp_id: str,
    body: dict,
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    result = await db.execute(select(Competition).where(Competition.id == uuid.UUID(comp_id)))
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Not found")
    for key in ["title", "description", "company_name", "company_logo_url", "prize", "status"]:
        if key in body:
            setattr(comp, key, body[key])
    if "deadline" in body:
        comp.deadline = datetime.fromisoformat(body["deadline"]) if body["deadline"] else None
    await db.commit()
    await db.refresh(comp)
    return _to_dict(comp)


@router.delete("/competitions/{comp_id}")
async def delete_competition(
    comp_id: str,
    x_admin_password: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    _check_admin(x_admin_password)
    result = await db.execute(select(Competition).where(Competition.id == uuid.UUID(comp_id)))
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(comp)
    await db.commit()
    return {"message": "deleted"}
