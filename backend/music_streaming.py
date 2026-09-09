"""Range-capable public playback of only the three approved album recordings.

Managed object-storage credentials never leave the server. The bounded disk
cache (three MP3s, about 19 MB) is disposable; the durable originals live in
managed storage and their exact storage paths are persisted in MongoDB.
"""
import asyncio
import hashlib
import os
import re
import tempfile
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse

from music_catalog import PUBLIC_MIRRORS_TRACKS

load_dotenv()
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
CACHE_DIR = Path(tempfile.gettempdir()) / "godmodesound-music"
_storage_key = None
_storage_lock = asyncio.Lock()
_track_locks = {slug: asyncio.Lock() for slug in PUBLIC_MIRRORS_TRACKS}


async def storage_key(client):
    global _storage_key
    async with _storage_lock:
        if not _storage_key:
            response = await client.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY", "")})
            response.raise_for_status()
            _storage_key = response.json()["storage_key"]
    return _storage_key


async def cached_track(db, slug):
    global _storage_key
    # Exclude BSON _id; approved metadata is used internally, never returned.
    asset = await db.public_music_files.find_one({"track_id": slug, "published": True}, {"_id": 0})
    if not asset:
        raise HTTPException(404, "Track not published")
    digest = hashlib.sha256(asset["storage_path"].encode()).hexdigest()
    target = CACHE_DIR / f"{digest}.mp3"
    async with _track_locks[slug]:
        if target.exists() and target.stat().st_size == asset["size"]:
            return target
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(".part")
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                for attempt in range(2):
                    key = await storage_key(client)
                    async with client.stream("GET", f"{STORAGE_URL}/objects/{asset['storage_path']}", headers={"X-Storage-Key": key}) as response:
                        if response.status_code == 503 and attempt == 0:
                            _storage_key = None
                            continue
                        response.raise_for_status()
                        with temporary.open("wb") as output:
                            async for chunk in response.aiter_bytes(65536):
                                output.write(chunk)
                    break
            if temporary.stat().st_size != asset["size"]:
                raise ValueError("Incomplete track download")
            temporary.replace(target)
        except (httpx.HTTPError, OSError, ValueError, KeyError) as error:
            temporary.unlink(missing_ok=True)
            raise HTTPException(503, "Track temporarily unavailable; please retry") from error
    return target


def byte_range(header, size):
    if not header:
        return 0, size - 1
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", header)
    invalid = HTTPException(416, "Invalid audio range", headers={"Content-Range": f"bytes */{size}"})
    if not match or not any(match.groups()):
        raise invalid
    first, last = match.groups()
    if not first:
        length = int(last)
        if length <= 0:
            raise invalid
        return max(0, size - length), size - 1
    start, end = int(first), min(int(last), size - 1) if last else size - 1
    if start >= size or end < start:
        raise invalid
    return start, end


def file_chunks(path, start, end):
    with path.open("rb") as audio:
        audio.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = audio.read(min(65536, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


def music_router(db):
    router = APIRouter(prefix="/api/music")

    @router.api_route("/mirrors/{filename}", methods=["GET", "HEAD"])
    async def stream_track(filename: str, request: Request):
        slug = filename.removesuffix(".mp3")
        if not filename.endswith(".mp3") or slug not in PUBLIC_MIRRORS_TRACKS:
            raise HTTPException(404, "Track not found")
        path = await cached_track(db, slug)
        size = path.stat().st_size
        requested_range = request.headers.get("range")
        start, end = byte_range(requested_range, size)
        headers = {"Accept-Ranges": "bytes", "Content-Length": str(end - start + 1), "Cache-Control": "public, max-age=86400"}
        if requested_range:
            headers["Content-Range"] = f"bytes {start}-{end}/{size}"
        status = 206 if requested_range else 200
        if request.method == "HEAD":
            return Response(status_code=status, media_type="audio/mpeg", headers=headers)
        return StreamingResponse(file_chunks(path, start, end), status_code=status, media_type="audio/mpeg", headers=headers)

    return router