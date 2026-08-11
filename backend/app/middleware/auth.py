from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.firebase_admin import verify_firebase_token
from app.database import get_user_by_firebase_uid, create_user
from typing import Dict, Any

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Validate Firebase token and return current user.
    Creates user in Firestore if first time login.

    Args:
        credentials: HTTP Bearer token from Authorization header

    Returns:
        dict: User data from Firestore

    Raises:
        HTTPException: If token is invalid or user is disabled
    """
    token = credentials.credentials

    try:
        # Verify Firebase token
        decoded_token = verify_firebase_token(token)
        firebase_uid = decoded_token['uid']
        email = decoded_token.get('email', '')
        phone_number = decoded_token.get('phone_number', '')
        email_verified = decoded_token.get('email_verified', False)

        # Get or create user in Firestore
        user = get_user_by_firebase_uid(firebase_uid)

        if not user:
            # First time login - create user
            user = create_user(
                firebase_uid=firebase_uid,
                email=email,
                phone_number=phone_number,
                display_name=decoded_token.get('name'),
                email_verified=email_verified
            )
            print(f"New user created: {email}")

        # Check if user is active
        if not user.get('is_active', True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )

        # Convert empty email string to None for proper validation
        if user.get('email') == '':
            user['email'] = None

        return user

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )
