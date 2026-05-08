#!/usr/bin/env python3
"""
CODES API Backend Testing Suite
Tests all CODES push-to-talk API endpoints and store endpoints
"""

import requests
import json
import base64
import time
from datetime import datetime

# Backend URL from frontend/.env
BASE_URL = "https://binaural-preview.preview.emergentagent.com/api"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"[{timestamp}] {status_symbol} {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_codes_channels_list():
    """Test GET /api/codes/channels - Should return list of default channels"""
    try:
        response = requests.get(f"{BASE_URL}/codes/channels", timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/codes/channels", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        channels = data.get("channels", [])
        
        # Check for expected default channels
        expected_channels = ["GODMODE", "96 MIRRORS", "FREQ LAB", "GODMODE BROADCAST"]
        found_channels = [ch["name"] for ch in channels]
        
        missing = [ch for ch in expected_channels if ch not in found_channels]
        if missing:
            log_test("GET /api/codes/channels", "FAIL", f"Missing channels: {missing}")
            return False
            
        # Verify channel structure
        for ch in channels:
            required_fields = ["id", "name", "channel_type", "active_users"]
            missing_fields = [field for field in required_fields if field not in ch]
            if missing_fields:
                log_test("GET /api/codes/channels", "FAIL", f"Missing fields in channel: {missing_fields}")
                return False
                
        log_test("GET /api/codes/channels", "PASS", f"Found {len(channels)} channels with all required fields")
        return True
        
    except Exception as e:
        log_test("GET /api/codes/channels", "FAIL", f"Exception: {str(e)}")
        return False

def test_codes_channel_create():
    """Test POST /api/codes/channels - Create a new channel"""
    try:
        payload = {
            "name": "TEST CHANNEL",
            "channel_type": "private",
            "is_public": False,
            "created_by": "test-user"
        }
        
        response = requests.post(f"{BASE_URL}/codes/channels", json=payload, timeout=10)
        
        if response.status_code != 200:
            log_test("POST /api/codes/channels", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return None
            
        data = response.json()
        
        # Verify response structure
        if "id" not in data or "name" not in data:
            log_test("POST /api/codes/channels", "FAIL", f"Missing id or name in response: {data}")
            return None
            
        if data["name"] != "TEST CHANNEL":
            log_test("POST /api/codes/channels", "FAIL", f"Name mismatch: expected 'TEST CHANNEL', got '{data['name']}'")
            return None
            
        log_test("POST /api/codes/channels", "PASS", f"Created channel: {data['name']} with ID: {data['id']}")
        return data["id"]
        
    except Exception as e:
        log_test("POST /api/codes/channels", "FAIL", f"Exception: {str(e)}")
        return None

def test_codes_transmit():
    """Test POST /api/codes/transmit - Send a voice message"""
    try:
        # Create test audio data (base64 encoded)
        test_audio = base64.b64encode(b"testaudiodata").decode('utf-8')
        
        payload = {
            "channel_id": "godmode-main",
            "sender_name": "TEST_USER",
            "sender_id": "test-123",
            "audio_base64": test_audio,
            "duration": 2.5
        }
        
        response = requests.post(f"{BASE_URL}/codes/transmit", json=payload, timeout=10)
        
        if response.status_code != 200:
            log_test("POST /api/codes/transmit", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return None
            
        data = response.json()
        
        # Verify response structure
        if "message_id" not in data or "status" not in data:
            log_test("POST /api/codes/transmit", "FAIL", f"Missing message_id or status in response: {data}")
            return None
            
        if data["status"] != "delivered":
            log_test("POST /api/codes/transmit", "FAIL", f"Status not 'delivered': {data['status']}")
            return None
            
        log_test("POST /api/codes/transmit", "PASS", f"Message transmitted with ID: {data['message_id']}")
        return data["message_id"]
        
    except Exception as e:
        log_test("POST /api/codes/transmit", "FAIL", f"Exception: {str(e)}")
        return None

def test_codes_messages_get():
    """Test GET /api/codes/messages/{channel_id} - Get messages for channel"""
    try:
        response = requests.get(f"{BASE_URL}/codes/messages/godmode-main?limit=30", timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/codes/messages/godmode-main", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        messages = data.get("messages", [])
        
        # Verify message structure if any messages exist
        if messages:
            required_fields = ["id", "sender_name", "audio_base64", "duration", "created_at"]
            for msg in messages:
                missing_fields = [field for field in required_fields if field not in msg]
                if missing_fields:
                    log_test("GET /api/codes/messages/godmode-main", "FAIL", f"Missing fields in message: {missing_fields}")
                    return False
                    
        log_test("GET /api/codes/messages/godmode-main", "PASS", f"Retrieved {len(messages)} messages with correct structure")
        return True
        
    except Exception as e:
        log_test("GET /api/codes/messages/godmode-main", "FAIL", f"Exception: {str(e)}")
        return False

def test_codes_channel_invite(channel_id):
    """Test POST /api/codes/channels/{channel_id}/invite - Invite a user"""
    if not channel_id:
        log_test("POST /api/codes/channels/{id}/invite", "SKIP", "No channel ID provided")
        return False
        
    try:
        payload = {"username": "testuser"}
        
        response = requests.post(f"{BASE_URL}/codes/channels/{channel_id}/invite", json=payload, timeout=10)
        
        # Expect 404 since user doesn't exist
        if response.status_code != 404:
            log_test("POST /api/codes/channels/{id}/invite", "FAIL", f"Expected 404, got {response.status_code}: {response.text}")
            return False
            
        log_test("POST /api/codes/channels/{id}/invite", "PASS", "Correctly returned 404 for non-existent user")
        return True
        
    except Exception as e:
        log_test("POST /api/codes/channels/{id}/invite", "FAIL", f"Exception: {str(e)}")
        return False

def test_codes_channel_mute(channel_id):
    """Test POST /api/codes/channels/{channel_id}/mute - Mute a user"""
    if not channel_id:
        log_test("POST /api/codes/channels/{id}/mute", "SKIP", "No channel ID provided")
        return False
        
    try:
        payload = {"user_id": "test-user-123"}
        
        response = requests.post(f"{BASE_URL}/codes/channels/{channel_id}/mute", json=payload, timeout=10)
        
        if response.status_code != 200:
            log_test("POST /api/codes/channels/{id}/mute", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        # Verify response structure
        if "message" not in data or "is_muted" not in data:
            log_test("POST /api/codes/channels/{id}/mute", "FAIL", f"Missing message or is_muted in response: {data}")
            return False
            
        log_test("POST /api/codes/channels/{id}/mute", "PASS", f"Mute status: {data['is_muted']}")
        return True
        
    except Exception as e:
        log_test("POST /api/codes/channels/{id}/mute", "FAIL", f"Exception: {str(e)}")
        return False

def test_codes_channel_members(channel_id):
    """Test GET /api/codes/channels/{channel_id}/members - Get members list"""
    if not channel_id:
        log_test("GET /api/codes/channels/{id}/members", "SKIP", "No channel ID provided")
        return False
        
    try:
        response = requests.get(f"{BASE_URL}/codes/channels/{channel_id}/members", timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/codes/channels/{id}/members", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        # Verify response structure
        if "members" not in data:
            log_test("GET /api/codes/channels/{id}/members", "FAIL", f"Missing members in response: {data}")
            return False
            
        members = data["members"]
        log_test("GET /api/codes/channels/{id}/members", "PASS", f"Retrieved {len(members)} members")
        return True
        
    except Exception as e:
        log_test("GET /api/codes/channels/{id}/members", "FAIL", f"Exception: {str(e)}")
        return False

def test_codes_channel_delete(channel_id):
    """Test DELETE /api/codes/channels/{channel_id} - Delete the test channel"""
    if not channel_id:
        log_test("DELETE /api/codes/channels/{id}", "SKIP", "No channel ID provided")
        return False
        
    try:
        response = requests.delete(f"{BASE_URL}/codes/channels/{channel_id}", timeout=10)
        
        if response.status_code != 200:
            log_test("DELETE /api/codes/channels/{id}", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        # Verify response
        if "message" not in data:
            log_test("DELETE /api/codes/channels/{id}", "FAIL", f"Missing message in response: {data}")
            return False
            
        log_test("DELETE /api/codes/channels/{id}", "PASS", f"Channel deleted: {data['message']}")
        return True
        
    except Exception as e:
        log_test("DELETE /api/codes/channels/{id}", "FAIL", f"Exception: {str(e)}")
        return False

def test_store_albums():
    """Test GET /api/store/albums - Verify existing store endpoints still work"""
    try:
        response = requests.get(f"{BASE_URL}/store/albums", timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/store/albums", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        albums = data.get("albums", [])
        
        # Should have 6 albums
        if len(albums) != 6:
            log_test("GET /api/store/albums", "FAIL", f"Expected 6 albums, got {len(albums)}")
            return False
            
        # Verify album structure
        for album in albums:
            required_fields = ["id", "name", "cover_url"]
            missing_fields = [field for field in required_fields if field not in album]
            if missing_fields:
                log_test("GET /api/store/albums", "FAIL", f"Missing fields in album: {missing_fields}")
                return False
                
        log_test("GET /api/store/albums", "PASS", f"Found {len(albums)} albums with cover_url fields")
        return True
        
    except Exception as e:
        log_test("GET /api/store/albums", "FAIL", f"Exception: {str(e)}")
        return False

def main():
    """Run all CODES API tests"""
    print("=" * 60)
    print("CODES API Backend Testing Suite")
    print("=" * 60)
    print(f"Testing backend at: {BASE_URL}")
    print()
    
    # Track test results
    results = {}
    
    # Test 1: List channels
    results["channels_list"] = test_codes_channels_list()
    
    # Test 2: Create channel
    test_channel_id = test_codes_channel_create()
    results["channel_create"] = test_channel_id is not None
    
    # Test 3: Transmit message
    message_id = test_codes_transmit()
    results["transmit"] = message_id is not None
    
    # Test 4: Get messages
    results["messages_get"] = test_codes_messages_get()
    
    # Test 5: Invite user (expect 404)
    results["channel_invite"] = test_codes_channel_invite(test_channel_id)
    
    # Test 6: Mute user
    results["channel_mute"] = test_codes_channel_mute(test_channel_id)
    
    # Test 7: Get members
    results["channel_members"] = test_codes_channel_members(test_channel_id)
    
    # Test 8: Delete channel
    results["channel_delete"] = test_codes_channel_delete(test_channel_id)
    
    # Test 9: Store albums (existing endpoint)
    results["store_albums"] = test_store_albums()
    
    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20} {status}")
    
    print()
    print(f"TOTAL: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print("⚠️  Some tests failed!")
        return False

if __name__ == "__main__":
    main()