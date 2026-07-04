"""Backend tests for CODES I.D. / MIRRORS chirp flows (incl. change_id)."""
import os
import uuid
import pytest
import requests
import websockets
import asyncio

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")


def _register(display_name="TEST_USER", device_suffix=None):
    """Helper: register a fresh mirrors I.D."""
    device_id = f"test_dev_TEST_{device_suffix or uuid.uuid4().hex[:8]}"
    r = requests.post(
        f"{BASE_URL}/api/mirrors/register",
        json={"display_name": display_name, "device_id": device_id},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def registered_mirror():
    """Shared mirrors id used by lookup/contacts/ws tests."""
    return _register("TEST_USER", f"shared_{os.getpid()}")


# ─── MIRRORS REGISTER ───
class TestMirrorsRegister:
    def test_register_returns_id(self, registered_mirror):
        assert registered_mirror["mirrors_id"]
        assert len(registered_mirror["mirrors_id"]) == 6

    def test_register_idempotent_same_device(self, registered_mirror):
        r = requests.post(
            f"{BASE_URL}/api/mirrors/register",
            json={"display_name": "TEST_USER", "device_id": f"test_dev_TEST_shared_{os.getpid()}"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["mirrors_id"] == registered_mirror["mirrors_id"]


# ─── MIRRORS LOOKUP ───
class TestMirrorsLookup:
    def test_lookup_invalid_id(self):
        r = requests.post(f"{BASE_URL}/api/mirrors/lookup", json={"mirrors_id": "ZZZZZZ"}, timeout=15)
        assert r.status_code == 404

    def test_lookup_valid_id(self, registered_mirror):
        r = requests.post(
            f"{BASE_URL}/api/mirrors/lookup",
            json={"mirrors_id": registered_mirror["mirrors_id"]},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["mirrors_id"] == registered_mirror["mirrors_id"]


# ─── CONTACTS ───
class TestContacts:
    def test_add_and_get_contact(self, registered_mirror):
        peer = _register("TEST_PEER", f"peer_{os.getpid()}")
        peer_id = peer["mirrors_id"]
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


# ─── DISPLAY NAME UPDATE ───
class TestDisplayNameUpdate:
    def test_update_display_name(self):
        m = _register("TEST_DN_ORIG")
        mid = m["mirrors_id"]
        r = requests.put(
            f"{BASE_URL}/api/mirrors/{mid}/display_name",
            params={"display_name": "TEST_DN_NEW"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["display_name"] == "TEST_DN_NEW"
        # Verify persisted via lookup
        prof = requests.get(f"{BASE_URL}/api/mirrors/profile/{mid}", timeout=15)
        assert prof.status_code == 200
        assert prof.json()["display_name"] == "TEST_DN_NEW"


# ─── CHANGE_ID (NEW FEATURE) ───
class TestChangeId:
    def _fresh_new_id(self, prefix="T"):
        # 6-char alphanumeric, starts with letter
        return (prefix + uuid.uuid4().hex[:5]).upper()

    def test_change_id_success_and_old_404s(self):
        m = _register("TEST_CHG")
        old_id = m["mirrors_id"]
        new_id = self._fresh_new_id("A")
        r = requests.put(
            f"{BASE_URL}/api/mirrors/{old_id}/change_id",
            params={"new_id": new_id},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["mirrors_id"] == new_id
        # Old id must 404
        old = requests.get(f"{BASE_URL}/api/mirrors/profile/{old_id}", timeout=15)
        assert old.status_code == 404
        # New id must work
        new_prof = requests.get(f"{BASE_URL}/api/mirrors/profile/{new_id}", timeout=15)
        assert new_prof.status_code == 200
        assert new_prof.json()["mirrors_id"] == new_id

    def test_change_id_preserves_display_name_and_contacts(self):
        m = _register("TEST_PRESERVE")
        mid = m["mirrors_id"]
        # add a contact
        peer = _register("TEST_PRESERVE_PEER")
        peer_id = peer["mirrors_id"]
        add = requests.post(
            f"{BASE_URL}/api/mirrors/{mid}/contacts/add",
            json={"mirrors_id": peer_id, "nickname": "PEER_NICK"},
            timeout=15,
        )
        assert add.status_code == 200
        # rename i.d.
        new_id = "P" + uuid.uuid4().hex[:5].upper()
        r = requests.put(
            f"{BASE_URL}/api/mirrors/{mid}/change_id",
            params={"new_id": new_id},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        # verify preserved data
        prof = requests.get(f"{BASE_URL}/api/mirrors/profile/{new_id}", timeout=15)
        assert prof.status_code == 200
        assert prof.json()["display_name"] == "TEST_PRESERVE"
        contacts = requests.get(f"{BASE_URL}/api/mirrors/{new_id}/contacts", timeout=15)
        assert contacts.status_code == 200
        cs = contacts.json().get("contacts", [])
        assert any(c["mirrors_id"] == peer_id for c in cs), f"Contact not preserved: {cs}"

    @pytest.mark.parametrize("bad", ["ab", "toolongid1234", "bad-id!", "AB2", "12345678901"])
    def test_change_id_invalid_format_returns_400(self, bad):
        m = _register("TEST_BAD_FMT")
        mid = m["mirrors_id"]
        r = requests.put(
            f"{BASE_URL}/api/mirrors/{mid}/change_id",
            params={"new_id": bad},
            timeout=15,
        )
        assert r.status_code == 400, f"expected 400 for '{bad}' got {r.status_code}: {r.text}"

    def test_change_id_taken_returns_409(self):
        a = _register("TEST_A")
        b = _register("TEST_B")
        r = requests.put(
            f"{BASE_URL}/api/mirrors/{a['mirrors_id']}/change_id",
            params={"new_id": b["mirrors_id"]},
            timeout=15,
        )
        assert r.status_code == 409, r.text

    def test_change_id_unknown_source_returns_404(self):
        new_id = "U" + uuid.uuid4().hex[:5].upper()
        r = requests.put(
            f"{BASE_URL}/api/mirrors/ZZZZZZ/change_id",
            params={"new_id": new_id},
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
                await asyncio.sleep(0.3)
                return True

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        assert loop.run_until_complete(run())
