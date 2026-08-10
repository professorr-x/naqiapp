import firebase_admin
from firebase_admin import credentials, auth, messaging
from app.config import settings
import json
import os
from typing import List, Dict, Any


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        # Check if service account JSON is provided as environment variable
        if hasattr(settings, 'FIREBASE_SERVICE_ACCOUNT_JSON') and settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            cred = credentials.Certificate(json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
        else:
            # Fallback to file path
            service_account_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), settings.FIREBASE_SERVICE_ACCOUNT_PATH)
            if not os.path.exists(service_account_path):
                raise FileNotFoundError(
                    f"Firebase service account file not found at {service_account_path}. "
                    "Please download it from Firebase Console and place it in the backend directory."
                )
            cred = credentials.Certificate(service_account_path)

        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully")


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify Firebase ID token and return decoded token with user info

    Args:
        id_token: Firebase ID token from client

    Returns:
        dict: Decoded token containing uid, phone_number, etc.

    Raises:
        ValueError: If token is invalid or expired
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except auth.InvalidIdTokenError:
        raise ValueError("Invalid ID token")
    except auth.ExpiredIdTokenError:
        raise ValueError("Token has expired")
    except auth.RevokedIdTokenError:
        raise ValueError("Token has been revoked")
    except Exception as e:
        raise ValueError(f"Token verification failed: {str(e)}")


def get_user_by_email(email: str) -> dict | None:
    """
    Get Firebase user by email address

    Args:
        email: User's email address

    Returns:
        dict: User information including uid, email, phone_number, etc.
        None: If user not found

    Raises:
        ValueError: If there's an error retrieving the user
    """
    try:
        user = auth.get_user_by_email(email)
        return {
            'uid': user.uid,
            'email': user.email,
            'phone_number': user.phone_number,
            'email_verified': user.email_verified,
            'display_name': user.display_name,
            'disabled': user.disabled
        }
    except auth.UserNotFoundError:
        return None
    except Exception as e:
        raise ValueError(f"Failed to get user: {str(e)}")


def get_user_by_phone_number(phone_number: str) -> dict | None:
    """
    Get Firebase user by phone number

    Args:
        phone_number: User's phone number (must include country code, e.g., +9647801234567)

    Returns:
        dict: User information including uid, email, phone_number, etc.
        None: If user not found

    Raises:
        ValueError: If there's an error retrieving the user
    """
    try:
        user = auth.get_user_by_phone_number(phone_number)
        return {
            'uid': user.uid,
            'email': user.email,
            'phone_number': user.phone_number,
            'email_verified': user.email_verified,
            'display_name': user.display_name,
            'disabled': user.disabled
        }
    except auth.UserNotFoundError:
        return None
    except Exception as e:
        raise ValueError(f"Failed to get user: {str(e)}")


def verify_phone_number_available(phone_number: str) -> bool:
    """
    Check if phone number is available for registration

    Args:
        phone_number: Phone number to check (must include country code)

    Returns:
        bool: True if phone number is available, False if already registered

    Raises:
        ValueError: If there's an error checking the phone number
    """
    try:
        auth.get_user_by_phone_number(phone_number)
        return False  # Phone number already exists
    except auth.UserNotFoundError:
        return True  # Phone number is available
    except Exception as e:
        raise ValueError(f"Failed to check phone number: {str(e)}")


def create_user_with_phone_and_password(
    phone_number: str,
    password: str,
    display_name: str = None,
    email: str = None
) -> dict:
    """
    Create Firebase user with phone number and password.

    Since Firebase doesn't support phone + password natively, we create an email/password
    account using the phone number as the email (e.g., 9647801234567@naqi.app).
    The actual phone number is stored in the user profile.

    Args:
        phone_number: User's phone number (must include country code, e.g., +9647801234567)
        password: User's password
        display_name: User's display name (optional)
        email: User's actual email address (optional, for account recovery)

    Returns:
        dict: Created user information

    Raises:
        ValueError: If there's an error creating the user
    """
    try:
        # Generate email from phone number (remove + and @naqi.app)
        phone_email = f"{phone_number.replace('+', '')}@naqi.app"

        user_data = {
            'email': phone_email,
            'password': password,
            'phone_number': phone_number,
            'email_verified': False  # Phone-based account, email not verified
        }

        if display_name:
            user_data['display_name'] = display_name

        user = auth.create_user(**user_data)

        return {
            'uid': user.uid,
            'phone_number': user.phone_number,
            'email': phone_email,  # Return the generated email
            'actual_email': email,  # Store user's real email separately if provided
            'display_name': user.display_name
        }
    except auth.EmailAlreadyExistsError:
        raise ValueError("Phone number already registered")
    except auth.PhoneNumberAlreadyExistsError:
        raise ValueError("Phone number already registered")
    except Exception as e:
        raise ValueError(f"Failed to create user: {str(e)}")


def update_user_password(firebase_uid: str, new_password: str) -> bool:
    """
    Update user password via Firebase Admin SDK

    Args:
        firebase_uid: Firebase user ID
        new_password: New password to set

    Returns:
        bool: True if password was updated successfully

    Raises:
        ValueError: If there's an error updating the password
    """
    try:
        auth.update_user(firebase_uid, password=new_password)
        return True
    except auth.UserNotFoundError:
        raise ValueError("User not found")
    except Exception as e:
        raise ValueError(f"Failed to update password: {str(e)}")


def send_fcm_multicast(
    tokens: List[str],
    title: str,
    body: str,
    data: Dict[str, str] = None
) -> messaging.BatchResponse:
    """
    Send FCM notification to multiple device tokens using HTTP v1 API

    Args:
        tokens: List of FCM device tokens
        title: Notification title
        body: Notification body/message
        data: Optional data payload for deep linking

    Returns:
        messaging.BatchResponse: Contains success_count, failure_count, and responses

    Raises:
        ValueError: If there's an error sending the notification
    """
    if not tokens:
        raise ValueError("No device tokens provided")

    try:
        # Create individual messages for each token (HTTP v1 API compatible)
        messages = []
        for token in tokens:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                token=token,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        sound='default',
                        channel_id='order_updates'
                    )
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound='default',
                            badge=1
                        )
                    )
                )
            )
            messages.append(message)

        # Use send_each instead of send_multicast (uses HTTP v1 API)
        response = messaging.send_each(messages)
        return response
    except Exception as e:
        raise ValueError(f"Failed to send notification: {str(e)}")
