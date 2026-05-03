"""
購入フロー: Stripe Checkout セッション作成・Webhook 処理・購入確認
"""
import os
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Purchase, Work
from services.auth import get_current_uid, get_or_create_user

router = APIRouter()

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _get_stripe():
    if not STRIPE_SECRET_KEY:
        return None
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


# ─── 購入状態確認 ─────────────────────────────────────────────────────────────

@router.get("/purchases/check/{work_id}")
async def check_purchase(
    work_id: str,
    authorization: str = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not authorization:
        return {"purchased": False}
    try:
        uid = await get_current_uid(authorization)
    except HTTPException:
        return {"purchased": False}

    from db.models import User
    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()
    if not user:
        return {"purchased": False}

    result = await db.execute(
        select(Purchase).where(
            Purchase.user_id == user.id,
            Purchase.work_id == uuid.UUID(work_id),
            Purchase.status == "completed",
        )
    )
    return {"purchased": result.scalar_one_or_none() is not None}


# ─── 自分の購入一覧 ───────────────────────────────────────────────────────────

@router.get("/purchases/my")
async def get_my_purchases(
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    from db.models import User
    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    result = await db.execute(
        select(Purchase)
        .where(Purchase.user_id == user.id, Purchase.status == "completed")
        .order_by(Purchase.created_at.desc())
    )
    purchases = result.scalars().all()

    items = []
    for p in purchases:
        wr = await db.execute(select(Work).where(Work.id == p.work_id))
        work = wr.scalar_one_or_none()
        if work:
            items.append({
                "id": str(p.id),
                "work_id": str(p.work_id),
                "amount": p.amount,
                "created_at": p.created_at.isoformat(),
                "work": {
                    "id": str(work.id),
                    "title": work.title,
                    "thumbnail_url": work.thumbnail_url,
                    "price": work.price,
                    "genre": work.genre,
                    "glb_url": work.glb_url,
                    "stl_url": work.stl_url,
                },
            })
    return {"items": items}


# ─── Stripe Checkout セッション作成 ─────────────────────────────────────────

@router.post("/purchases/checkout")
async def create_checkout(
    body: dict,
    uid: str = Depends(get_current_uid),
    db: AsyncSession = Depends(get_db),
):
    work_id = body.get("work_id")
    if not work_id:
        raise HTTPException(status_code=400, detail="work_id is required")

    wr = await db.execute(select(Work).where(Work.id == uuid.UUID(work_id)))
    work = wr.scalar_one_or_none()
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    if work.price == 0:
        raise HTTPException(status_code=400, detail="This work is free")

    user = await get_or_create_user(uid, db)

    # 既購入確認
    existing = await db.execute(
        select(Purchase).where(
            Purchase.user_id == user.id,
            Purchase.work_id == uuid.UUID(work_id),
            Purchase.status == "completed",
        )
    )
    if existing.scalar_one_or_none():
        return {"mode": "already_purchased", "url": None, "purchased": True}

    stripe = _get_stripe()

    # ── Stripe 未設定時はモックモード（即時完了） ──
    if not stripe:
        purchase = Purchase(
            user_id=user.id,
            work_id=uuid.UUID(work_id),
            amount=work.price,
            stripe_session_id="mock_" + str(uuid.uuid4()),
            status="completed",
        )
        db.add(purchase)
        await db.commit()
        return {"mode": "mock", "url": None, "purchased": True}

    # ── Stripe Checkout セッション作成 ──
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "jpy",
                "product_data": {
                    "name": work.title,
                    "images": [work.thumbnail_url] if work.thumbnail_url else [],
                },
                "unit_amount": work.price,
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{FRONTEND_URL}/works/{work_id}?purchase=success",
        cancel_url=f"{FRONTEND_URL}/works/{work_id}?purchase=cancel",
        metadata={"work_id": work_id, "user_firebase_uid": uid},
    )
    return {"mode": "stripe", "url": session.url, "session_id": session.id}


# ─── Stripe Webhook ───────────────────────────────────────────────────────────

@router.post("/purchases/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    import stripe as stripe_lib

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe_lib.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe_lib.error.SignatureVerificationError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        work_id = session["metadata"].get("work_id")
        user_uid = session["metadata"].get("user_firebase_uid")
        amount = session.get("amount_total", 0)

        if work_id and user_uid:
            from db.models import User
            result = await db.execute(select(User).where(User.firebase_uid == user_uid))
            user = result.scalar_one_or_none()
            if user:
                dup = await db.execute(
                    select(Purchase).where(
                        Purchase.user_id == user.id,
                        Purchase.work_id == uuid.UUID(work_id),
                    )
                )
                if not dup.scalar_one_or_none():
                    db.add(Purchase(
                        user_id=user.id,
                        work_id=uuid.UUID(work_id),
                        amount=amount,
                        stripe_session_id=session["id"],
                        status="completed",
                    ))
                    await db.commit()

    return {"status": "ok"}
