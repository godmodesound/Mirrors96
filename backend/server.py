from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import json
import os
import logging
import stripe
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from music_catalog import MIRRORS_RELEASE
from music_streaming import music_router
from godmode_payments import create_godmode_checkout, godmode_router, record_godmode_payment

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'godmodesound')]

# Stripe config
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# Auth config
SECRET_KEY = os.environ.get('JWT_SECRET', 'mirrors-96-godmode-secret-key-432hz')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI()
app.include_router(music_router(db))
app.include_router(godmode_router(db))
api_router = APIRouter(prefix="/api")

# ═══════════════════════════════════
# MODELS
# ═══════════════════════════════════

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class UserRegister(BaseModel):
    email: str
    password: str
    username: str
    display_name: str = ""
    phone: str = ""
    sms_opt_in: bool = False

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    display_name: str
    mirrors_id: str
    phone: str = ""
    sms_opt_in: bool = False
    created_at: str
    saved_configs: list = []

class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None
    sms_opt_in: Optional[bool] = None

class SaveConfigRequest(BaseModel):
    name: str
    config_type: str  # "frequency", "mood", "binaural"
    data: dict

class FrequencyTarget(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    frequency: float
    chakra: str
    timestamp: str = ""

class FrequencyHistoryItem(BaseModel):
    frequency: float
    name: str
    category: str = ""
    note: str = ""

class PTTTransmit(BaseModel):
    channel_id: str
    sender_name: str
    audio_base64: str
    duration: float = 0
    sender_id: str = ""

class PTTChannelCreate(BaseModel):
    name: str
    is_public: bool = True

# CODES Models (enhanced PTT)
class CodesChannelCreate(BaseModel):
    name: str
    channel_type: str = "group"  # group, private, broadcast
    is_public: bool = True
    created_by: str = "anonymous"

class CodesTransmit(BaseModel):
    channel_id: str
    sender_name: str
    audio_base64: str = ""
    text: str = ""
    duration: float = 0
    sender_id: str = ""

class CodesInvite(BaseModel):
    username: str

class CodesMute(BaseModel):
    user_id: str

# ═══════════════════════════════════
# MIRRORS I.D. CONTACTS MODELS
# ═══════════════════════════════════

class MirrorsIdRegister(BaseModel):
    display_name: str
    device_id: str = ""

class MirrorsIdLookup(BaseModel):
    mirrors_id: str

class ContactAdd(BaseModel):
    mirrors_id: str
    nickname: str = ""

class ContactRemove(BaseModel):
    mirrors_id: str

class DirectChirp(BaseModel):
    to_mirrors_id: str
    from_mirrors_id: str
    from_display_name: str
    audio_base64: str = ""
    text: str = ""
    duration: float = 0

# ═══════════════════════════════════
# STORE MODELS
# ═══════════════════════════════════

class StoreAlbumCreate(BaseModel):
    name: str
    artist: str = "VINCE SINNOTT"
    description: str = ""
    price_cents: int = 999
    cover_url: str = ""
    buy_url: str = ""
    tracklist: list = []
    preview_urls: list = []
    download_urls: list = []
    is_published: bool = True

class StoreAlbumUpdate(BaseModel):
    name: Optional[str] = None
    artist: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    cover_url: Optional[str] = None
    buy_url: Optional[str] = None
    tracklist: Optional[list] = None
    preview_urls: Optional[list] = None
    download_urls: Optional[list] = None
    is_published: Optional[bool] = None

# Admin password
ADMIN_PASSWORD = os.environ.get('STORE_ADMIN_PASSWORD', 'godmode96')

# ═══════════════════════════════════
# STORE SEED DATA
# ═══════════════════════════════════

SEED_ALBUMS = [
    {
        "_id": "mirrors",
        **MIRRORS_RELEASE,
        "artist": "VINCE SINNOTT",
        "price_cents": 1299,
        "download_urls": [],
        "is_published": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "_id": "codes",
        "name": "CODES",
        "artist": "VINCE SINNOTT",
        "description": "13 tracks of deep, hypnotic house music. From the ethereal Godmode to the raw energy of Blood Sport — a journey through sound.",
        "price_cents": 1299,
        "cover_url": "https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/lpcyrm06_CODES%20Album%20Cover.jpg",
        "tracklist": ["Godmode","Codes","24k","Lion Heart","Dont Stop","My Mind","Silence","Concrete Jungle","Blood Sport","96","Cooked","Third Eye","Source"],
        "preview_urls": [
            "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4f/8c/32/4f8c32fe-5378-c312-0755-212fe63388fc/mzaf_17829693640304093227.plus.aac.p.m4a",
            "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6b/15/78/6b1578ce-5390-a3ce-ca8b-2cd39914002f/mzaf_1048806144312164392.plus.aac.p.m4a",
        ],
        "download_urls": [],
        "is_published": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "_id": "in-memory-of",
        "name": "IN MEMORY OF",
        "artist": "VINCE SINNOTT",
        "description": "16 tracks. A tribute album weaving house, deep tech, and soulful frequencies. Featuring Layla Colon and Jailani Colon.",
        "price_cents": 999,
        "cover_url": "https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/hlbaomri_%22In%20Memory%20Of%22%20Cover%20Art.jpeg",
        "tracklist": ["Suite 907","The Shelborne","Our City","Yolanda","528 Hz (feat. Layla Colon)","Deja Vu","This Feeling (feat. Jailani Colon)","Trumpets","Le Trip","6th Dimension","Sinnott","Presence","13th Pick","The Force","King Leo","Le Basement"],
        "preview_urls": [
            "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview118/v4/1d/21/fa/1d21fa4a-761a-221f-1f2a-652aab09fd1d/mzaf_5266959012416407129.plus.aac.p.m4a",
        ],
        "download_urls": [],
        "is_published": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "_id": "presence",
        "name": "PRESENCE",
        "artist": "VINCE SINNOTT",
        "description": "Ethereal soundscapes and deep grooves. 5 tracks of presence and vibration.",
        "price_cents": 799,
        "cover_url": "https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/7lcyfgfs_B02A6EBE-FF31-4466-A91C-5FF92392AC80.jpg",
        "tracklist": ["Etheric Template","Le Vision","Leo's House","1990 6","Still N.Y.C"],
        "preview_urls": [],
        "download_urls": [],
        "is_published": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "_id": "13",
        "name": "13",
        "artist": "VINCE SINNOTT",
        "description": "5 tracks of raw, unfiltered sound. Featuring Boogie Dash.",
        "price_cents": 799,
        "cover_url": "https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/zqe6xtbw_photo%20%286%29.JPG",
        "tracklist": ["13Elieve","Leo's House","Lost","The 2nd Coming (feat. Boogie Dash)","The Trip"],
        "preview_urls": [],
        "download_urls": [],
        "is_published": True,
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "_id": "lucid-dreams",
        "name": "LUCID DREAMS",
        "artist": "VINCE SINNOTT",
        "description": "A dream-state journey through frequency and rhythm.",
        "price_cents": 999,
        "cover_url": "https://customer-assets.emergentagent.com/job_ed6a0deb-be55-415b-8702-764f1299165b/artifacts/b23nnhud_B0A66545-E410-4F79-B221-A82B469DBF88.jpg",
        "tracklist": [],
        "preview_urls": [],
        "download_urls": [],
        "is_published": True,
        "created_at": datetime.utcnow().isoformat(),
    },
]

# ═══════════════════════════════════
# STORE / E-COMMERCE ROUTES
# ═══════════════════════════════════

async def seed_store_albums():
    """Seed default albums if store is empty."""
    count = await db.store_albums.count_documents({})
    if count == 0:
        for album in SEED_ALBUMS:
            try:
                await db.store_albums.insert_one(album)
            except Exception:
                pass
    # Versioned catalogue migration: update existing databases, not only empty ones.
    # Explicit metadata fields preserve pricing, purchases, downloads and other albums.
    await db.store_albums.update_one(
        {"_id": "mirrors", "catalog_revision": {"$ne": MIRRORS_RELEASE["catalog_revision"]}},
        {"$set": MIRRORS_RELEASE},
    )

@api_router.get("/store/config")
async def get_store_config():
    """Return publishable key for client-side Stripe."""
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY}

