"""Backend tests for CODES I.D. / MIRRORS chirp flows."""
import os
import pytest
import requests
import websockets
import asyncio
import json

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://binaural-preview.preview.emergentagent.com").rstrip("/")
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")


@pytest.fixture(scope="module")
def registered_mirror():
    """Register a mirrors id used by other tests."""
    r = requests.post(f"{BASE_URL}/api/mirrors/register", json={"display_name": "TEST_USER", "device_id": f"test_dev_TEST_{os.getpid()}"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "mirrors_id" in data
    assert len(data["mirrors_id"]) == 6
    return data


# ─── MIRRORS REGISTER ───
class TestMirrorsRegister:
    def test_register_returns_id(self, registered_mirror):
        assert registered_mirror["mirrors_id"]
        assert registered_mirror["display_name"].startswith("TEST_USER") or registered_mirror["display_name"].startswith("USER_")

    def test_register_idempotent_same_device(self, registered_mirror):
        # Same device_id must return same id
        r = requests.post(f"{BASE_URL}/api/mirrors/register", json={"display_name": "TEST_USER", "device_id": f"test_dev_TEST_{os.getpid()}"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["mirrors_id"] == registered_mirror["mirrors_id"]


# ─── MIRRORS LOOKUP ───
class TestMirrorsLookup:
    def test_lookup_invalid_id(self):
        r = requests.post(f"{BASE_URL}/api/mirrors/lookup", json={"mirrors_id": "ZZZZZZ"}, timeout=15)
        assert r.status_code == 404

    def test_lookup_valid_id(self, registered_mirror):
        r = requests.post(f"{BASE_URL}/api/mirrors/lookup", json={"mirrors_id": registered_mirror["mirrors_id"]}, timeout=15)
        assert r.status_code == 200
        assert r.json()["mirrors_id"] == registered_mirror["mirrors_id"]


# ─── CONTACTS ───
class TestContacts:
    def test_add_and_get_contact(self, registered_mirror):
        # Create a second mirror to add as contact
        r2 = requests.post(f"{BASE_URL}/api/mirrors/register", json={"display_name": "TEST_PEER", "device_id": f"test_peer_TEST_{os.getpid()}"}, timeout=15)
        peer_id = r2.json()["mirrors_id"]
        add = requests.post(
            f"{BASE_URL}/api/mirrors/{registered_mirror['mirrors_id']}/contacts/add",
            json={"mirrors_id": peer_id, "nickname": "TEST_PEER"},
            timeout=15,
        )
        assert add.status_code == 200, add.text
        body = add.json()
        assert body["status"] in ("added", "already_exists")
        assert any(c["mirrors_id"] == peer_id for c in body["contacts"])

    def test_add_nonexistent_contact_returns_404(self, registered_mirror):
        r = requests.post(
            f"{BASE_URL}/api/mirrors/{registered_mirror['mirrors_id']}/contacts/add",
            json={"mirrors_id": "ZZZZZZ"},
            timeout=15,
        )
        assert r.status_code == 404


# ─── WEBSOCKET LIVE ───
class TestWebSocket:
    def test_ws_connection(self, registered_mirror):
        mid = registered_mirror["mirrors_id"]

        async def run():
            uri = f"{WS_URL}/api/mirrors/live/{mid}"
            async with websockets.connect(uri, open_timeout=15) as ws:
                # Just connect — server should accept
                await asyncio.sleep(0.5)
                return True

        assert asyncio.get_event_loop().run_until_complete(run())
