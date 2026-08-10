"""
Quick diagnostic script to check device tokens in Firestore
Run this to see if any device tokens are registered
"""
from app.firebase_admin import initialize_firebase
from app.database import db

# Initialize Firebase
initialize_firebase()

# Get all device tokens
tokens_ref = db.collection('device_tokens')
tokens = tokens_ref.stream()

print("\n=== DEVICE TOKENS IN DATABASE ===\n")

token_count = 0
user_tokens = {}

for token_doc in tokens:
    token_count += 1
    data = token_doc.to_dict()
    user_id = data.get('user_id')

    if user_id not in user_tokens:
        user_tokens[user_id] = []
    user_tokens[user_id].append(data)

    print(f"Token {token_count}:")
    print(f"  User ID: {user_id}")
    print(f"  Firebase UID: {data.get('firebase_uid')}")
    print(f"  Device: {data.get('device_platform')} - {data.get('device_name')}")
    print(f"  OS: {data.get('device_os')}")
    print(f"  Active: {data.get('is_active', False)}")
    print(f"  Token: {data.get('device_token')[:50]}...")
    print(f"  Created: {data.get('created_at')}")
    print(f"  Last used: {data.get('last_used_at')}")

    # Identify emulator
    device_name = data.get('device_name', '').lower()
    device_os = data.get('device_os', '').lower()
    if any(word in device_name for word in ['emulator', 'simulator', 'sdk', 'generic']):
        print(f"  🖥️  EMULATOR DETECTED")
    elif 'emulator' in device_os or 'sdk' in device_os:
        print(f"  🖥️  EMULATOR DETECTED (via OS)")
    else:
        print(f"  📱 PHYSICAL DEVICE")
    print()

if token_count == 0:
    print("❌ NO DEVICE TOKENS FOUND!")
    print("\nThis means your mobile app hasn't registered for push notifications.")
    print("Solution:")
    print("1. Open the NAQI app on your mobile device")
    print("2. Log out completely")
    print("3. Log back in")
    print("4. Grant notification permissions when prompted")
    print("5. Run this script again to verify the token is registered")
else:
    print(f"✅ Found {token_count} device token(s)")
    print(f"\nUsers with tokens: {len(user_tokens)}")
    for uid, tokens in user_tokens.items():
        print(f"  - User {uid}: {len(tokens)} device(s)")