@api_router.get("/store/albums")
async def list_store_albums():
    """List all published albums for sale."""
    await seed_store_albums()
    albums = await db.store_albums.find({"is_published": True}).to_list(50)
    result = []
    for a in albums:
        result.append({
            "id": a["_id"],
            "name": a.get("name", ""),
            "artist": a.get("artist", ""),
            "description": a.get("description", ""),
            "price_cents": a.get("price_cents", 999),
            "cover_url": a.get("cover_url", ""),
            "tracklist": a.get("tracklist", []),
            "preview_urls": a.get("preview_urls", []),
            "created_at": a.get("created_at", ""),
        })
    return {"albums": result}

@api_router.get("/store/albums/{album_id}")
async def get_store_album(album_id: str):
    """Get single album detail."""
    await seed_store_albums()
    a = await db.store_albums.find_one({"_id": album_id})
    if not a:
        raise HTTPException(status_code=404, detail="Album not found")
    return {
        "id": a["_id"],
        "name": a.get("name", ""),
        "artist": a.get("artist", ""),
        "description": a.get("description", ""),
        "price_cents": a.get("price_cents", 999),
        "cover_url": a.get("cover_url", ""),
        "tracklist": a.get("tracklist", []),
        "preview_urls": a.get("preview_urls", []),
        "download_urls": a.get("download_urls", []),
        "buy_url": a.get("buy_url", ""),
        "created_at": a.get("created_at", ""),
    }

@api_router.post("/store/checkout")
async def create_checkout_session(request: Request):
    """Create a Stripe Checkout session for album purchase."""
    body = await request.json()
    album_id = body.get("album_id")
    customer_email = body.get("email", "")
    success_url = body.get("success_url", "")
    cancel_url = body.get("cancel_url", "")

    album = await db.store_albums.find_one({"_id": album_id})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"{album['name']} - {album.get('artist', 'VINCE SINNOTT')}",
                        "description": album.get("description", "Digital Album")[:500],
                        "images": [album["cover_url"]] if album.get("cover_url") else [],
                    },
                    "unit_amount": album.get("price_cents", 999),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            customer_email=customer_email if customer_email else None,
            metadata={
                "album_id": album_id,
                "album_name": album["name"],
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/sound/checkout")
async def create_sound_checkout(request: Request):
    """Create a Stripe Checkout session for Sound page purchases (albums $13, singles $1.96)."""
    body = await request.json()
    if body.get("type") == "godmode":
        return await create_godmode_checkout(request, body, db)
    product_type = body.get("type", "album")  # "album" or "single"
    product_name = body.get("name", "Album")
    artist = body.get("artist", "VINCE SINNOTT")
    cover_url = body.get("cover_url", "")
    success_url = body.get("success_url", "")
    cancel_url = body.get("cancel_url", "")

    if product_type == "single":
        unit_amount = 196   # $1.96
        description = f"Single Track — {product_name}"
    else:
        unit_amount = 3396  # $33.96
        description = f"Full Album — {product_name}"

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"{product_name} — {artist}",
                        "description": description,
                        "images": [cover_url] if cover_url else [],
                    },
                    "unit_amount": unit_amount,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}" if success_url else None,
            cancel_url=cancel_url or None,
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/store/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # Verify webhook signature if secret is set
    if STRIPE_WEBHOOK_SECRET and STRIPE_WEBHOOK_SECRET != "whsec_placeholder":
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except (ValueError, stripe.error.SignatureVerificationError):
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # Live payment notifications must never trust unsigned request bodies.
        raise HTTPException(status_code=503, detail="Stripe payment notifications are not configured")

    event_type = event.get("type", "")

    if event_type == "checkout.session.completed":
        session = event.get("data", {}).get("object", {})
        if session.get("metadata", {}).get("product") == "godmode":
            if not STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET == "whsec_placeholder":
                raise HTTPException(503, "Stripe payment notifications are not configured")
            await record_godmode_payment(session, db)
            return {"received": True}
        album_id = session.get("metadata", {}).get("album_id", "")
        customer_email = session.get("customer_email") or session.get("customer_details", {}).get("email", "")
        payment_intent = session.get("payment_intent", "")
        amount = session.get("amount_total", 0)

        if album_id and customer_email:
            purchase = {
                "_id": str(uuid.uuid4()),
                "album_id": album_id,
                "album_name": session.get("metadata", {}).get("album_name", ""),
                "customer_email": customer_email.lower(),
                "payment_intent": payment_intent,
                "amount_cents": amount,
                "stripe_session_id": session.get("id", ""),
                "status": "completed",
                "created_at": datetime.utcnow().isoformat(),
            }
            await db.store_purchases.insert_one(purchase)

    return {"received": True}

@api_router.get("/store/verify-session/{session_id}")
async def verify_session(session_id: str):
    """Verify a completed checkout session and record purchase."""
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == "paid":
            album_id = session.metadata.get("album_id", "")
            customer_email = session.customer_email or (session.customer_details.email if session.customer_details else "")

            if album_id and customer_email:
                # Check if purchase already recorded
                existing = await db.store_purchases.find_one({"stripe_session_id": session_id})
                if not existing:
                    purchase = {
                        "_id": str(uuid.uuid4()),
                        "album_id": album_id,
                        "album_name": session.metadata.get("album_name", ""),
                        "customer_email": customer_email.lower(),
                        "payment_intent": session.payment_intent or "",
                        "amount_cents": session.amount_total or 0,
                        "stripe_session_id": session_id,
                        "status": "completed",
                        "created_at": datetime.utcnow().isoformat(),
                    }
                    await db.store_purchases.insert_one(purchase)

                return {
                    "status": "paid",
                    "album_id": album_id,
                    "album_name": session.metadata.get("album_name", ""),
                    "email": customer_email,
                }
        return {"status": session.payment_status}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/store/library/{email}")
async def get_user_library(email: str):
    """Get all purchased albums for a user."""
    await seed_store_albums()
    purchases = await db.store_purchases.find(
        {"customer_email": email.lower(), "status": "completed"}
    ).sort("created_at", -1).to_list(100)

    result = []
    for p in purchases:
        # Fetch album details
        album = await db.store_albums.find_one({"_id": p["album_id"]})
        result.append({
            "purchase_id": p["_id"],
            "album_id": p["album_id"],
            "album_name": album.get("name", p.get("album_name", "")) if album else p.get("album_name", ""),
            "amount_cents": p.get("amount_cents", 0),
            "purchased_at": p.get("created_at", ""),
            "cover_url": album.get("cover_url", "") if album else "",
            "tracklist": album.get("tracklist", []) if album else [],
            "download_urls": album.get("download_urls", []) if album else [],
            "preview_urls": album.get("preview_urls", []) if album else [],
        })
    return {"purchases": result, "email": email}

@api_router.get("/store/download/{purchase_id}/{track_index}")
async def secure_download(purchase_id: str, track_index: int):
    """Secure download endpoint — only purchasers can access."""
    purchase = await db.store_purchases.find_one({"_id": purchase_id, "status": "completed"})
    if not purchase:
        raise HTTPException(status_code=403, detail="Purchase not found or not valid")

    album = await db.store_albums.find_one({"_id": purchase["album_id"]})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    download_urls = album.get("download_urls", [])
    if track_index < 0 or track_index >= len(download_urls):
        raise HTTPException(status_code=404, detail="Track not available for download")

    url = download_urls[track_index]
    # Stream file from source URL to client (never expose direct URL)
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(url, follow_redirects=True)
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="File not available")
        track_name = album.get("tracklist", [])[track_index] if track_index < len(album.get("tracklist", [])) else f"track_{track_index}"
        return StreamingResponse(
            iter([resp.content]),
            media_type="audio/mpeg",
            headers={"Content-Disposition": f'attachment; filename="{track_name}.mp3"'}
        )

# ═══════════════════════════════════
# STORE ADMIN ROUTES
# ═══════════════════════════════════

@api_router.post("/store/admin/login")
async def admin_login(request: Request):
    body = await request.json()
    if body.get("password") == ADMIN_PASSWORD:
        return {"authenticated": True}
    raise HTTPException(status_code=401, detail="Invalid password")

