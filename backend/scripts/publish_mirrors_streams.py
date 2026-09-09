"""One-time catalogue publication. Run after preparing /tmp/mirrors-audio/*.mp3.

Does not change source WAVs, existing tracks, purchases, or user accounts.
Re-running identical files is idempotent via content-addressed UUID filenames.
"""
import hashlib
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))
from music_catalog import PUBLIC_MIRRORS_TRACKS  # noqa: E402


def publish():
    base = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
    url = base.rstrip("/") + "/objstore/api/v1/storage"
    response = requests.post(f"{url}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    response.raise_for_status()
    key = response.json()["storage_key"]
    with MongoClient(os.environ["MONGO_URL"]) as client:
        db = client[os.environ.get("DB_NAME", "godmodesound")]
        db.public_music_files.create_index("track_id", unique=True)
        for slug, info in PUBLIC_MIRRORS_TRACKS.items():
            data = (Path("/tmp/mirrors-audio") / f"{slug}.mp3").read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            filename = uuid.uuid5(uuid.NAMESPACE_URL, f"godmodesound/{slug}/{digest}")
            path = f"godmodesound/uploads/catalogue/{filename}.mp3"
            response = requests.put(f"{url}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": "audio/mpeg"}, data=data, timeout=120)
            response.raise_for_status()
            result = response.json()
            doc = {**info, "track_id": slug, "storage_path": result["path"], "size": len(data), "sha256": digest, "mime_type": "audio/mpeg", "published": True, "updated_at": datetime.now(timezone.utc).isoformat()}
            db.public_music_files.update_one({"track_id": slug}, {"$set": doc}, upsert=True)
            print(f"Published {info['title']}: {len(data)} bytes")


if __name__ == "__main__":
    publish()