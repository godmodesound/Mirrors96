"""Regression tests for GODMODE checkout, return routing, status verification, and webhook fail-closed behavior."""

import os
import uuid

import pytest
import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL")

if not BASE_URL:
    pytest.skip("EXPO_PUBLIC_BACKEND_URL missing; cannot run public endpoint tests", allow_module_level=True)

BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    """Shared HTTP client for public endpoint checks."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json", "Accept": "application/json"})
    return session


@pytest.fixture(scope="module")
def created_sessions():
    """Capture created checkout sessions for downstream verification tests."""
    return {}


# Module: Checkout request validation + idempotent session creation.
def test_godmode_checkout_rejects_client_injection_fields(api_client):
    request_id = str(uuid.uuid4())
    payload = {
        "type": "godmode",
        "request_id": request_id,
        "amount_total": 1,
        "currency": "eur",
        "success_url": "https://evil.example/success",
        "cancel_url": "https://evil.example/cancel",
    }
    response = api_client.post(f"{BASE_URL}/api/sound/checkout", json=payload, timeout=45)
    assert response.status_code == 422, response.text
    assert "Invalid GODMODE checkout request" in response.text


# Module: Request-id UUID validation.
def test_godmode_checkout_rejects_malformed_uuid(api_client):
    payload = {"type": "godmode", "request_id": "not-a-uuid"}
    response = api_client.post(f"{BASE_URL}/api/sound/checkout", json=payload, timeout=45)
    assert response.status_code == 422, response.text
    assert "Invalid GODMODE checkout request" in response.text


# Module: Happy path checkout creation (unpaid only, no payment attempt).
def test_godmode_checkout_creates_live_unpaid_session(api_client, created_sessions):
    request_id = str(uuid.uuid4())
    payload = {"type": "godmode", "request_id": request_id}
    response = api_client.post(f"{BASE_URL}/api/sound/checkout", json=payload, timeout=45)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data.get("amount_total") == 3396
    assert data.get("currency") == "usd"
    assert data.get("session_id", "").startswith("cs_")
    assert data.get("url", "").startswith("https://checkout.stripe.com/")
    assert data.get("livemode") is True

    created_sessions["godmode_request_id"] = request_id
    created_sessions["godmode_session_id"] = data["session_id"]


# Module: Idempotency guarantees for repeated request_id.
def test_godmode_checkout_idempotency_same_uuid_same_session(api_client, created_sessions):
    request_id = created_sessions["godmode_request_id"]
    payload = {"type": "godmode", "request_id": request_id}
    response = api_client.post(f"{BASE_URL}/api/sound/checkout", json=payload, timeout=45)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data.get("session_id") == created_sessions["godmode_session_id"]
    assert data.get("amount_total") == 3396
    assert data.get("currency") == "usd"


# Module: Status verification from Stripe (unpaid checkouts stay unpaid).
def test_godmode_status_returns_unpaid_for_unpaid_session(api_client, created_sessions):
    session_id = created_sessions["godmode_session_id"]
    response = api_client.get(f"{BASE_URL}/api/sound/godmode/status/{session_id}", timeout=45)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data.get("status") in ("unpaid", "expired")
    assert data.get("product") == "GODMODE"
    assert data.get("amount_total") == 3396
    assert data.get("currency") == "usd"


# Module: Unknown checkout IDs are rejected.
def test_godmode_status_rejects_unknown_session(api_client):
    unknown = "cs_live_" + uuid.uuid4().hex
    response = api_client.get(f"{BASE_URL}/api/sound/godmode/status/{unknown}", timeout=45)
    assert response.status_code in (404, 502), response.text


# Module: Non-godmode sessions cannot be validated as GODMODE.
def test_godmode_status_rejects_wrong_product_session(api_client, created_sessions):
    success_url = f"{BASE_URL}/sound"
    cancel_url = f"{BASE_URL}/sound"
    single_checkout = api_client.post(
        f"{BASE_URL}/api/sound/checkout",
        json={
            "type": "single",
            "name": "TEST_single",
            "artist": "TEST_artist",
            "success_url": success_url,
            "cancel_url": cancel_url,
        },
        timeout=45,
    )
    assert single_checkout.status_code == 200, single_checkout.text
    single_session_id = single_checkout.json().get("session_id")
    assert single_session_id and single_session_id.startswith("cs_")

    created_sessions["non_godmode_session_id"] = single_session_id

    response = api_client.get(f"{BASE_URL}/api/sound/godmode/status/{single_session_id}", timeout=45)
    assert response.status_code == 400, response.text
    assert "not a GODMODE purchase" in response.text


# Module: Return URI validation and secure callback routing.
def test_godmode_return_uri_validation_and_redirect(api_client):
    allowed_request_id = str(uuid.uuid4())
    allowed_payload = {
        "type": "godmode",
        "request_id": allowed_request_id,
        "return_uri": "godmodesound://godmode",
    }
    allowed_res = api_client.post(f"{BASE_URL}/api/sound/checkout", json=allowed_payload, timeout=45)
    assert allowed_res.status_code == 200, allowed_res.text

    redirect_res = api_client.get(
        f"{BASE_URL}/api/sound/godmode/return",
        params={"request_id": allowed_request_id, "result": "success"},
        allow_redirects=False,
        timeout=45,
    )
    assert redirect_res.status_code == 303, redirect_res.text
    location = redirect_res.headers.get("Location", "")
    assert location.startswith("godmodesound://godmode")
    assert "checkout=success" in location
    assert "session_id=cs_" in location


# Module: Expo return URI allowlist acceptance.
def test_godmode_accepts_valid_expo_return_uri(api_client):
    payload = {
        "type": "godmode",
        "request_id": str(uuid.uuid4()),
        "return_uri": "exp://127.0.0.1:8081/--/godmode",
    }
    response = api_client.post(f"{BASE_URL}/api/sound/checkout", json=payload, timeout=45)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data.get("session_id", "").startswith("cs_")
    assert data.get("amount_total") == 3396
    assert data.get("currency") == "usd"


# Module: Rejection of unsafe return URI schemes/credentials.
@pytest.mark.parametrize(
    "return_uri",
    [
        "https://example.com/godmode",
        "javascript:alert(1)",
        "exp://user:pass@127.0.0.1:8081/--/godmode",
        "godmodesound://godmode?x=1",
    ],
)
def test_godmode_checkout_rejects_invalid_return_uri(api_client, return_uri):
    payload = {"type": "godmode", "request_id": str(uuid.uuid4()), "return_uri": return_uri}
    response = api_client.post(f"{BASE_URL}/api/sound/checkout", json=payload, timeout=45)
    assert response.status_code == 400, response.text
    assert "Invalid app return address" in response.text


# Module: Webhook must fail closed when signing secret is placeholder/unset.
def test_store_webhook_fail_closed_without_valid_secret(api_client):
    response = api_client.post(
        f"{BASE_URL}/api/store/webhook",
        data="{}",
        headers={"stripe-signature": "invalid"},
        timeout=30,
    )
    assert response.status_code == 503, response.text
    assert "not configured" in response.text.lower()


# Module: Query tampering in app return route cannot create paid state.
def test_godmode_return_route_rejects_invalid_session_lookup(api_client):
    response = api_client.get(
        f"{BASE_URL}/api/sound/godmode/return",
        params={"request_id": str(uuid.uuid4()), "result": "success"},
        allow_redirects=False,
        timeout=30,
    )
    assert response.status_code == 404, response.text
    assert "not found" in response.text.lower()