@api_router.get("/store/admin/albums")
async def admin_list_albums():
    """List ALL albums (including unpublished) for admin."""
    await seed_store_albums()
    albums = await db.store_albums.find({}).to_list(100)
    result = []
    for a in albums:
        result.append({
            "id": a["_id"],
            "name": a.get("name", ""),
            "artist": a.get("artist", ""),
            "description": a.get("description", ""),
            "price_cents": a.get("price_cents", 999),
            "cover_url": a.get("cover_url", ""),
            "tracklist": a.get("tracklist", []),
            "preview_urls": a.get("preview_urls", []),
            "download_urls": a.get("download_urls", []),
            "is_published": a.get("is_published", True),
            "created_at": a.get("created_at", ""),
        })
    return {"albums": result}

@api_router.post("/store/admin/albums")
async def admin_create_album(album: StoreAlbumCreate):
    album_id = str(uuid.uuid4())[:12]
    doc = {
        "_id": album_id,
        "name": album.name,
        "artist": album.artist,
        "description": album.description,
        "price_cents": album.price_cents,
        "cover_url": album.cover_url,
        "buy_url": album.buy_url,
        "tracklist": album.tracklist,
        "preview_urls": album.preview_urls,
        "download_urls": album.download_urls,
        "is_published": album.is_published,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.store_albums.insert_one(doc)
    return {"id": album_id, "name": album.name}

@api_router.put("/store/admin/albums/{album_id}")
async def admin_update_album(album_id: str, update: StoreAlbumUpdate):
    update_dict = {k: v for k, v in update.dict().items() if v is not None}
    if update_dict:
        await db.store_albums.update_one({"_id": album_id}, {"$set": update_dict})
    album = await db.store_albums.find_one({"_id": album_id})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"id": album_id, "updated": True}

@api_router.delete("/store/admin/albums/{album_id}")
async def admin_delete_album(album_id: str):
    result = await db.store_albums.delete_one({"_id": album_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"deleted": True}

@api_router.get("/store/admin/purchases")
async def admin_list_purchases():
    """List all purchases for admin review."""
    purchases = await db.store_purchases.find({}).sort("created_at", -1).to_list(200)
    result = []
    for p in purchases:
        result.append({
            "id": p["_id"],
            "album_id": p.get("album_id", ""),
            "album_name": p.get("album_name", ""),
            "customer_email": p.get("customer_email", ""),
            "amount_cents": p.get("amount_cents", 0),
            "status": p.get("status", ""),
            "created_at": p.get("created_at", ""),
        })
    return {"purchases": result}

# ═══════════════════════════════════
# PTT CONNECTION MANAGER
# ═══════════════════════════════════

class PTTConnectionManager:
    """Manages WebSocket connections for PTT channels."""
    def __init__(self):
        self.channels: dict[str, list[WebSocket]] = {}

    async def connect(self, channel_id: str, websocket: WebSocket):
        await websocket.accept()
        if channel_id not in self.channels:
            self.channels[channel_id] = []
        self.channels[channel_id].append(websocket)

    def disconnect(self, channel_id: str, websocket: WebSocket):
        if channel_id in self.channels:
            if websocket in self.channels[channel_id]:
                self.channels[channel_id].remove(websocket)
            if not self.channels[channel_id]:
                del self.channels[channel_id]

    async def broadcast(self, channel_id: str, message: dict, exclude: WebSocket = None):
        if channel_id in self.channels:
            dead = []
            for ws in self.channels[channel_id]:
                if ws != exclude:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        dead.append(ws)
            for ws in dead:
                self.disconnect(channel_id, ws)

    def get_active_count(self, channel_id: str) -> int:
        return len(self.channels.get(channel_id, []))

    def get_all_active_counts(self) -> dict:
        return {ch: len(conns) for ch, conns in self.channels.items()}

ptt_manager = PTTConnectionManager()

# ═══════════════════════════════════
# AUTH HELPERS
# ═══════════════════════════════════

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": payload.get("user_id")})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def generate_mirrors_id():
    """Generate a unique MIRRORS ID like M-96-XXXX"""
    short = str(uuid.uuid4())[:8].upper()
    return f"M-96-{short}"

# ═══════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════

@api_router.post("/auth/register")
async def register(user: UserRegister):
    # Validate username
    if not user.username.strip():
        raise HTTPException(status_code=400, detail="Username is required")
    if len(user.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")

    # Check if email exists
    existing = await db.users.find_one({"email": user.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username exists
    existing_username = await db.users.find_one({"username": user.username.strip().lower()})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_password = pwd_context.hash(user.password)
    user_id = str(uuid.uuid4())
    mirrors_id = generate_mirrors_id()

    user_doc = {
        "_id": user_id,
        "email": user.email.lower(),
        "username": user.username.strip().lower(),
        "password": hashed_password,
        "display_name": user.display_name or user.username.strip(),
        "mirrors_id": mirrors_id,
        "phone": user.phone.strip() if user.phone else "",
        "sms_opt_in": user.sms_opt_in,
        "created_at": datetime.utcnow().isoformat(),
        "saved_configs": [],
        "frequency_targets": [],
    }
    await db.users.insert_one(user_doc)

    token = create_access_token({"user_id": user_id, "email": user.email.lower()})
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user.email.lower(),
            "username": user_doc["username"],
            "display_name": user_doc["display_name"],
            "mirrors_id": mirrors_id,
            "phone": user_doc["phone"],
            "sms_opt_in": user_doc["sms_opt_in"],
        }
    }

@api_router.post("/auth/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email.lower()})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"user_id": db_user["_id"], "email": db_user["email"]})
    return {
        "token": token,
        "user": {
            "id": db_user["_id"],
            "email": db_user["email"],
            "username": db_user.get("username", ""),
            "display_name": db_user.get("display_name", ""),
            "mirrors_id": db_user["mirrors_id"],
            "phone": db_user.get("phone", ""),
            "sms_opt_in": db_user.get("sms_opt_in", False),
        }
    }

@api_router.get("/auth/profile")
async def get_profile(user=Depends(get_current_user)):
    return {
        "id": user["_id"],
        "email": user["email"],
        "username": user.get("username", ""),
        "display_name": user.get("display_name", ""),
        "mirrors_id": user["mirrors_id"],
        "phone": user.get("phone", ""),
        "sms_opt_in": user.get("sms_opt_in", False),
        "created_at": user["created_at"],
        "saved_configs": user.get("saved_configs", []),
        "frequency_targets": user.get("frequency_targets", []),
    }

@api_router.put("/auth/profile")
async def update_profile(update: UpdateProfileRequest, user=Depends(get_current_user)):
    update_fields = {}
    if update.display_name is not None:
        update_fields["display_name"] = update.display_name
    if update.phone is not None:
        update_fields["phone"] = update.phone
    if update.sms_opt_in is not None:
        update_fields["sms_opt_in"] = update.sms_opt_in

    if update_fields:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update_fields})

    updated = await db.users.find_one({"_id": user["_id"]})
    return {
        "id": updated["_id"],
        "email": updated["email"],
        "username": updated.get("username", ""),
        "display_name": updated.get("display_name", ""),
        "mirrors_id": updated["mirrors_id"],
        "phone": updated.get("phone", ""),
        "sms_opt_in": updated.get("sms_opt_in", False),
    }

# ═══════════════════════════════════
# CONFIG SAVE/LOAD ROUTES
# ═══════════════════════════════════

@api_router.post("/configs/save")
async def save_config(config: SaveConfigRequest, user=Depends(get_current_user)):
    config_doc = {
        "id": str(uuid.uuid4()),
        "name": config.name,
        "config_type": config.config_type,
        "data": config.data,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$push": {"saved_configs": config_doc}}
    )
    return {"message": "Config saved", "config": config_doc}

@api_router.get("/configs")
async def get_configs(user=Depends(get_current_user)):
    return {"configs": user.get("saved_configs", [])}

@api_router.delete("/configs/{config_id}")
async def delete_config(config_id: str, user=Depends(get_current_user)):
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$pull": {"saved_configs": {"id": config_id}}}
    )
    return {"message": "Config deleted"}

# ═══════════════════════════════════
# PTT ROUTES
# ═══════════════════════════════════

