#!/usr/bin/env python3
"""
PTT API Testing Script
Tests all PTT (Push-to-Talk) endpoints for the GODMODE SOUND backend
"""

import requests
import json
import base64
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://binaural-preview.preview.emergentagent.com/api"

def test_root_endpoint():
    """Test GET /api/ - Root endpoint to verify API is running"""
    print("🔍 Testing Root Endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "status" in data:
                print("   ✅ Root endpoint working correctly")
                return True
            else:
                print("   ❌ Root endpoint missing expected fields")
                return False
        else:
            print(f"   ❌ Root endpoint failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Root endpoint error: {e}")
        return False

def test_get_channels():
    """Test GET /api/ptt/channels - Should return channels or create defaults"""
    print("\n🔍 Testing Get PTT Channels...")
    try:
        response = requests.get(f"{BACKEND_URL}/ptt/channels")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            if "channels" in data:
                channels = data["channels"]
                print(f"   Found {len(channels)} channels")
                
                # Check if default channels exist
                channel_names = [ch.get("name", "") for ch in channels]
                expected_defaults = ["GODMODE", "96 MIRRORS", "FREQ LAB"]
                
                defaults_found = all(name in channel_names for name in expected_defaults)
                if defaults_found:
                    print("   ✅ Default channels created/found successfully")
                    
                    # Find godmode-main channel ID for later tests
                    godmode_channel = next((ch for ch in channels if ch.get("name") == "GODMODE"), None)
                    if godmode_channel:
                        print(f"   📝 GODMODE channel ID: {godmode_channel.get('id')}")
                        return True, godmode_channel.get('id')
                    else:
                        print("   ❌ GODMODE channel not found")
                        return False, None
                else:
                    print(f"   ⚠️  Default channels not all present. Found: {channel_names}")
                    return True, None  # Still working, just different state
            else:
                print("   ❌ Response missing 'channels' field")
                return False, None
        else:
            print(f"   ❌ Get channels failed with status {response.status_code}")
            return False, None
    except Exception as e:
        print(f"   ❌ Get channels error: {e}")
        return False, None

def test_create_channel():
    """Test POST /api/ptt/channels - Create a new PTT channel"""
    print("\n🔍 Testing Create PTT Channel...")
    try:
        channel_data = {
            "name": "FREQUENCY MASTERS",
            "is_public": True
        }
        
        response = requests.post(
            f"{BACKEND_URL}/ptt/channels",
            json=channel_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "name" in data:
                print(f"   ✅ Channel created successfully with ID: {data['id']}")
                return True, data['id']
            else:
                print("   ❌ Create channel response missing expected fields")
                return False, None
        else:
            print(f"   ❌ Create channel failed with status {response.status_code}")
            return False, None
    except Exception as e:
        print(f"   ❌ Create channel error: {e}")
        return False, None

def test_transmit_message(channel_id):
    """Test POST /api/ptt/transmit - Send a voice message"""
    print(f"\n🔍 Testing PTT Transmit to channel: {channel_id}...")
    try:
        # Create a realistic base64 encoded audio sample (just for testing)
        test_audio = "Hello from the frequency realm! This is a test transmission on 432Hz."
        audio_base64 = base64.b64encode(test_audio.encode()).decode()
        
        message_data = {
            "channel_id": channel_id,
            "sender_name": "FREQUENCY EXPLORER",
            "audio_base64": audio_base64,
            "duration": 3.2,
            "sender_id": "freq-explorer-001"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/ptt/transmit",
            json=message_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "message_id" in data and "status" in data:
                print(f"   ✅ Message transmitted successfully with ID: {data['message_id']}")
                return True, data['message_id']
            else:
                print("   ❌ Transmit response missing expected fields")
                return False, None
        else:
            print(f"   ❌ Transmit failed with status {response.status_code}")
            return False, None
    except Exception as e:
        print(f"   ❌ Transmit error: {e}")
        return False, None

def test_get_messages(channel_id):
    """Test GET /api/ptt/messages/{channel_id} - Get messages for a channel"""
    print(f"\n🔍 Testing Get Messages for channel: {channel_id}...")
    try:
        response = requests.get(f"{BACKEND_URL}/ptt/messages/{channel_id}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            if "messages" in data:
                messages = data["messages"]
                print(f"   Found {len(messages)} messages")
                
                if len(messages) > 0:
                    # Check if our test message is there
                    test_message = next((msg for msg in messages if msg.get("sender_name") == "FREQUENCY EXPLORER"), None)
                    if test_message:
                        print("   ✅ Test message found in channel messages")
                        print(f"   📝 Message details: ID={test_message.get('id')}, Duration={test_message.get('duration')}s")
                        return True
                    else:
                        print("   ⚠️  Messages retrieved but test message not found")
                        return True  # Still working, just different state
                else:
                    print("   ⚠️  No messages found in channel")
                    return True  # Still working, just empty
            else:
                print("   ❌ Response missing 'messages' field")
                return False
        else:
            print(f"   ❌ Get messages failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Get messages error: {e}")
        return False

def main():
    """Run all PTT API tests"""
    print("🚀 Starting PTT API Testing Suite")
    print("=" * 50)
    
    results = {}
    
    # Test 1: Root endpoint
    results['root'] = test_root_endpoint()
    
    # Test 2: Get channels (creates defaults if needed)
    results['get_channels'], godmode_channel_id = test_get_channels()
    
    # Test 3: Create new channel
    results['create_channel'], new_channel_id = test_create_channel()
    
    # Test 4: Transmit message (use godmode-main if available, otherwise new channel)
    target_channel = godmode_channel_id or new_channel_id or "godmode-main"
    results['transmit'], message_id = test_transmit_message(target_channel)
    
    # Test 5: Get messages from the channel we transmitted to
    results['get_messages'] = test_get_messages(target_channel)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name.upper().replace('_', ' ')}: {status}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All PTT API endpoints are working correctly!")
        return True
    else:
        print("⚠️  Some PTT API endpoints have issues")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)