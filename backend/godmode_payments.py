"""Fixed-price GODMODE checkout. No access restrictions or account changes.

Paid state is always verified with Stripe, never inferred from a return URL.
The existing webhook can record the same receipt once its signing secret is
configured; browser/native return verification works independently.
"""
import asyncio
import os
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import UUID

import stripe
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, ValidationError

load_dotenv()
GODMODE_AMOUNT = 3396
GODMODE_CURRENCY = "usd"
PRODUCT = "godmode"


class GodmodeCheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["godmode"]
    request_id: UUID
    return_uri: str | None = None


def validate_return_uri(uri):
    if not uri:
        return None
    parsed = urlsplit(uri)
    valid_app = parsed.scheme == "godmodesound" and parsed.netloc == "godmode" and parsed.path in ("", "/")
    valid_expo = parsed.scheme in ("exp", "exps") and bool(parsed.netloc) and parsed.path.endswith("/--/godmode")
    if not (valid_app or valid_expo) or parsed.query or parsed.fragment or parsed.username or parsed.password or any(ord(c) < 32 for c in uri):
        raise HTTPException(400, "Invalid app return address")
    return uri


def public_origin(request):
    configured = os.environ.get("APP_PUBLIC_URL")
    parsed = urlsplit(configured or str(request.base_url))
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(503, "Checkout return address is not configured")
    return urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))


async def create_godmode_checkout(request: Request, body: dict, db, api_key=None):
    try:
        order = GodmodeCheckoutRequest.model_validate(body)
    except ValidationError as error:
        raise HTTPException(422, "Invalid GODMODE checkout request") from error
    native_return = validate_return_uri(order.return_uri)
    origin = public_origin(request)
    request_id = str(order.request_id)
    if native_return:
        base = f"{origin}/api/sound/godmode/return?request_id={request_id}"
        success, cancel = base + "&result=success", base + "&result=cancel"
    else:
        success = f"{origin}/godmode?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel = f"{origin}/godmode?checkout=cancel"
    key = api_key or os.environ.get("STRIPE_SECRET_KEY")
    if not key:
        raise HTTPException(503, "Checkout is not configured")
    try:
        session = await asyncio.to_thread(
            stripe.checkout.Session.create, api_key=key,
            mode="payment", payment_method_types=["card"],
            line_items=[{"price_data": {"currency": GODMODE_CURRENCY, "unit_amount": GODMODE_AMOUNT, "product_data": {"name": "GODMODE", "description": "GODMODE SOUND — one-time purchase"}}, "quantity": 1}],
            success_url=success, cancel_url=cancel,
            metadata={"product": PRODUCT, "request_id": request_id},
            payment_intent_data={"metadata": {"product": PRODUCT}},
            idempotency_key=f"godmode-{request_id}",
        )
    except stripe.StripeError as error:
        raise HTTPException(502, "Stripe checkout is temporarily unavailable") from error
    await db.godmode_checkouts.update_one(
        {"_id": session.id}, {"$setOnInsert": {"session_id": session.id, "request_id": request_id, "return_uri": native_return, "created_at": datetime.now(timezone.utc).isoformat()}}, upsert=True,
    )
    return {"url": session.url, "session_id": session.id, "amount_total": GODMODE_AMOUNT, "currency": GODMODE_CURRENCY, "livemode": session.livemode}


async def record_godmode_payment(session, db):
    if session.get("metadata", {}).get("product") != PRODUCT:
        raise HTTPException(400, "This session is not a GODMODE purchase")
    if session.get("mode") != "payment" or session.get("amount_total") != GODMODE_AMOUNT or session.get("currency") != GODMODE_CURRENCY:
        raise HTTPException(400, "Unexpected GODMODE purchase amount")
    if session.get("payment_status") != "paid":
        return {"status": "expired" if session.get("status") == "expired" else "unpaid", "product": "GODMODE", "amount_total": GODMODE_AMOUNT, "currency": GODMODE_CURRENCY}
    receipt = {"session_id": session["id"], "product": "GODMODE", "amount_cents": GODMODE_AMOUNT, "currency": GODMODE_CURRENCY, "payment_intent": session.get("payment_intent"), "email": (session.get("customer_details") or {}).get("email"), "livemode": session.get("livemode"), "purchased_at": datetime.now(timezone.utc).isoformat()}
    # String _id is unique; concurrent webhook/return calls cannot create duplicates.
    await db.godmode_purchases.update_one({"_id": session["id"]}, {"$setOnInsert": receipt}, upsert=True)
    return {"status": "paid", "product": "GODMODE", "session_id": session["id"], "amount_total": GODMODE_AMOUNT, "currency": GODMODE_CURRENCY}


def godmode_router(db):
    router = APIRouter(prefix="/api/sound/godmode")

    @router.get("/status/{session_id}")
    async def payment_status(session_id: str):
        if not session_id.startswith(("cs_live_", "cs_test_")) or len(session_id) > 255:
            raise HTTPException(400, "Invalid checkout session")
        try:
            session = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id, api_key=os.environ.get("STRIPE_SECRET_KEY"))
        except stripe.InvalidRequestError as error:
            raise HTTPException(404, "Checkout session not found") from error
        except stripe.StripeError as error:
            raise HTTPException(502, "Unable to check payment with Stripe") from error
        return await record_godmode_payment(session, db)

    @router.get("/return")
    async def app_return(request_id: UUID, result: Literal["success", "cancel"]):
        order = await db.godmode_checkouts.find_one({"request_id": str(request_id)}, {"_id": 0, "return_uri": 1, "session_id": 1})
        if not order or not order.get("return_uri"):
            raise HTTPException(404, "App return not found")
        uri = validate_return_uri(order["return_uri"])
        parsed = urlsplit(uri)
        query = urlencode([*parse_qsl(parsed.query), ("checkout", result), ("session_id", order["session_id"])])
        return RedirectResponse(urlunsplit((parsed.scheme, parsed.netloc, parsed.path, query, "")), status_code=303)

    return router