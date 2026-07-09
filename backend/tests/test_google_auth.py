"""Backend tests for the Emergent-managed Google auth endpoints.

Covers:
 - POST /api/auth/google/session (invalid session_id → 401, missing body → 422)
 - GET  /api/auth/me (no header → 401, garbage bearer → 401)
 - POST /api/auth/logout (idempotent, always 200 with {status: logged_out})
 - Mongo indexes for google_users + user_sessions
 - Full simulated session lifecycle via direct Mongo inserts:
     valid session → /auth/me returns user
     expired session → /auth/me 401 and row is cleaned
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "godmode_sound_db")


# --- Fixtures -------------------------------------------------------------
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def db():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


# --- POST /api/auth/google/session ---------------------------------------
class TestGoogleSessionExchange:
    def test_invalid_session_id_returns_401(self, api):
        r = api.post(f"{BASE_URL}/api/auth/google/session",
                     json={"session_id": f"bogus-{uuid.uuid4().hex}"})
        assert r.status_code == 401
        assert r.json().get("detail") == "Invalid session ID"

    def test_missing_body_returns_422(self, api):
        r = api.post(f"{BASE_URL}/api/auth/google/session", json={})
        assert r.status_code == 422

    def test_empty_body_returns_422(self, api):
        # No JSON body at all → FastAPI/Pydantic 422
        r = requests.post(f"{BASE_URL}/api/auth/google/session")
        assert r.status_code == 422


# --- GET /api/auth/me ----------------------------------------------------
class TestAuthMe:
    def test_no_authorization_header_returns_401(self, api):
        # Use a bare request so the default session Content-Type doesn't inject auth
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401, r.text
        assert r.json().get("detail") == "Not authenticated"

    def test_garbage_bearer_token_returns_401(self, api):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer not-a-real-token-xyz"},
        )
        assert r.status_code == 401
        assert r.json().get("detail") == "Invalid session"

    def test_malformed_authorization_header_returns_401(self, api):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "NotBearerScheme abc"},
        )
        assert r.status_code == 401


# --- POST /api/auth/logout (idempotent) ---------------------------------
class TestLogout:
    def test_logout_without_token_returns_200(self, api):
        r = requests.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        assert r.json() == {"status": "logged_out"}

    def test_logout_with_garbage_token_returns_200(self, api):
        r = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": "Bearer trash-token"},
        )
        assert r.status_code == 200
        assert r.json() == {"status": "logged_out"}


# --- Mongo indexes -------------------------------------------------------
class TestIndexes:
    def test_google_users_email_unique_index(self, db):
        info = db.google_users.index_information()
        email_idx = [k for k, v in info.items() if v.get("key") == [("email", 1)]]
        assert email_idx, f"google_users.email index missing. Have: {list(info)}"
        assert info[email_idx[0]].get("unique") is True

    def test_google_users_user_id_unique_index(self, db):
        info = db.google_users.index_information()
        uid_idx = [k for k, v in info.items() if v.get("key") == [("user_id", 1)]]
        assert uid_idx, f"google_users.user_id index missing. Have: {list(info)}"
        assert info[uid_idx[0]].get("unique") is True

    def test_user_sessions_session_token_unique_index(self, db):
        info = db.user_sessions.index_information()
        tok = [k for k, v in info.items() if v.get("key") == [("session_token", 1)]]
        assert tok, f"user_sessions.session_token index missing. Have: {list(info)}"
        assert info[tok[0]].get("unique") is True

    def test_user_sessions_expires_at_ttl_index(self, db):
        info = db.user_sessions.index_information()
        ttl = [(k, v) for k, v in info.items()
               if v.get("key") == [("expires_at", 1)] and "expireAfterSeconds" in v]
        assert ttl, f"user_sessions.expires_at TTL index missing. Have: {info}"
        assert ttl[0][1]["expireAfterSeconds"] == 0


# --- Full simulated flow via direct Mongo inserts ------------------------
class TestSimulatedSessionFlow:
    """Insert a fake session + user directly and exercise /auth/me + expiry cleanup."""
    UID = f"user_TEST_{uuid.uuid4().hex[:8]}"
    EMAIL = f"TEST_{uuid.uuid4().hex[:6]}@example.com"

    @pytest.fixture(scope="class", autouse=True)
    def seed_and_cleanup(self, db, request):
        cls = request.cls
        cls.VALID_TOKEN = f"TEST_valid_{uuid.uuid4().hex}"
        cls.EXPIRED_TOKEN = f"TEST_expired_{uuid.uuid4().hex}"
        db.google_users.delete_many({"email": cls.EMAIL})
        db.google_users.insert_one({
            "user_id": cls.UID,
            "email": cls.EMAIL,
            "name": "TEST User",
            "picture": "",
            "mirrors_id": None,
            "created_at": datetime.now(timezone.utc),
        })
        # Valid session (future expiry)
        db.user_sessions.insert_one({
            "session_token": cls.VALID_TOKEN,
            "user_id": cls.UID,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        })
        # Expired session (past expiry)
        db.user_sessions.insert_one({
            "session_token": cls.EXPIRED_TOKEN,
            "user_id": cls.UID,
            "created_at": datetime.now(timezone.utc) - timedelta(days=8),
            "expires_at": datetime.now(timezone.utc) - timedelta(hours=1),
        })
        yield
        db.user_sessions.delete_many({"user_id": cls.UID})
        db.google_users.delete_many({"user_id": cls.UID})

    def test_auth_me_with_valid_token_returns_user(self):
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {self.VALID_TOKEN}"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "user" in body
        assert body["user"]["user_id"] == self.UID
        assert body["user"]["email"] == self.EMAIL
        assert body["user"]["name"] == "TEST User"

    def test_auth_me_with_expired_token_returns_401_and_cleans_row(self, db):
        # Precondition: expired row exists
        assert db.user_sessions.find_one({"session_token": self.EXPIRED_TOKEN}) is not None
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {self.EXPIRED_TOKEN}"},
        )
        assert r.status_code == 401
        assert r.json().get("detail") == "Session expired"
        # Row should have been deleted by get_google_user
        assert db.user_sessions.find_one({"session_token": self.EXPIRED_TOKEN}) is None

    def test_logout_deletes_valid_session(self, db):
        # Sanity: valid session still there
        assert db.user_sessions.find_one({"session_token": self.VALID_TOKEN}) is not None
        r = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {self.VALID_TOKEN}"},
        )
        assert r.status_code == 200
        assert r.json() == {"status": "logged_out"}
        assert db.user_sessions.find_one({"session_token": self.VALID_TOKEN}) is None

        # And subsequent /auth/me is now unauthorized
        r2 = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {self.VALID_TOKEN}"},
        )
        assert r2.status_code == 401


# --- Quick regression on unrelated endpoints -----------------------------
class TestRegression:
    def test_store_config_still_works(self, api):
        r = api.get(f"{BASE_URL}/api/store/config")
        assert r.status_code == 200
        assert "publishable_key" in r.json()

    def test_codes_channels_list(self, api):
        r = api.get(f"{BASE_URL}/api/codes/channels")
        assert r.status_code == 200
        assert isinstance(r.json().get("channels"), list)