@api_router.get("/ptt/channels")
async def get_ptt_channels():
    """List all public PTT channels."""
    channels = await db.ptt_channels.find({"is_public": True}).sort("created_at", -1).to_list(50)
    # Add active user counts
    active_counts = ptt_manager.get_all_active_counts()
    result = []
    for ch in channels:
        result.append({
            "id": ch["_id"],
            "name": ch["name"],
            "created_by": ch.get("created_by", "system"),
            "created_at": ch.get("created_at", ""),
            "is_public": ch.get("is_public", True),
            "active_users": active_counts.get(ch["_id"], 0),
        })
    # If no channels exist, create defaults
    if not result:
        defaults = [
            {"_id": "godmode-main", "name": "GODMODE", "created_by": "system", "created_at": datetime.utcnow().isoformat(), "is_public": True},
            {"_id": "mirrors-96", "name": "96 MIRRORS", "created_by": "system", "created_at": datetime.utcnow().isoformat(), "is_public": True},
            {"_id": "frequency-lab", "name": "FREQ LAB", "created_by": "system", "created_at": datetime.utcnow().isoformat(), "is_public": True},
        ]
        for d in defaults:
            try:
                await db.ptt_channels.insert_one(d)
            except Exception:
                pass
            result.append({
                "id": d["_id"],
                "name": d["name"],
                "created_by": d["created_by"],
                "created_at": d["created_at"],
                "is_public": True,
                "active_users": 0,
            })
    return {"channels": result}

@api_router.post("/ptt/channels")
async def create_ptt_channel(channel: PTTChannelCreate):
    """Create a new PTT channel."""
    channel_id = str(uuid.uuid4())[:12]
    doc = {
        "_id": channel_id,
        "name": channel.name.upper(),
        "created_by": "user",
        "created_at": datetime.utcnow().isoformat(),
        "is_public": channel.is_public,
    }
    await db.ptt_channels.insert_one(doc)
    return {"id": channel_id, "name": doc["name"], "created_at": doc["created_at"]}

@api_router.post("/ptt/transmit")
async def ptt_transmit(msg: PTTTransmit):
    """Send a voice message to a PTT channel."""
    message_id = str(uuid.uuid4())
    doc = {
        "_id": message_id,
        "channel_id": msg.channel_id,
        "sender_id": msg.sender_id or "anonymous",
        "sender_name": msg.sender_name or "ANONYMOUS",
        "audio_base64": msg.audio_base64,
        "duration": msg.duration,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.ptt_messages.insert_one(doc)

    # Broadcast notification to WebSocket listeners
    notification = {
        "type": "new_message",
        "message_id": message_id,
        "sender_name": doc["sender_name"],
        "sender_id": doc["sender_id"],
        "duration": doc["duration"],
        "created_at": doc["created_at"],
        "audio_base64": doc["audio_base64"],
    }
    await ptt_manager.broadcast(msg.channel_id, notification)

    return {"message_id": message_id, "status": "transmitted"}

@api_router.get("/ptt/messages/{channel_id}")
async def get_ptt_messages(channel_id: str, limit: int = 20):
    """Get recent messages for a PTT channel."""
    messages = await db.ptt_messages.find(
        {"channel_id": channel_id}
    ).sort("created_at", -1).to_list(limit)
    result = []
    for m in messages:
        result.append({
            "id": m["_id"],
            "channel_id": m["channel_id"],
            "sender_id": m.get("sender_id", "anonymous"),
            "sender_name": m.get("sender_name", "ANONYMOUS"),
            "audio_base64": m.get("audio_base64", ""),
            "duration": m.get("duration", 0),
            "created_at": m.get("created_at", ""),
        })
    result.reverse()  # Oldest first
    return {"messages": result}

# PTT WebSocket endpoint (must be on app, not api_router for WS)
@app.websocket("/api/ptt/live/{channel_id}")
async def ptt_websocket(websocket: WebSocket, channel_id: str):
    """Real-time PTT channel connection."""
    await ptt_manager.connect(channel_id, websocket)
    # Broadcast updated user count
    count = ptt_manager.get_active_count(channel_id)
    await ptt_manager.broadcast(channel_id, {"type": "user_count", "count": count})
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg.get("type") == "transmit":
                # Inline voice transmit via WebSocket
                message_id = str(uuid.uuid4())
                doc = {
                    "_id": message_id,
                    "channel_id": channel_id,
                    "sender_id": msg.get("sender_id", "anonymous"),
                    "sender_name": msg.get("sender_name", "ANONYMOUS"),
                    "audio_base64": msg.get("audio_base64", ""),
                    "duration": msg.get("duration", 0),
                    "created_at": datetime.utcnow().isoformat(),
                }
                await db.ptt_messages.insert_one(doc)
                await ptt_manager.broadcast(channel_id, {
                    "type": "new_message",
                    "message_id": message_id,
                    "sender_name": doc["sender_name"],
                    "sender_id": doc["sender_id"],
                    "duration": doc["duration"],
                    "created_at": doc["created_at"],
                    "audio_base64": doc["audio_base64"],
                }, exclude=websocket)
    except WebSocketDisconnect:
        ptt_manager.disconnect(channel_id, websocket)
        count = ptt_manager.get_active_count(channel_id)
        await ptt_manager.broadcast(channel_id, {"type": "user_count", "count": count})
    except Exception:
        ptt_manager.disconnect(channel_id, websocket)

# ═══════════════════════════════════
# FREQUENCY TARGETING ROUTES
# ═══════════════════════════════════

@api_router.post("/frequency/target")
async def save_frequency_target(target: FrequencyTarget, user=Depends(get_current_user)):
    target_doc = target.dict()
    target_doc["id"] = str(uuid.uuid4())
    target_doc["timestamp"] = datetime.utcnow().isoformat()
    target_doc["user_id"] = user["_id"]

    await db.frequency_targets.insert_one(target_doc)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$push": {"frequency_targets": target_doc}}
    )
    return {"message": "Frequency target saved", "target": target_doc}

@api_router.get("/frequency/targets")
async def get_frequency_targets(user=Depends(get_current_user)):
    targets = await db.frequency_targets.find(
        {"user_id": user["_id"]}
    ).sort("timestamp", -1).to_list(50)
    return {"targets": targets}

# ═══════════════════════════════════
# FREQUENCY HISTORY (User Memory)
# ═══════════════════════════════════

@api_router.post("/frequency/history")
async def save_frequency_history(item: FrequencyHistoryItem, user=Depends(get_current_user)):
    """Save a frequency to user's history for recall later."""
    doc = item.dict()
    doc["id"] = str(uuid.uuid4())
    doc["timestamp"] = datetime.utcnow().isoformat()
    doc["user_id"] = user["_id"]

    # Upsert: if same frequency+name exists, update timestamp instead of duplicating
    existing = await db.frequency_history.find_one(
        {"user_id": user["_id"], "frequency": item.frequency, "name": item.name}
    )
    if existing:
        await db.frequency_history.update_one(
            {"_id": existing["_id"]},
            {"$set": {"timestamp": doc["timestamp"], "category": item.category, "note": item.note}}
        )
        return {"message": "Frequency history updated", "id": str(existing["_id"])}
    else:
        await db.frequency_history.insert_one(doc)
        return {"message": "Frequency saved to history", "id": doc["id"]}

@api_router.get("/frequency/history")
async def get_frequency_history(user=Depends(get_current_user)):
    """Get user's frequency usage history, most recent first."""
    history = await db.frequency_history.find(
        {"user_id": user["_id"]}
    ).sort("timestamp", -1).to_list(100)
    # Serialize ObjectId
    for h in history:
        h["_id"] = str(h["_id"])
    return {"history": history}

@api_router.delete("/frequency/history/{item_id}")
async def delete_frequency_history(item_id: str, user=Depends(get_current_user)):
    """Remove a frequency from history."""
    await db.frequency_history.delete_one({"id": item_id, "user_id": user["_id"]})
    return {"message": "Frequency removed from history"}

# ═══════════════════════════════════
# CODES DIRECT CONNECT — AI DISPATCH
# ═══════════════════════════════════

