"""Backend tests for 96 AI Frequency Guide (SSE + history)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://binaural-preview.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def session_id():
    return f"TEST-96-{uuid.uuid4().hex[:8]}"


class TestGuideChatSSE:
    def test_empty_message_returns_400(self):
        r = requests.post(f"{BASE_URL}/api/guide/chat", json={"session_id": "TEST-empty", "message": "   "}, timeout=30)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text[:200]}"

    def test_malformed_body_returns_422(self):
        # Missing session_id + message
        r = requests.post(f"{BASE_URL}/api/guide/chat", json={"foo": "bar"}, timeout=30)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text[:200]}"

    def test_chat_stream_graceful_quota_error(self, session_id):
        r = requests.post(
            f"{BASE_URL}/api/guide/chat",
            json={"session_id": session_id, "message": "what helps sleep?"},
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200, f"Expected 200 SSE, got {r.status_code}: {r.text[:200]}"
        ct = r.headers.get("content-type", "")
        assert "text/event-stream" in ct, f"Expected SSE content-type, got {ct}"
        body = ""
        start = time.time()
        for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
            if chunk:
                body += chunk
            if "[DONE]" in body:
                break
            if time.time() - start > 45:
                break
        r.close()
        assert "data:" in body, f"No SSE data frames received. Body: {body[:400]}"
        assert "[DONE]" in body, f"Stream never terminated with [DONE]. Body: {body[:400]}"
        # Expected: due to quota, backend emits error frame. Accept either error path OR successful delta.
        assert ("Guide temporarily unavailable" in body) or ('"delta"' in body), \
            f"Neither error nor delta frame present. Body: {body[:400]}"


class TestGuideHistory:
    def test_unknown_session_returns_empty(self):
        sid = f"TEST-unknown-{uuid.uuid4().hex[:6]}"
        r = requests.get(f"{BASE_URL}/api/guide/history/{sid}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "messages" in data
        assert data["messages"] == []

    def test_user_message_persisted_after_chat(self):
        sid = f"TEST-persist-{uuid.uuid4().hex[:6]}"
        user_text = "test-persist what helps sleep?"
        r = requests.post(
            f"{BASE_URL}/api/guide/chat",
            json={"session_id": sid, "message": user_text},
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200
        # Drain the stream so writes flush
        for _ in r.iter_content(chunk_size=None, decode_unicode=True):
            pass
        r.close()
        time.sleep(1.0)
        h = requests.get(f"{BASE_URL}/api/guide/history/{sid}", timeout=15)
        assert h.status_code == 200
        msgs = h.json().get("messages", [])
        assert len(msgs) >= 1, f"Expected >=1 message persisted, got {msgs}"
        user_msgs = [m for m in msgs if m.get("role") == "user"]
        assert any(m.get("text") == user_text for m in user_msgs), \
            f"User message not persisted. Got: {msgs}"
