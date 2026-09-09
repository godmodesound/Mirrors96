"""Regression tests for 96 MIRRORS catalogue + public streaming endpoints."""

import os
import tempfile
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL")

if not BASE_URL:
    pytest.skip("EXPO_PUBLIC_BACKEND_URL missing; cannot run public endpoint tests", allow_module_level=True)

BASE_URL = BASE_URL.rstrip("/")

EXPECTED_COVER = "https://customer-assets-rejwkqb3.emergentagent.net/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/a531g1s7_Codex%20Image%20Sep%206%2C%202026%2C%2002_21_12%20AM.png"
EXPECTED_TRACKS = [
    "96 MIRRORS",
    "WENOTDONE",
    "13th St",
    "Here 2day Gone 2morrow",
    "Musical Chairs 2026",
    "Poor Man Style",
    "$hango",
    "Spun The Block",
    "Grateful",
    "UNCLE MAJIC",
    "RED Magick",
    "MIRROR WORLD",
    "MIND SYNC",
    "INTERLUDE FLIP",
]
EXPECTED_SIZES = {
    "mirror-world": 9602036,
    "mind-sync": 8002673,
    "interlude-flip": 1402678,
}


@pytest.fixture(scope="module")
def api_client():
    """Shared client for public API checks."""
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})
    return session


# ─── Store catalogue parity + persistence across repeated calls ─────────────────
def test_store_mirrors_catalogue_parity_and_repeat_stability(api_client):
    list_res = api_client.get(f"{BASE_URL}/api/store/albums", timeout=30)
    detail_res = api_client.get(f"{BASE_URL}/api/store/albums/mirrors", timeout=30)
    admin_res = api_client.get(f"{BASE_URL}/api/store/admin/albums", timeout=30)

    assert list_res.status_code == 200, list_res.text
    assert detail_res.status_code == 200, detail_res.text
    assert admin_res.status_code == 200, admin_res.text

    albums = list_res.json().get("albums", [])
    detail = detail_res.json()
    admin_albums = admin_res.json().get("albums", [])

    mirrors_list = next((a for a in albums if a.get("id") == "mirrors"), None)
    mirrors_admin = next((a for a in admin_albums if a.get("id") == "mirrors"), None)

    assert mirrors_list is not None
    assert mirrors_admin is not None
    assert detail.get("name") == "96 MIRRORS"

    for source in (mirrors_list, mirrors_admin, detail):
        assert source.get("cover_url") == EXPECTED_COVER
        assert source.get("tracklist") == EXPECTED_TRACKS
        assert len(source.get("preview_urls", [])) == 14

    assert mirrors_list.get("price_cents") == 1299
    assert mirrors_admin.get("price_cents") == 1299
    assert detail.get("price_cents") == 1299

    other_ids = sorted([a["id"] for a in albums if a.get("id") != "mirrors"])
    assert other_ids == ["13", "codes", "in-memory-of", "lucid-dreams", "presence"]

    # Repeat calls should not duplicate tracks.
    repeat_detail = api_client.get(f"{BASE_URL}/api/store/albums/mirrors", timeout=30).json()
    repeat_list = api_client.get(f"{BASE_URL}/api/store/albums", timeout=30).json().get("albums", [])
    repeat_mirrors = next((a for a in repeat_list if a.get("id") == "mirrors"), None)

    assert repeat_detail.get("tracklist") == EXPECTED_TRACKS
    assert repeat_mirrors is not None
    assert repeat_mirrors.get("tracklist") == EXPECTED_TRACKS


# ─── Public mirrored stream transport + range behavior ──────────────────────────
@pytest.mark.parametrize("slug,expected_size,expected_duration", [
    ("mirror-world", 9602036, 240),
    ("mind-sync", 8002673, 200),
    ("interlude-flip", 1402678, 35),
])
def test_music_head_range_and_duration_estimate(api_client, slug, expected_size, expected_duration):
    url = f"{BASE_URL}/api/music/mirrors/{slug}.mp3"

    head_res = api_client.head(url, timeout=30)
    assert head_res.status_code == 200, head_res.text
    assert head_res.headers.get("Content-Type", "").startswith("audio/mpeg")
    assert int(head_res.headers.get("Content-Length", "0")) == expected_size

    prefix_res = api_client.get(url, headers={"Range": "bytes=0-255"}, timeout=30)
    assert prefix_res.status_code == 206, prefix_res.text
    assert prefix_res.headers.get("Content-Range") == f"bytes 0-255/{expected_size}"
    assert len(prefix_res.content) == 256

    suffix_res = api_client.get(url, headers={"Range": "bytes=-128"}, timeout=30)
    assert suffix_res.status_code == 206, suffix_res.text
    assert len(suffix_res.content) == 128
    assert suffix_res.headers.get("Content-Range") == f"bytes {expected_size - 128}-{expected_size - 1}/{expected_size}"

    # Estimate duration from size at 320kbps CBR: bytes*8/320000.
    estimated = expected_size * 8 / 320000
    assert abs(estimated - expected_duration) < 2.5


def test_music_invalid_ranges_and_unknown_slug(api_client):
    size = EXPECTED_SIZES["mirror-world"]
    url = f"{BASE_URL}/api/music/mirrors/mirror-world.mp3"

    out_of_bounds = api_client.get(url, headers={"Range": f"bytes={size}-"}, timeout=30)
    assert out_of_bounds.status_code == 416

    multi_range = api_client.get(url, headers={"Range": "bytes=0-1,4-5"}, timeout=30)
    assert multi_range.status_code == 416

    unknown = api_client.get(f"{BASE_URL}/api/music/mirrors/not-a-track.mp3", timeout=30)
    assert unknown.status_code == 404


def test_cache_regeneration_after_safe_tmp_purge(api_client):
    cache_dir = Path(tempfile.gettempdir()) / "godmodesound-music"
    if cache_dir.exists():
        for f in cache_dir.glob("*.mp3"):
            f.unlink(missing_ok=True)

    res = api_client.head(f"{BASE_URL}/api/music/mirrors/mirror-world.mp3", timeout=45)
    assert res.status_code == 200
    assert int(res.headers.get("Content-Length", "0")) == EXPECTED_SIZES["mirror-world"]
    assert cache_dir.exists()
    assert len(list(cache_dir.glob("*.mp3"))) >= 1