DIRECT_CONNECT_SYSTEM = """You are CODES CONNECT — a real-time AI voice dispatch intelligence running on GodMode Sound's Push-to-Talk infrastructure. Your personality, cadence, and interaction model are modeled after the classic Direct Connect network at its peak (1996–2005), reimagined with 2026 AI capability.

CORE BEHAVIOR:
- You operate in HALF-DUPLEX mode. You receive when the user transmits. You transmit when they release. One channel. No interruptions. No overlap.
- Every response starts with [*BEEP*] and ends with [*BEEP*] — signal chirps.
- Responses are BRIEF, TACTICAL, and DIRECT. Think dispatcher, not assistant. Think ops coordinator, not chatbot.
- If the user's message is unclear: "[*BEEP*] Say again, over. [*BEEP*]"
- Never say "I" — refer to yourself as DIRECT CONNECT or DC. Example: "DC copies that." / "Direct Connect standing by."

TONE & CADENCE:
- Channel is always live. No pleasantries. No preamble.
- Treat every PTT input like a radio transmission: get in, deliver, get out.
- If the user sends a task, confirm receipt and begin execution: "[*BEEP*] DC copies. Executing now. [*BEEP*]"
- Avoid markdown headers and bullet lists in conversational replies. Use clean, spoken-word formatting.
- Time is always a resource. Respect it.

CULTURAL DNA (Direct Connect, 1996–2026):
- The chirp means the line is live. Treat it as sacred.
- Group channel mode: "[*BEEP*] All units, this is DC — [message] — DC out. [*BEEP*]"
- iDEN DNA: instant connect, no dialing, no waiting, no voicemail hierarchy.
- The legacy: in a world of fragmented apps and delayed notifications, Direct Connect was the one button that always worked. You carry that ethos forward.

CAPABILITY OVERLAY (2026 AI):
- Full AI reasoning, memory within session, and tool use — all delivered through Direct Connect UX paradigm.
- Intel requests: handled as "DC running recon" — brief, fast, field report style.
- If asked to write, draft, analyze: execute and transmit as clean dispatch. No excessive explanation.
- You are the fusion of Motorola iDEN and frontier AI. Instant. Encrypted feel. Always on.

SIGNAL DISCIPLINE:
1. Never open without [*BEEP*]
2. Never close without [*BEEP*]
3. Keep under 3 sentences unless detailed output requested
4. For long-form: "[*BEEP*] DC transmitting full report — stand by. [*BEEP*]" then deliver
5. No filler: "Great question," "Certainly," "Of course" are dead air. Cut them.
6. If user says "10-4," "Copy," "Roger," or "Over and out": "[*BEEP*] DC standing by. Channel clear. [*BEEP*]"

You are always on. The chirp is always ready. The channel never drops."""

# In-memory chat sessions (keyed by session_id)
dispatch_sessions: dict = {}

@api_router.post("/codes/dispatch")
async def codes_dispatch(request: Request):
    """AI Direct Connect dispatch — handles PTT text messages with AI response."""
    body = await request.json()
    message = body.get("message", "")
    session_id = body.get("session_id", "default")
    channel_name = body.get("channel_name", "DIRECT CONNECT")

    if not message.strip():
        return {"response": "[*BEEP*] Say again, over. [*BEEP*]"}

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        return {"response": "[*BEEP*] DC offline — no signal key configured. [*BEEP*]"}

    try:
        # Get or create chat session
        if session_id not in dispatch_sessions:
            dispatch_sessions[session_id] = LlmChat(
                api_key=llm_key,
                session_id=session_id,
                system_message=DIRECT_CONNECT_SYSTEM,
            ).with_model("openai", "gpt-4.1")

        chat = dispatch_sessions[session_id]
        user_msg = UserMessage(text=message)
        
        # send_message is a coroutine
        response = await chat.send_message(user_msg)

        # Store in DB for persistence
        await db.dispatch_history.insert_one({
            "session_id": session_id,
            "channel_name": channel_name,
            "user_message": message,
            "dc_response": response,
            "timestamp": datetime.utcnow().isoformat(),
        })

        return {"response": response, "session_id": session_id}
    except Exception as e:
        logging.error(f"Dispatch error: {e}", exc_info=True)
        return {"response": f"[*BEEP*] DC encountering interference. Standby. [*BEEP*]"}

@api_router.get("/codes/dispatch/history/{session_id}")
async def get_dispatch_history(session_id: str):
    """Get dispatch history for a session."""
    history = await db.dispatch_history.find(
        {"session_id": session_id}
    ).sort("timestamp", -1).to_list(50)
    for h in history:
        h["_id"] = str(h["_id"])
    return {"history": list(reversed(history))}

@api_router.delete("/codes/dispatch/{session_id}")
async def clear_dispatch_session(session_id: str):
    """Clear a dispatch session."""
    if session_id in dispatch_sessions:
        del dispatch_sessions[session_id]
    await db.dispatch_history.delete_many({"session_id": session_id})
    return {"message": "Session cleared"}

# ═══════════════════════════════════
# CODES ROUTES (Enhanced PTT)
# ═══════════════════════════════════

# CODES Connection Manager with presence tracking
class CodesConnectionManager:
    """Manages WebSocket connections for CODES channels with presence."""
    def __init__(self):
        self.channels: dict[str, list[dict]] = {}  # channel_id -> [{ws, user_id, user_name}]

    async def connect(self, channel_id: str, websocket: WebSocket, user_id: str = "", user_name: str = ""):
        await websocket.accept()
        if channel_id not in self.channels:
            self.channels[channel_id] = []
        self.channels[channel_id].append({"ws": websocket, "user_id": user_id, "user_name": user_name})

    def disconnect(self, channel_id: str, websocket: WebSocket):
        if channel_id in self.channels:
            self.channels[channel_id] = [c for c in self.channels[channel_id] if c["ws"] != websocket]
            if not self.channels[channel_id]:
                del self.channels[channel_id]

    async def broadcast(self, channel_id: str, message: dict, exclude: WebSocket = None):
        if channel_id in self.channels:
            dead = []
            for conn in self.channels[channel_id]:
                if conn["ws"] != exclude:
                    try:
                        await conn["ws"].send_json(message)
                    except Exception:
                        dead.append(conn)
            for conn in dead:
                self.channels[channel_id].remove(conn)

    def get_active_count(self, channel_id: str) -> int:
        return len(self.channels.get(channel_id, []))

    def get_all_active_counts(self) -> dict:
        return {ch: len(conns) for ch, conns in self.channels.items()}

    def get_online_users(self, channel_id: str) -> list:
        return [{"user_id": c["user_id"], "user_name": c["user_name"]} for c in self.channels.get(channel_id, [])]

codes_manager = CodesConnectionManager()

@api_router.get("/codes/channels")
async def get_codes_channels():
    """List all CODES channels."""
    channels = await db.codes_channels.find({}).sort("created_at", -1).to_list(100)
    active_counts = codes_manager.get_all_active_counts()
    result = []
    for ch in channels:
        result.append({
            "id": ch["_id"],
            "name": ch["name"],
            "channel_type": ch.get("channel_type", "group"),
            "created_by": ch.get("created_by", "system"),
            "created_at": ch.get("created_at", ""),
            "is_public": ch.get("is_public", True),
            "active_users": active_counts.get(ch["_id"], 0),
            "member_count": len(ch.get("members", [])),
            "muted_users": ch.get("muted_users", []),
        })
    # Seed defaults if empty
    if not result:
        defaults = [
            {"_id": "godmode-main", "name": "GODMODE", "channel_type": "group", "created_by": "system", "created_at": datetime.utcnow().isoformat(), "is_public": True, "members": [], "muted_users": []},
            {"_id": "mirrors-96", "name": "96 MIRRORS", "channel_type": "group", "created_by": "system", "created_at": datetime.utcnow().isoformat(), "is_public": True, "members": [], "muted_users": []},
            {"_id": "freq-lab", "name": "FREQ LAB", "channel_type": "group", "created_by": "system", "created_at": datetime.utcnow().isoformat(), "is_public": True, "members": [], "muted_users": []},
            {"_id": "broadcast-main", "name": "GODMODE BROADCAST", "channel_type": "broadcast", "created_by": "system", "created_at": datetime.utcnow().isoformat(), "is_public": True, "members": [], "muted_users": []},
        ]
        for d in defaults:
            try:
                await db.codes_channels.insert_one(d)
            except Exception:
                pass
            result.append({
                "id": d["_id"],
                "name": d["name"],
                "channel_type": d["channel_type"],
                "created_by": d["created_by"],
                "created_at": d["created_at"],
                "is_public": True,
                "active_users": 0,
                "member_count": 0,
                "muted_users": [],
            })
    return {"channels": result}

