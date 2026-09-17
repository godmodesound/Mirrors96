"""Sign in with Apple — backend verification + session tests (local RSA key stands in for Apple JWKS)."""
import os
import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("APPLE_AUDIENCES", "app.emergent.binauralpreview2d067bc8,host.exp.Exponent")

import server  # noqa: E402

pytestmark = pytest.mark.anyio


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class _FakeSigningKey:
    key = _KEY.public_key()


class _FakeJWKS:
    def get_signing_key_from_jwt(self, _token):
        return _FakeSigningKey()


def _token(sub: str, aud: str = "app.emergent.binauralpreview2d067bc8", email: str | None = None, exp_offset: int = 600):
    now = int(time.time())
    claims = {"iss": server.APPLE_ISSUER, "aud": aud, "sub": sub, "iat": now, "exp": now + exp_offset}
    if email:
        claims["email"] = email
    return jwt.encode(claims, _KEY, algorithm="RS256", headers={"kid": "test"})


@pytest.fixture(autouse=True)
def _patch_jwks(monkeypatch):
    monkeypatch.setattr(server, "_apple_jwks_client", _FakeJWKS())


@pytest.fixture(scope="module")
async def client():
    async with AsyncClient(transport=ASGITransport(app=server.app), base_url="http://test") as c:
        yield c


async def test_first_sign_in_creates_user_and_session(client):
    sub = f"apple_{uuid.uuid4().hex}"
    r = await client.post("/api/auth/apple", json={
        "identity_token": _token(sub, email="first@privaterelay.appleid.com"),
        "full_name": "Ada Lovelace",
        "email": "first@privaterelay.appleid.com",
        "mirrors_id": "ab12",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["apple_sub"] == sub
    assert body["user"]["name"] == "Ada Lovelace"
    assert body["user"]["mirrors_id"] == "AB12"
    tok = body["session_token"]

    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 200
    assert me.json()["user"]["user_id"] == body["user"]["user_id"]

    # second sign-in: Apple sends no name/email — must NOT overwrite
    r2 = await client.post("/api/auth/apple", json={"identity_token": _token(sub)})
    assert r2.status_code == 200
    assert r2.json()["user"]["name"] == "Ada Lovelace"
    assert r2.json()["user"]["user_id"] == body["user"]["user_id"]
    assert r2.json()["session_token"] != tok

    out = await client.post("/api/auth/logout", headers={"Authorization": f"Bearer {tok}"})
    assert out.status_code == 200
    assert (await client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})).status_code == 401

    await server.db.google_users.delete_one({"apple_sub": sub})


async def test_expo_go_audience_accepted(client):
    sub = f"apple_{uuid.uuid4().hex}"
    r = await client.post("/api/auth/apple", json={"identity_token": _token(sub, aud="host.exp.Exponent")})
    assert r.status_code == 200
    await server.db.google_users.delete_one({"apple_sub": sub})


async def test_wrong_audience_rejected(client):
    r = await client.post("/api/auth/apple", json={"identity_token": _token("x", aud="com.other.app")})
    assert r.status_code == 401
    assert "audience" in r.json()["detail"].lower()


async def test_expired_token_rejected(client):
    r = await client.post("/api/auth/apple", json={"identity_token": _token("x", exp_offset=-60)})
    assert r.status_code == 401


async def test_garbage_token_rejected(client):
    r = await client.post("/api/auth/apple", json={"identity_token": "not.a.jwt"})
    assert r.status_code == 401
