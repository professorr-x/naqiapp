"""
Role-Based Access Control (RBAC) Middleware

This module provides authentication and authorization middleware for FastAPI.
It verifies Firebase ID tokens and enforces role-based access control.
"""

from functools import wraps
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from app.database import get_user_role


security = HTTPBearer()


def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Firebase ID token and return decoded token."""
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )


def get_current_user(token: dict = Depends(verify_firebase_token)):
    """Get current user info from token."""
    firebase_uid = token.get('uid')
    role = get_user_role(firebase_uid)

    return {
        'firebase_uid': firebase_uid,
        'email': token.get('email'),
        'role': role or 'user'
    }


def require_role(allowed_roles: list[str]):
    """Decorator to require specific roles."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: dict = Depends(get_current_user), **kwargs):
            if current_user['role'] not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {allowed_roles}"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


# Convenience decorators
require_admin = require_role(['admin'])
require_user_or_admin = require_role(['user', 'admin'])
