"""
Firestore Database Module

This module provides Firestore database access using Firebase Admin SDK.
Collections:
- users: User accounts linked to Firebase Auth
- orders: Customer orders
- vouchers: Subscription vouchers
- settings: App configuration
- disabled_dates: Blocked delivery dates
"""

from firebase_admin import firestore
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List


# Get Firestore client
def get_firestore_db():
    """Get Firestore database client"""
    return firestore.client()


# Collection names
USERS_COLLECTION = "users"
ORDERS_COLLECTION = "orders"
VOUCHERS_COLLECTION = "vouchers"
SETTINGS_COLLECTION = "settings"
DISABLED_DATES_COLLECTION = "disabled_dates"
TRUSTED_DEVICES_COLLECTION = "trusted_devices"
OTP_SESSIONS_COLLECTION = "otp_sessions"
PASSWORD_RESET_TOKENS_COLLECTION = "password_reset_tokens"
CHAT_SESSIONS_COLLECTION = "chat_sessions"
MESSAGES_COLLECTION = "messages"
DEVICE_TOKENS_COLLECTION = "device_tokens"


# Helper functions
def sanitize_user_data(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert empty email strings to None for proper validation"""
    if user_data.get('email') == '':
        user_data['email'] = None
    return user_data


def get_user_by_firebase_uid(firebase_uid: str) -> Optional[Dict[str, Any]]:
    """Get user by Firebase UID"""
    db = get_firestore_db()
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where('firebase_uid', '==', firebase_uid).limit(1)
    docs = query.stream()

    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        return sanitize_user_data(data)

    return None


def create_user(
    firebase_uid: str,
    email: str,
    phone_number: Optional[str] = None,
    display_name: Optional[str] = None,
    email_verified: bool = False,
    country_code: Optional[str] = None,
    role: str = 'user',
    preferred_language: str = 'en'
) -> Dict[str, Any]:
    """Create a new user in Firestore"""
    db = get_firestore_db()
    user_data = {
        'firebase_uid': firebase_uid,
        'email': email if email else None,
        'phone_number': phone_number,
        'display_name': display_name,
        'country_code': country_code,
        'role': role,  # Default to 'user'
        'preferred_language': preferred_language,  # Default to 'en'
        'is_active': True,
        'email_verified': email_verified,
        'phone_verified': bool(phone_number),
        'created_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP
    }

    doc_ref = db.collection(USERS_COLLECTION).document()
    doc_ref.set(user_data)

    user_data['id'] = doc_ref.id
    user_data['created_at'] = datetime.now(timezone.utc)
    user_data['updated_at'] = datetime.now(timezone.utc)

    return user_data


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user by document ID"""
    db = get_firestore_db()
    doc_ref = db.collection(USERS_COLLECTION).document(user_id)
    doc = doc_ref.get()

    if doc.exists:
        data = doc.to_dict()
        data['id'] = doc.id
        return sanitize_user_data(data)

    return None


def update_user_language(user_id: str, language: str) -> bool:
    """Update user's preferred language"""
    if language not in ['en', 'ar']:
        raise ValueError("Invalid language. Must be 'en' or 'ar'")

    db = get_firestore_db()
    doc_ref = db.collection(USERS_COLLECTION).document(user_id)
    doc = doc_ref.get()

    if not doc.exists:
        return False

    doc_ref.update({
        'preferred_language': language,
        'updated_at': firestore.SERVER_TIMESTAMP
    })

    return True


def create_order(order_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new order in Firestore"""
    db = get_firestore_db()

    # Add timestamps and default status
    order_data['status'] = order_data.get('status', 'pending')
    order_data['created_at'] = firestore.SERVER_TIMESTAMP
    order_data['updated_at'] = firestore.SERVER_TIMESTAMP

    doc_ref = db.collection(ORDERS_COLLECTION).document()
    doc_ref.set(order_data)

    order_data['id'] = doc_ref.id
    order_data['created_at'] = datetime.now(timezone.utc)
    order_data['updated_at'] = datetime.now(timezone.utc)

    return order_data


def get_orders_by_user(user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Get orders for a specific user"""
    db = get_firestore_db()
    orders_ref = db.collection(ORDERS_COLLECTION)
    # Remove order_by to avoid requiring composite index
    query = orders_ref.where('user_id', '==', user_id).limit(limit)

    orders = []
    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        orders.append(data)

    # Sort in memory by created_at descending
    orders.sort(key=lambda x: x.get('created_at', ''), reverse=True)

    return orders


def get_all_orders(limit: int = 500) -> List[Dict[str, Any]]:
    """Get all orders for admin (sorted by created_at descending)"""
    db = get_firestore_db()
    orders_ref = db.collection(ORDERS_COLLECTION)
    query = orders_ref.limit(limit)

    orders = []
    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        orders.append(data)

    # Sort in memory by created_at descending
    orders.sort(key=lambda x: x.get('created_at', ''), reverse=True)

    return orders


def get_order_by_id(order_id: str) -> Optional[Dict[str, Any]]:
    """Get order by document ID"""
    db = get_firestore_db()
    doc_ref = db.collection(ORDERS_COLLECTION).document(order_id)
    doc = doc_ref.get()

    if doc.exists:
        data = doc.to_dict()
        data['id'] = doc.id
        return data

    return None


def get_orders_by_date(delivery_date: str, status_list: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Get orders for a specific delivery date with optional status filter"""
    db = get_firestore_db()
    orders_ref = db.collection(ORDERS_COLLECTION)
    query = orders_ref.where('delivery_date', '==', delivery_date)

    if status_list:
        query = query.where('status', 'in', status_list)

    orders = []
    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        orders.append(data)

    return orders


def update_order_status(order_id: str, status: str) -> Optional[Dict[str, Any]]:
    """Update order status"""
    db = get_firestore_db()
    doc_ref = db.collection(ORDERS_COLLECTION).document(order_id)

    doc_ref.update({
        'status': status,
        'updated_at': firestore.SERVER_TIMESTAMP
    })

    return get_order_by_id(order_id)


def is_date_disabled(date_str: str) -> Optional[Dict[str, Any]]:
    """Check if a date is disabled"""
    db = get_firestore_db()
    disabled_dates_ref = db.collection(DISABLED_DATES_COLLECTION)
    query = disabled_dates_ref.where('date', '==', date_str).limit(1)

    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        return data

    return None


def get_voucher_by_order_id(order_id: str) -> Optional[Dict[str, Any]]:
    """Get voucher by order ID"""
    db = get_firestore_db()
    vouchers_ref = db.collection(VOUCHERS_COLLECTION)
    query = vouchers_ref.where('order_id', '==', order_id).limit(1)

    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        return data

    return None


def get_voucher_by_id(voucher_id: str) -> Optional[Dict[str, Any]]:
    """Get voucher by document ID"""
    db = get_firestore_db()
    doc_ref = db.collection(VOUCHERS_COLLECTION).document(voucher_id)
    doc = doc_ref.get()

    if doc.exists:
        data = doc.to_dict()
        data['id'] = doc.id
        return data

    return None


def update_voucher_delivery_usage(voucher_id: str) -> Optional[Dict[str, Any]]:
    """Increment deliveries_used for a voucher"""
    db = get_firestore_db()
    doc_ref = db.collection(VOUCHERS_COLLECTION).document(voucher_id)
    doc = doc_ref.get()

    if not doc.exists:
        return None

    voucher = doc.to_dict()
    deliveries_used = voucher.get('deliveries_used', 0)
    deliveries_total = voucher.get('deliveries_total', 0)

    if deliveries_used >= deliveries_total:
        return None  # All deliveries already used

    # Increment usage
    new_deliveries_used = deliveries_used + 1
    update_data = {
        'deliveries_used': new_deliveries_used,
        'updated_at': firestore.SERVER_TIMESTAMP
    }

    # Update status if all deliveries used
    if new_deliveries_used >= deliveries_total:
        update_data['status'] = 'completed'

    doc_ref.update(update_data)

    return get_voucher_by_id(voucher_id)


def get_all_settings() -> List[Dict[str, Any]]:
    """Get all settings"""
    db = get_firestore_db()
    settings_ref = db.collection(SETTINGS_COLLECTION)

    settings = []
    for doc in settings_ref.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        settings.append(data)

    return settings


def get_setting_by_key(key: str) -> Optional[Dict[str, Any]]:
    """Get setting by key"""
    db = get_firestore_db()
    settings_ref = db.collection(SETTINGS_COLLECTION)
    query = settings_ref.where('key', '==', key).limit(1)

    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        return data

    return None


def update_setting(key: str, value: str) -> Dict[str, Any]:
    """Update or create a setting"""
    db = get_firestore_db()
    settings_ref = db.collection(SETTINGS_COLLECTION)

    # Check if setting exists
    query = settings_ref.where('key', '==', key).limit(1)
    existing_doc = None

    for doc in query.stream():
        existing_doc = doc
        break

    if existing_doc:
        # Update existing
        existing_doc.reference.update({
            'value': value,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        return {'id': existing_doc.id, 'key': key, 'value': value}
    else:
        # Create new
        new_doc_ref = settings_ref.document()
        new_doc_ref.set({
            'key': key,
            'value': value,
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        return {'id': new_doc_ref.id, 'key': key, 'value': value}


def get_all_disabled_dates() -> List[Dict[str, Any]]:
    """Get all disabled dates"""
    db = get_firestore_db()
    disabled_dates_ref = db.collection(DISABLED_DATES_COLLECTION)

    dates = []
    for doc in disabled_dates_ref.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        dates.append(data)

    return dates


def add_disabled_date(date_str: str, reason: Optional[str] = None) -> Dict[str, Any]:
    """Add a disabled date"""
    db = get_firestore_db()

    # Check if already exists
    existing = is_date_disabled(date_str)
    if existing:
        return existing

    disabled_date_data = {
        'date': date_str,
        'reason': reason,
        'created_at': firestore.SERVER_TIMESTAMP
    }

    doc_ref = db.collection(DISABLED_DATES_COLLECTION).document()
    doc_ref.set(disabled_date_data)

    disabled_date_data['id'] = doc_ref.id
    return disabled_date_data


def remove_disabled_date(date_str: str) -> bool:
    """Remove a disabled date"""
    db = get_firestore_db()
    disabled_dates_ref = db.collection(DISABLED_DATES_COLLECTION)
    query = disabled_dates_ref.where('date', '==', date_str).limit(1)

    for doc in query.stream():
        doc.reference.delete()
        return True

    return False


# ==================== User Lookup Functions ====================

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email address"""
    db = get_firestore_db()
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where('email', '==', email).limit(1)

    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        return sanitize_user_data(data)

    return None


def get_user_by_phone_number(phone_number: str) -> Optional[Dict[str, Any]]:
    """Get user by phone number"""
    db = get_firestore_db()
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where('phone_number', '==', phone_number).limit(1)

    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        return sanitize_user_data(data)

    return None


def check_phone_number_exists(phone_number: str) -> bool:
    """Check if phone number already exists in Firestore"""
    user = get_user_by_phone_number(phone_number)
    return user is not None


# ==================== Trusted Devices Functions ====================

def create_trusted_device(
    user_id: str,
    firebase_uid: str,
    device_fingerprint: str,
    device_name: str,
    device_os: str
) -> Dict[str, Any]:
    """Create a new trusted device entry"""
    db = get_firestore_db()

    # Calculate expiry date (30 days from now)
    from datetime import timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    device_data = {
        'user_id': user_id,
        'firebase_uid': firebase_uid,
        'device_fingerprint': device_fingerprint,
        'device_name': device_name,
        'device_os': device_os,
        'trusted_at': firestore.SERVER_TIMESTAMP,
        'expires_at': expires_at,
        'last_used_at': firestore.SERVER_TIMESTAMP,
        'is_active': True
    }

    doc_ref = db.collection(TRUSTED_DEVICES_COLLECTION).document()
    doc_ref.set(device_data)

    device_data['id'] = doc_ref.id
    device_data['trusted_at'] = datetime.now(timezone.utc)
    device_data['last_used_at'] = datetime.now(timezone.utc)

    return device_data


def get_trusted_device(firebase_uid: str, device_fingerprint: str) -> Optional[Dict[str, Any]]:
    """Get trusted device by firebase_uid and device_fingerprint"""
    db = get_firestore_db()
    devices_ref = db.collection(TRUSTED_DEVICES_COLLECTION)
    query = devices_ref.where('firebase_uid', '==', firebase_uid)\
                      .where('device_fingerprint', '==', device_fingerprint)\
                      .where('is_active', '==', True)\
                      .limit(1)

    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        return data

    return None


def is_device_trusted(firebase_uid: str, device_fingerprint: str) -> bool:
    """Check if a device is trusted and not expired"""
    device = get_trusted_device(firebase_uid, device_fingerprint)

    if not device:
        return False

    # Check if expired
    expires_at = device.get('expires_at')
    if expires_at and expires_at < datetime.now(timezone.utc):
        return False

    return True


def update_device_last_used(device_id: str) -> None:
    """Update the last_used_at timestamp for a device"""
    db = get_firestore_db()
    doc_ref = db.collection(TRUSTED_DEVICES_COLLECTION).document(device_id)
    doc_ref.update({
        'last_used_at': firestore.SERVER_TIMESTAMP
    })


def revoke_trusted_device(device_id: str) -> bool:
    """Revoke a trusted device by marking it as inactive"""
    db = get_firestore_db()
    doc_ref = db.collection(TRUSTED_DEVICES_COLLECTION).document(device_id)
    doc = doc_ref.get()

    if not doc.exists:
        return False

    doc_ref.update({
        'is_active': False,
        'updated_at': firestore.SERVER_TIMESTAMP
    })

    return True


def get_user_trusted_devices(firebase_uid: str) -> List[Dict[str, Any]]:
    """Get all active trusted devices for a user"""
    db = get_firestore_db()
    devices_ref = db.collection(TRUSTED_DEVICES_COLLECTION)
    query = devices_ref.where('firebase_uid', '==', firebase_uid)\
                      .where('is_active', '==', True)\
                      .order_by('trusted_at', direction=firestore.Query.DESCENDING)

    devices = []
    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        devices.append(data)

    return devices


def cleanup_expired_devices() -> int:
    """Delete expired trusted devices. Returns number of devices deleted."""
    db = get_firestore_db()
    devices_ref = db.collection(TRUSTED_DEVICES_COLLECTION)

    # Get devices that expired before now
    query = devices_ref.where('expires_at', '<', datetime.now(timezone.utc))

    count = 0
    for doc in query.stream():
        doc.reference.delete()
        count += 1

    return count


# ==================== OTP Sessions Functions ====================

def create_otp_session(
    user_id: str,
    firebase_uid: str,
    phone_number: str,
    session_type: str,
    device_fingerprint: str
) -> Dict[str, Any]:
    """Create a new OTP session"""
    db = get_firestore_db()

    # Calculate expiry (10 minutes from now)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    session_data = {
        'user_id': user_id,
        'firebase_uid': firebase_uid,
        'phone_number': phone_number,
        'session_type': session_type,
        'attempts': 0,
        'max_attempts': 3,
        'created_at': firestore.SERVER_TIMESTAMP,
        'expires_at': expires_at,
        'verified': False,
        'device_fingerprint': device_fingerprint
    }

    doc_ref = db.collection(OTP_SESSIONS_COLLECTION).document()
    doc_ref.set(session_data)

    session_data['id'] = doc_ref.id
    session_data['created_at'] = datetime.now(timezone.utc)

    return session_data


def get_otp_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get OTP session by ID"""
    db = get_firestore_db()
    doc_ref = db.collection(OTP_SESSIONS_COLLECTION).document(session_id)
    doc = doc_ref.get()

    if doc.exists:
        data = doc.to_dict()
        data['id'] = doc.id
        return data

    return None


def increment_otp_attempts(session_id: str) -> Dict[str, Any]:
    """Increment the attempts counter for an OTP session"""
    db = get_firestore_db()
    doc_ref = db.collection(OTP_SESSIONS_COLLECTION).document(session_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise ValueError("OTP session not found")

    session_data = doc.to_dict()
    attempts = session_data.get('attempts', 0) + 1

    doc_ref.update({
        'attempts': attempts,
        'updated_at': firestore.SERVER_TIMESTAMP
    })

    session_data['attempts'] = attempts
    session_data['id'] = session_id
    return session_data


def mark_otp_verified(session_id: str) -> Dict[str, Any]:
    """Mark an OTP session as verified"""
    db = get_firestore_db()
    doc_ref = db.collection(OTP_SESSIONS_COLLECTION).document(session_id)

    doc_ref.update({
        'verified': True,
        'verified_at': firestore.SERVER_TIMESTAMP
    })

    return get_otp_session(session_id)


def cleanup_expired_otp_sessions() -> int:
    """Delete expired OTP sessions. Returns number of sessions deleted."""
    db = get_firestore_db()
    sessions_ref = db.collection(OTP_SESSIONS_COLLECTION)

    # Get sessions that expired before now
    query = sessions_ref.where('expires_at', '<', datetime.now(timezone.utc))

    count = 0
    for doc in query.stream():
        doc.reference.delete()
        count += 1

    return count


# ==================== Password Reset Tokens Functions ====================

def create_reset_token(user_id: str, firebase_uid: str) -> Dict[str, Any]:
    """Create a password reset token"""
    import secrets
    db = get_firestore_db()

    # Generate secure random token
    token = secrets.token_urlsafe(32)

    # Calculate expiry (15 minutes from now)
    from datetime import timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    token_data = {
        'user_id': user_id,
        'firebase_uid': firebase_uid,
        'token': token,
        'created_at': firestore.SERVER_TIMESTAMP,
        'expires_at': expires_at,
        'used': False
    }

    doc_ref = db.collection(PASSWORD_RESET_TOKENS_COLLECTION).document()
    doc_ref.set(token_data)

    token_data['id'] = doc_ref.id
    token_data['created_at'] = datetime.now(timezone.utc)

    return token_data


def get_reset_token(token: str) -> Optional[Dict[str, Any]]:
    """Get password reset token by token string"""
    db = get_firestore_db()
    tokens_ref = db.collection(PASSWORD_RESET_TOKENS_COLLECTION)
    query = tokens_ref.where('token', '==', token).where('used', '==', False).limit(1)

    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id

        # Check if expired
        expires_at = data.get('expires_at')
        if expires_at and expires_at < datetime.now(timezone.utc):
            return None

        return data

    return None


def mark_token_used(token: str) -> bool:
    """Mark a password reset token as used"""
    db = get_firestore_db()
    tokens_ref = db.collection(PASSWORD_RESET_TOKENS_COLLECTION)
    query = tokens_ref.where('token', '==', token).limit(1)

    for doc in query.stream():
        doc.reference.update({
            'used': True,
            'used_at': firestore.SERVER_TIMESTAMP
        })
        return True

    return False


def cleanup_expired_tokens() -> int:
    """Delete expired or used reset tokens. Returns number of tokens deleted."""
    db = get_firestore_db()
    tokens_ref = db.collection(PASSWORD_RESET_TOKENS_COLLECTION)

    count = 0

    # Delete expired tokens
    query = tokens_ref.where('expires_at', '<', datetime.now(timezone.utc))
    for doc in query.stream():
        doc.reference.delete()
        count += 1

    # Delete used tokens older than 1 day
    from datetime import timedelta
    one_day_ago = datetime.now(timezone.utc) - timedelta(days=1)
    query = tokens_ref.where('used', '==', True).where('created_at', '<', one_day_ago)
    for doc in query.stream():
        doc.reference.delete()
        count += 1

    return count


# ==================== Role Management Functions ====================

def update_user_role(firebase_uid: str, role: str) -> bool:
    """Update user role. Only 'user' or 'admin' allowed."""
    if role not in ['user', 'admin']:
        raise ValueError("Invalid role. Must be 'user' or 'admin'")

    db = get_firestore_db()
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where('firebase_uid', '==', firebase_uid).limit(1).stream()

    for doc in query:
        doc.reference.update({
            'role': role,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        return True

    return False


def get_user_role(firebase_uid: str) -> Optional[str]:
    """Get user's role."""
    db = get_firestore_db()
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where('firebase_uid', '==', firebase_uid).limit(1)

    for doc in query.stream():
        return doc.to_dict().get('role', 'user')

    return None


def get_all_users() -> List[Dict[str, Any]]:
    """Get all users."""
    db = get_firestore_db()
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.order_by('created_at', direction=firestore.Query.DESCENDING).stream()

    users = []
    for doc in query:
        user = doc.to_dict()
        user['id'] = doc.id
        users.append(sanitize_user_data(user))

    return users


def get_all_admin_users() -> List[Dict[str, Any]]:
    """Get all users with admin role."""
    db = get_firestore_db()
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where('role', '==', 'admin').stream()

    admins = []
    for doc in query:
        admin = doc.to_dict()
        admin['id'] = doc.id
        admins.append(sanitize_user_data(admin))

    return admins


def delete_user_from_firestore(firebase_uid: str) -> bool:
    """Delete a user from Firestore."""
    db = get_firestore_db()
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where('firebase_uid', '==', firebase_uid).limit(1).stream()

    for doc in query:
        doc.reference.delete()
        return True

    return False


def migrate_existing_users_to_default_role() -> int:
    """Add 'role' field to all existing users (set to 'user')."""
    db = get_firestore_db()
    users_ref = db.collection(USERS_COLLECTION)
    batch = db.batch()
    count = 0

    for doc in users_ref.stream():
        user_data = doc.to_dict()
        if 'role' not in user_data:
            batch.update(doc.reference, {
                'role': 'user',
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            count += 1

    if count > 0:
        batch.commit()

    return count


# ==================== Chat Functions ====================

def create_chat_session(
    customer_uid: str,
    customer_name: str,
    customer_email: str
) -> Dict[str, Any]:
    """Create a new chat session."""
    db = get_firestore_db()
    session_ref = db.collection(CHAT_SESSIONS_COLLECTION).document()

    session_data = {
        'session_id': session_ref.id,
        'customer_uid': customer_uid,
        'customer_name': customer_name,
        'customer_email': customer_email,
        'status': 'active',
        'assigned_admin_uid': None,
        'assigned_admin_name': None,
        'created_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP,
        'last_message_at': firestore.SERVER_TIMESTAMP,
        'unread_count_customer': 0,
        'unread_count_admin': 0
    }

    session_ref.set(session_data)
    session_data['created_at'] = datetime.now(timezone.utc)
    session_data['updated_at'] = datetime.now(timezone.utc)
    session_data['last_message_at'] = datetime.now(timezone.utc)

    return session_data


def get_chat_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get chat session by ID."""
    db = get_firestore_db()
    doc_ref = db.collection(CHAT_SESSIONS_COLLECTION).document(session_id)
    doc = doc_ref.get()

    if doc.exists:
        data = doc.to_dict()
        data['session_id'] = doc.id
        return data

    return None


def get_active_session_for_customer(customer_uid: str) -> Optional[Dict[str, Any]]:
    """Get customer's active session."""
    db = get_firestore_db()
    sessions_ref = db.collection(CHAT_SESSIONS_COLLECTION)
    query = sessions_ref.where('customer_uid', '==', customer_uid)\
                       .where('status', '==', 'active')\
                       .limit(1).stream()

    for doc in query:
        data = doc.to_dict()
        data['session_id'] = doc.id
        return data

    return None


def get_all_active_sessions() -> List[Dict[str, Any]]:
    """Get all active sessions."""
    db = get_firestore_db()
    sessions_ref = db.collection(CHAT_SESSIONS_COLLECTION)
    query = sessions_ref.where('status', '==', 'active')\
                       .order_by('last_message_at', direction=firestore.Query.DESCENDING)\
                       .stream()

    sessions = []
    for doc in query:
        data = doc.to_dict()
        data['session_id'] = doc.id
        sessions.append(data)

    return sessions


def assign_admin_to_session(
    session_id: str,
    admin_uid: str,
    admin_name: str
) -> bool:
    """Assign admin to chat session."""
    db = get_firestore_db()
    session_ref = db.collection(CHAT_SESSIONS_COLLECTION).document(session_id)

    session_ref.update({
        'assigned_admin_uid': admin_uid,
        'assigned_admin_name': admin_name,
        'updated_at': firestore.SERVER_TIMESTAMP
    })

    return True


def create_message(
    session_id: str,
    sender_uid: str,
    sender_role: str,
    sender_name: str,
    message_type: str,
    content: str = '',
    image_url: Optional[str] = None,
    location: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a new message."""
    db = get_firestore_db()
    message_ref = db.collection(MESSAGES_COLLECTION).document()

    message_data = {
        'message_id': message_ref.id,
        'session_id': session_id,
        'sender_uid': sender_uid,
        'sender_role': sender_role,
        'sender_name': sender_name,
        'message_type': message_type,
        'content': content,
        'image_url': image_url,
        'location': location,
        'created_at': firestore.SERVER_TIMESTAMP,
        'read_by_customer': sender_role == 'user',
        'read_by_admin': sender_role == 'admin'
    }

    message_ref.set(message_data)
    message_data['created_at'] = datetime.now(timezone.utc)

    return message_data


def update_chat_session_last_message(session_id: str) -> None:
    """Update session's last message timestamp."""
    db = get_firestore_db()
    session_ref = db.collection(CHAT_SESSIONS_COLLECTION).document(session_id)

    session_ref.update({
        'last_message_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP
    })


def get_session_messages(session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get messages for a session."""
    db = get_firestore_db()
    messages_ref = db.collection(MESSAGES_COLLECTION)
    query = messages_ref.where('session_id', '==', session_id)\
                       .order_by('created_at', direction=firestore.Query.ASCENDING)\
                       .limit(limit).stream()

    messages = []
    for doc in query:
        data = doc.to_dict()
        data['message_id'] = doc.id
        messages.append(data)

    return messages


def close_chat_session(session_id: str) -> bool:
    """Close a chat session."""
    db = get_firestore_db()
    session_ref = db.collection(CHAT_SESSIONS_COLLECTION).document(session_id)

    session_ref.update({
        'status': 'closed',
        'updated_at': firestore.SERVER_TIMESTAMP
    })

    return True


# ==================== Device Token Functions ====================

def register_device_token(
    user_id: str,
    firebase_uid: str,
    device_token: str,
    device_platform: str,
    device_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Register or update device token for push notifications.
    If token already exists, update last_used_at and is_active=True.
    If not, create new document.
    """
    db = get_firestore_db()
    tokens_ref = db.collection(DEVICE_TOKENS_COLLECTION)

    # Check if token already exists
    query = tokens_ref.where('device_token', '==', device_token).limit(1)
    existing_doc = None

    for doc in query.stream():
        existing_doc = doc
        break

    if existing_doc:
        # Update existing token - reassign to current user
        existing_doc.reference.update({
            'user_id': user_id,  # Update user_id when token is reused
            'firebase_uid': firebase_uid,  # Update firebase_uid too
            'is_active': True,
            'last_used_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'device_platform': device_platform,
            'device_name': device_info.get('device_name'),
            'device_os': device_info.get('device_os'),
            'app_version': device_info.get('app_version')
        })

        data = existing_doc.to_dict()
        data['id'] = existing_doc.id
        data['user_id'] = user_id  # Return updated user_id
        data['firebase_uid'] = firebase_uid  # Return updated firebase_uid
        data['last_used_at'] = datetime.now(timezone.utc)
        data['updated_at'] = datetime.now(timezone.utc)
        return data
    else:
        # Create new token
        token_data = {
            'user_id': user_id,
            'firebase_uid': firebase_uid,
            'device_token': device_token,
            'device_platform': device_platform,
            'device_name': device_info.get('device_name'),
            'device_os': device_info.get('device_os'),
            'app_version': device_info.get('app_version'),
            'is_active': True,
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'last_used_at': firestore.SERVER_TIMESTAMP
        }

        doc_ref = tokens_ref.document()
        doc_ref.set(token_data)

        token_data['id'] = doc_ref.id
        token_data['created_at'] = datetime.now(timezone.utc)
        token_data['updated_at'] = datetime.now(timezone.utc)
        token_data['last_used_at'] = datetime.now(timezone.utc)

        return token_data


def get_user_device_tokens(user_id: str) -> List[str]:
    """
    Get all active device tokens for a user.
    Returns list of token strings.
    """
    db = get_firestore_db()
    tokens_ref = db.collection(DEVICE_TOKENS_COLLECTION)
    query = tokens_ref.where('user_id', '==', user_id)\
                     .where('is_active', '==', True)

    tokens = []
    for doc in query.stream():
        data = doc.to_dict()
        if data.get('device_token'):
            tokens.append(data['device_token'])

    return tokens


def deactivate_device_token(device_token: str) -> bool:
    """
    Mark token as inactive (when FCM reports invalid).
    Returns True if token was found and deactivated.
    """
    db = get_firestore_db()
    tokens_ref = db.collection(DEVICE_TOKENS_COLLECTION)
    query = tokens_ref.where('device_token', '==', device_token).limit(1)

    for doc in query.stream():
        doc.reference.update({
            'is_active': False,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        return True

    return False


def update_token_last_used(device_token: str) -> None:
    """
    Update last_used_at timestamp for a device token.
    """
    db = get_firestore_db()
    tokens_ref = db.collection(DEVICE_TOKENS_COLLECTION)
    query = tokens_ref.where('device_token', '==', device_token).limit(1)

    for doc in query.stream():
        doc.reference.update({
            'last_used_at': firestore.SERVER_TIMESTAMP
        })
        return


def cleanup_old_device_tokens(days: int = 90) -> int:
    """
    Delete tokens not used in X days.
    Returns number of tokens deleted.
    """
    db = get_firestore_db()
    tokens_ref = db.collection(DEVICE_TOKENS_COLLECTION)

    # Calculate cutoff date
    from datetime import timedelta
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Get tokens not used since cutoff
    query = tokens_ref.where('last_used_at', '<', cutoff_date)

    count = 0
    for doc in query.stream():
        doc.reference.delete()
        count += 1

    return count