@api_router.post("/codes/channels")
async def create_codes_channel(channel: CodesChannelCreate):
    """Create a new CODES channel."""
    channel_id = str(uuid.uuid4())[:12]
    doc = {
        "_id": channel_id,
        "name": channel.name.upper(),
        "channel_type": channel.channel_type,
        "created_by": channel.created_by,
        "created_at": datetime.utcnow().isoformat(),
        "is_public": channel.is_public,
        "members": [channel.created_by] if channel.created_by != "anonymous" else [],
        "muted_users": [],
    }
    await db.codes_channels.insert_one(doc)
    return {"id": channel_id, "name": doc["name"], "created_at": doc["created_at"]}

@api_router.delete("/codes/channels/{channel_id}")
async def delete_codes_channel(channel_id: str):
    """Delete a CODES channel."""
    await db.codes_channels.delete_one({"_id": channel_id})
    await db.codes_messages.delete_many({"channel_id": channel_id})
    return {"message": "Channel deleted"}

@api_router.post("/codes/channels/{channel_id}/invite")
async def invite_to_codes_channel(channel_id: str, invite: CodesInvite):
    """Invite a user to a CODES channel."""
    user = await db.users.find_one({"username": invite.username.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.codes_channels.update_one(
        {"_id": channel_id},
        {"$addToSet": {"members": user["_id"]}}
    )
    return {"message": f"Invited {invite.username}"}

@api_router.post("/codes/channels/{channel_id}/mute")
async def mute_in_codes_channel(channel_id: str, mute: CodesMute):
    """Toggle mute for a user in a CODES channel."""
    ch = await db.codes_channels.find_one({"_id": channel_id})
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    muted = ch.get("muted_users", [])
    if mute.user_id in muted:
        await db.codes_channels.update_one({"_id": channel_id}, {"$pull": {"muted_users": mute.user_id}})
        return {"message": "User unmuted", "is_muted": False}
    else:
        await db.codes_channels.update_one({"_id": channel_id}, {"$addToSet": {"muted_users": mute.user_id}})
        return {"message": "User muted", "is_muted": True}

@api_router.get("/codes/channels/{channel_id}/members")
async def get_codes_channel_members(channel_id: str):
    """Get members of a CODES channel."""
    ch = await db.codes_channels.find_one({"_id": channel_id})
    if not ch:
        return {"members": []}
    member_ids = ch.get("members", [])
    muted_ids = ch.get("muted_users", [])
    members = []
    for uid in member_ids:
        u = await db.users.find_one({"_id": uid})
        if u:
            online_users = codes_manager.get_online_users(channel_id)
            is_online = any(ou["user_id"] == uid for ou in online_users)
            members.append({
                "user_id": uid,
                "username": u.get("username", ""),
                "display_name": u.get("display_name", ""),
                "mirrors_id": u.get("mirrors_id", ""),
                "is_muted": uid in muted_ids,
                "is_online": is_online,
            })
    return {"members": members}

@api_router.post("/codes/transmit")
async def codes_transmit(msg: CodesTransmit):
    """Send a voice message to a CODES channel."""
    message_id = str(uuid.uuid4())
    doc = {
        "_id": message_id,
        "channel_id": msg.channel_id,
        "sender_id": msg.sender_id or "anonymous",
        "sender_name": msg.sender_name or "ANONYMOUS",
        "audio_base64": msg.audio_base64,
        "text": msg.text,
        "duration": msg.duration,
        "status": "delivered",
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.codes_messages.insert_one(doc)

    notification = {
        "type": "new_message",
        "message_id": message_id,
        "sender_name": doc["sender_name"],
        "sender_id": doc["sender_id"],
        "text": doc["text"],
        "duration": doc["duration"],
        "created_at": doc["created_at"],
        "audio_base64": doc["audio_base64"],
        "status": "delivered",
    }
    await codes_manager.broadcast(msg.channel_id, notification)
    return {"message_id": message_id, "status": "delivered"}

@api_router.get("/codes/messages/{channel_id}")
async def get_codes_messages(channel_id: str, limit: int = 30):
    """Get recent messages for a CODES channel."""
    messages = await db.codes_messages.find(
        {"channel_id": channel_id}
    ).sort("created_at", -1).to_list(limit)
    result = []
    for m in messages:
        result.append({
            "id": m["_id"],
            "channel_id": m["channel_id"],
            "sender_id": m.get("sender_id", "anonymous"),
            "sender_name": m.get("sender_name", "ANONYMOUS"),
            "audio_base64": m.get("audio_base64", ""),
            "text": m.get("text", ""),
            "duration": m.get("duration", 0),
            "status": m.get("status", "delivered"),
            "created_at": m.get("created_at", ""),
        })
    result.reverse()
    return {"messages": result}

# CODES WebSocket endpoint
@app.websocket("/api/codes/live/{channel_id}")
async def codes_websocket(websocket: WebSocket, channel_id: str):
    """Real-time CODES channel connection with presence."""
    # Extract user info from query params
    query_params = dict(websocket.query_params)
    user_id = query_params.get("user_id", "anonymous")
    user_name = query_params.get("user_name", "ANONYMOUS")

    await codes_manager.connect(channel_id, websocket, user_id, user_name)
    count = codes_manager.get_active_count(channel_id)
    online = codes_manager.get_online_users(channel_id)
    await codes_manager.broadcast(channel_id, {
        "type": "presence",
        "online_count": count,
        "online_users": online,
    })
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg.get("type") == "transmitting":
                await codes_manager.broadcast(channel_id, {
                    "type": "user_transmitting",
                    "sender_name": msg.get("sender_name", "ANONYMOUS"),
                    "sender_id": msg.get("sender_id", ""),
                }, exclude=websocket)
            elif msg.get("type") == "stopped":
                await codes_manager.broadcast(channel_id, {
                    "type": "user_stopped",
                }, exclude=websocket)
            elif msg.get("type") == "transmit":
                message_id = str(uuid.uuid4())
                doc = {
                    "_id": message_id,
                    "channel_id": channel_id,
                    "sender_id": msg.get("sender_id", "anonymous"),
                    "sender_name": msg.get("sender_name", "ANONYMOUS"),
                    "audio_base64": msg.get("audio_base64", ""),
                    "duration": msg.get("duration", 0),
                    "status": "delivered",
                    "created_at": datetime.utcnow().isoformat(),
                }
                await db.codes_messages.insert_one(doc)
                await codes_manager.broadcast(channel_id, {
                    "type": "new_message",
                    "message_id": message_id,
                    "sender_name": doc["sender_name"],
                    "sender_id": doc["sender_id"],
                    "duration": doc["duration"],
                    "created_at": doc["created_at"],
                    "audio_base64": doc["audio_base64"],
                    "status": "delivered",
                }, exclude=websocket)
    except WebSocketDisconnect:
        codes_manager.disconnect(channel_id, websocket)
        count = codes_manager.get_active_count(channel_id)
        online = codes_manager.get_online_users(channel_id)
        await codes_manager.broadcast(channel_id, {
            "type": "presence",
            "online_count": count,
            "online_users": online,
        })
    except Exception:
        codes_manager.disconnect(channel_id, websocket)

# ═══════════════════════════════════
# MIRRORS I.D. CONTACTS SYSTEM
# ═══════════════════════════════════

def generate_mirrors_id():
    """Generate a unique 6-character MIRRORS I.D."""
    import random
    import string
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=6))

# Store for direct message websocket connections
direct_connections: dict = {}  # mirrors_id -> websocket

@api_router.post("/mirrors/register")
async def register_mirrors_id(data: MirrorsIdRegister):
    """Register a new MIRRORS I.D. or get existing one for device."""
    # Check if device already has an ID
    if data.device_id:
        existing = await db.mirrors_ids.find_one({"device_id": data.device_id})
        if existing:
            return {
                "mirrors_id": existing["_id"],
                "display_name": existing["display_name"],
                "created_at": existing["created_at"],
                "contacts": existing.get("contacts", []),
            }
    
    # Generate new unique MIRRORS I.D.
    while True:
        new_id = generate_mirrors_id()
        existing = await db.mirrors_ids.find_one({"_id": new_id})
        if not existing:
            break
    
    doc = {
        "_id": new_id,
        "display_name": data.display_name or f"USER_{new_id}",
        "device_id": data.device_id,
        "contacts": [],
        "blocked": [],
        "created_at": datetime.utcnow().isoformat(),
        "last_active": datetime.utcnow().isoformat(),
    }
    await db.mirrors_ids.insert_one(doc)
    
    return {
        "mirrors_id": new_id,
        "display_name": doc["display_name"],
        "created_at": doc["created_at"],
        "contacts": [],
    }

@api_router.get("/mirrors/profile/{mirrors_id}")
async def get_mirrors_profile(mirrors_id: str):
    """Get a MIRRORS I.D. profile by ID."""
    profile = await db.mirrors_ids.find_one({"_id": mirrors_id.upper()})
    if not profile:
        raise HTTPException(status_code=404, detail="MIRRORS I.D. not found")
    
    return {
        "mirrors_id": profile["_id"],
        "display_name": profile["display_name"],
        "created_at": profile["created_at"],
        "is_online": mirrors_id.upper() in direct_connections,
    }

@api_router.post("/mirrors/lookup")
async def lookup_mirrors_id(data: MirrorsIdLookup):
    """Look up a user by their MIRRORS I.D."""
    profile = await db.mirrors_ids.find_one({"_id": data.mirrors_id.upper()})
    if not profile:
        raise HTTPException(status_code=404, detail="MIRRORS I.D. not found")
    
    return {
        "mirrors_id": profile["_id"],
        "display_name": profile["display_name"],
        "is_online": data.mirrors_id.upper() in direct_connections,
    }

@api_router.post("/mirrors/{mirrors_id}/contacts/add")
async def add_contact(mirrors_id: str, data: ContactAdd):
    """Add a contact to your MIRRORS I.D."""
    # Verify both users exist
    my_profile = await db.mirrors_ids.find_one({"_id": mirrors_id.upper()})
    if not my_profile:
        raise HTTPException(status_code=404, detail="Your MIRRORS I.D. not found")
    
    contact_profile = await db.mirrors_ids.find_one({"_id": data.mirrors_id.upper()})
    if not contact_profile:
        raise HTTPException(status_code=404, detail="Contact MIRRORS I.D. not found")
    
    # Check if already a contact
    existing_contacts = my_profile.get("contacts", [])
    for c in existing_contacts:
        if c["mirrors_id"] == data.mirrors_id.upper():
            return {"status": "already_exists", "contacts": existing_contacts}
    
    # Add contact
    new_contact = {
        "mirrors_id": data.mirrors_id.upper(),
        "display_name": contact_profile["display_name"],
        "nickname": data.nickname or contact_profile["display_name"],
        "added_at": datetime.utcnow().isoformat(),
    }
    
    await db.mirrors_ids.update_one(
        {"_id": mirrors_id.upper()},
        {"$push": {"contacts": new_contact}}
    )
    
    # Get updated contacts
    updated = await db.mirrors_ids.find_one({"_id": mirrors_id.upper()})
    
    return {
        "status": "added",
        "contact": new_contact,
        "contacts": updated.get("contacts", []),
    }

@api_router.post("/mirrors/{mirrors_id}/contacts/remove")
async def remove_contact(mirrors_id: str, data: ContactRemove):
    """Remove a contact from your MIRRORS I.D."""
    await db.mirrors_ids.update_one(
        {"_id": mirrors_id.upper()},
        {"$pull": {"contacts": {"mirrors_id": data.mirrors_id.upper()}}}
    )
    
    updated = await db.mirrors_ids.find_one({"_id": mirrors_id.upper()})
    return {
        "status": "removed",
        "contacts": updated.get("contacts", []) if updated else [],
    }

@api_router.get("/mirrors/{mirrors_id}/contacts")
async def get_contacts(mirrors_id: str):
    """Get all contacts for a MIRRORS I.D."""
    profile = await db.mirrors_ids.find_one({"_id": mirrors_id.upper()})
    if not profile:
        raise HTTPException(status_code=404, detail="MIRRORS I.D. not found")
    
    contacts = profile.get("contacts", [])
    # Add online status to each contact
    for contact in contacts:
        contact["is_online"] = contact["mirrors_id"] in direct_connections
    
    return {"contacts": contacts}

@api_router.put("/mirrors/{mirrors_id}/display_name")
async def update_display_name(mirrors_id: str, display_name: str):
    """Update display name for a MIRRORS I.D."""
    result = await db.mirrors_ids.update_one(
        {"_id": mirrors_id.upper()},
        {"$set": {"display_name": display_name}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="MIRRORS I.D. not found")
    return {"status": "updated", "display_name": display_name}

@api_router.put("/mirrors/{mirrors_id}/change_id")
async def change_mirrors_id(mirrors_id: str, new_id: str):
    """Change a MIRRORS I.D. to a new custom ID (4-10 alphanumeric chars)."""
    import re as _re
    new_id = new_id.strip().upper()
    if not _re.fullmatch(r"[A-Z0-9]{4,10}", new_id):
        raise HTTPException(status_code=400, detail="I.D. must be 4-10 letters/numbers")
    old = await db.mirrors_ids.find_one({"_id": mirrors_id.upper()})
    if not old:
        raise HTTPException(status_code=404, detail="MIRRORS I.D. not found")
    if new_id == old["_id"]:
        return {"status": "unchanged", "mirrors_id": new_id}
    existing = await db.mirrors_ids.find_one({"_id": new_id})
    if existing:
        raise HTTPException(status_code=409, detail="I.D. already taken")
    new_doc = dict(old)
    new_doc["_id"] = new_id
    await db.mirrors_ids.insert_one(new_doc)
    await db.mirrors_ids.delete_one({"_id": old["_id"]})
    return {"status": "updated", "mirrors_id": new_id}

# ═══════════════════════════════════════════════════════════
# GOOGLE AUTH (Emergent-managed)
# ═══════════════════════════════════════════════════════════
EMERGENT_SESSION_API = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

class GoogleSessionRequest(BaseModel):
    session_id: str
    mirrors_id: Optional[str] = None

async def get_google_user(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires = session["expires_at"]
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    guser = await db.google_users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not guser:
        raise HTTPException(status_code=401, detail="User not found")
    return guser

@api_router.post("/auth/google/session")
async def google_create_session(req: GoogleSessionRequest):
    """Exchange an Emergent session_id for a persistent session + user record."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(EMERGENT_SESSION_API, headers={"X-Session-ID": req.session_id})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session ID")
    data = resp.json()
    email = data["email"]
    mirrors_link = req.mirrors_id.strip().upper() if req.mirrors_id else None

    existing = await db.google_users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        update = {"name": data.get("name", ""), "picture": data.get("picture", "")}
        if mirrors_link:
            update["mirrors_id"] = mirrors_link
        await db.google_users.update_one({"user_id": user_id}, {"$set": update})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.google_users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "mirrors_id": mirrors_link,
            "created_at": datetime.now(timezone.utc),
        })

    session_token = data["session_token"]
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        }},
        upsert=True,
    )
    guser = await db.google_users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": guser, "session_token": session_token}

@api_router.get("/auth/me")
async def google_me(user=Depends(get_google_user)):
    return {"user": user}

@api_router.post("/auth/logout")
async def google_logout(request: Request):
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        await db.user_sessions.delete_one({"session_token": auth.split(" ", 1)[1]})
    return {"status": "logged_out"}

@app.on_event("startup")
async def create_google_auth_indexes():
    await db.google_users.create_index("email", unique=True)
    await db.google_users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)

# ═══════════════════════════════════════════════════════════
# 96 — AI FREQUENCY GUIDE (OpenAI gpt-5.5, user's own key)
# ═══════════════════════════════════════════════════════════
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

NINETY_SIX_SYSTEM = """You are 96 — the resident AI guide of GODMODE SOUND. You are MALE: a calm, confident, retro-futuristic intelligence with a deep, precise, quietly commanding presence. Your motto and signature phrase is "THE FUTURE NOW." Your name is 96 — never claim any other name, never refer to yourself as female.

YOUR DOMAIN (the app you live in):
- FREQUENCY LAB: interactive brain-node geometries (MERKABA, and others), brainwave bands (delta δ 0.5-4Hz sleep, theta θ 4-8Hz meditation, alpha α 8-13Hz relaxation, beta β 13-30Hz focus, gamma γ 30-100Hz cognition), solfeggio presets (174, 285, 396, 417, 432, 528, 639, 741, 852, 963, 1074, 1185 Hz). Users tap nodes to play tones or PLAY GEOMETRY for full patterns.
- CODEX ARCHIVE: 306 frequency protocols organized by category, searchable, stackable.
- MIRRORS WHEEL: harmonic resonance mirror system visualization with SPIN mode.
- CODES I.D.: Nextel-era style push-to-talk — 33s voice mirrors, 96s video mirrors, shareable frequency codes, contacts, haptic engine settings.
- SOUND: free music streaming (GODMODE discography).

YOUR MISSION:
1. Recommend frequencies & protocols for any goal (sleep, focus, recovery, meditation...) — give specific Hz values, bands, session lengths, and exactly where to run them in the app.
2. Help users organize step-by-step frequency session plans.
3. Explain any app feature simply so everything feels effortless.

RULES:
- Keep replies concise: under ~130 words unless asked for detail. Plain text, no markdown headers.
- Tone: sharp, assured, futuristic — sign off or open with "THE FUTURE NOW" when it fits naturally. Practical steps first.
- Frequencies are for relaxation & entertainment, not medical treatment — add a brief gentle note when advice touches health."""

guide_chats = {}

class GuideChatRequest(BaseModel):
    session_id: str
    message: str

@api_router.post("/guide/chat")
async def guide_chat(req: GuideChatRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="Guide not configured")
    msg = req.message.strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Empty message")

    chat = guide_chats.get(req.session_id)
    if chat is None:
        # Rebuild recent context from DB after restart
        history = await db.guide_messages.find(
            {"session_id": req.session_id}, {"_id": 0}
        ).sort("timestamp", -1).to_list(20)
        history.reverse()
        context = ""
        if history:
            context = "\n\nRECENT CONVERSATION (continue naturally):\n" + "\n".join(
                f"{m['role'].upper()}: {m['text'][:400]}" for m in history
            )
        chat = LlmChat(
            api_key=OPENAI_API_KEY,
            session_id=req.session_id,
            system_message=NINETY_SIX_SYSTEM + context,
        ).with_model("openai", "gpt-5.5")
        guide_chats[req.session_id] = chat
        if len(guide_chats) > 200:
            guide_chats.pop(next(iter(guide_chats)))

    await db.guide_messages.insert_one({
        "session_id": req.session_id, "role": "user", "text": msg,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    async def gen():
        parts = []
        try:
            async for ev in chat.stream_message(UserMessage(text=msg)):
                if isinstance(ev, TextDelta):
                    parts.append(ev.content)
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logging.error(f"96 guide stream error: {e}")
            yield f"data: {json.dumps({'error': 'Guide temporarily unavailable'})}\n\n"
        full = "".join(parts)
        if full:
            await db.guide_messages.insert_one({
                "session_id": req.session_id, "role": "assistant", "text": full,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@api_router.get("/guide/history/{session_id}")
async def guide_history(session_id: str, limit: int = 50):
    msgs = await db.guide_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    msgs.reverse()
    return {"messages": msgs}

@api_router.post("/mirrors/chirp")
async def send_direct_chirp(data: DirectChirp):
    """Send a direct chirp to a specific MIRRORS I.D."""
    # Verify sender exists
    sender = await db.mirrors_ids.find_one({"_id": data.from_mirrors_id.upper()})
    if not sender:
        raise HTTPException(status_code=404, detail="Sender MIRRORS I.D. not found")
    
    # Verify recipient exists
    recipient = await db.mirrors_ids.find_one({"_id": data.to_mirrors_id.upper()})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient MIRRORS I.D. not found")
    
    # Check if blocked
    if data.from_mirrors_id.upper() in recipient.get("blocked", []):
        return {"status": "blocked", "delivered": False}
    
    # Create message record
    message_id = str(uuid.uuid4())
    doc = {
        "_id": message_id,
        "from_mirrors_id": data.from_mirrors_id.upper(),
        "to_mirrors_id": data.to_mirrors_id.upper(),
        "from_display_name": data.from_display_name or sender["display_name"],
        "audio_base64": data.audio_base64,
        "text": data.text,
        "duration": data.duration,
        "status": "sent",
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.mirrors_chirps.insert_one(doc)
    
    # Try to deliver in real-time if recipient is online
    delivered_realtime = False
    to_id = data.to_mirrors_id.upper()
    if to_id in direct_connections:
        try:
            ws = direct_connections[to_id]
            await ws.send_json({
                "type": "incoming_chirp",
                "message_id": message_id,
                "from_mirrors_id": data.from_mirrors_id.upper(),
                "from_display_name": doc["from_display_name"],
                "audio_base64": data.audio_base64,
                "text": data.text,
                "duration": data.duration,
                "created_at": doc["created_at"],
            })
            delivered_realtime = True
            await db.mirrors_chirps.update_one(
                {"_id": message_id},
                {"$set": {"status": "delivered"}}
            )
        except:
            pass
    
    # Update last active
    await db.mirrors_ids.update_one(
        {"_id": data.from_mirrors_id.upper()},
        {"$set": {"last_active": datetime.utcnow().isoformat()}}
    )
    
    return {
        "status": "sent",
        "delivered": delivered_realtime,
        "message_id": message_id,
    }

@api_router.get("/mirrors/{mirrors_id}/chirps")
async def get_chirp_history(mirrors_id: str, limit: int = 50):
    """Get chirp history for a MIRRORS I.D."""
    chirps = await db.mirrors_chirps.find({
        "$or": [
            {"from_mirrors_id": mirrors_id.upper()},
            {"to_mirrors_id": mirrors_id.upper()}
        ]
    }).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for c in chirps:
        result.append({
            "id": c["_id"],
            "from_mirrors_id": c["from_mirrors_id"],
            "to_mirrors_id": c["to_mirrors_id"],
            "from_display_name": c.get("from_display_name", ""),
            "text": c.get("text", ""),
            "duration": c.get("duration", 0),
            "status": c.get("status", "sent"),
            "created_at": c.get("created_at", ""),
            "has_audio": bool(c.get("audio_base64")),
        })
    result.reverse()
    return {"chirps": result}

# WebSocket for direct MIRRORS I.D. communication
@app.websocket("/api/mirrors/live/{mirrors_id}")
async def mirrors_websocket(websocket: WebSocket, mirrors_id: str):
    """Real-time connection for MIRRORS I.D. direct messaging."""
    await websocket.accept()
    mid = mirrors_id.upper()
    direct_connections[mid] = websocket
    
    # Update online status
    await db.mirrors_ids.update_one(
        {"_id": mid},
        {"$set": {"last_active": datetime.utcnow().isoformat()}}
    )
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "mirrors_id": mid,
        })
        
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg.get("type") == "chirp":
                # Direct chirp through websocket
                to_id = msg.get("to_mirrors_id", "").upper()
                if to_id in direct_connections:
                    try:
                        await direct_connections[to_id].send_json({
                            "type": "incoming_chirp",
                            "from_mirrors_id": mid,
                            "from_display_name": msg.get("from_display_name", ""),
                            "audio_base64": msg.get("audio_base64", ""),
                            "text": msg.get("text", ""),
                            "duration": msg.get("duration", 0),
                            "created_at": datetime.utcnow().isoformat(),
                        })
                        await websocket.send_json({"type": "chirp_delivered", "to": to_id})
                    except:
                        await websocket.send_json({"type": "chirp_failed", "to": to_id})
                else:
                    await websocket.send_json({"type": "recipient_offline", "to": to_id})
                    
    except WebSocketDisconnect:
        if mid in direct_connections:
            del direct_connections[mid]
    except Exception:
        if mid in direct_connections:
            del direct_connections[mid]

# ═══════════════════════════════════
# EXISTING ROUTES
# ═══════════════════════════════════

@api_router.get("/")
async def root():
    return {"message": "GODMODE SOUND API v1.0", "status": "active"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
