"""
Admin Management API endpoints

This module provides endpoints for managing admin users including:
- List all admins
- Create new admin
- Update admin details
- Disable/Enable admin accounts
- Delete admin
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.user import UserResponse, AdminUserCreate, UpdateUserRoleRequest
from app.middleware.rbac import require_admin, get_current_user
from app.database import (
    get_user_by_firebase_uid,
    get_user_role,
    update_user_role,
    get_all_admin_users,
    create_user,
    get_user_by_email,
    cascade_delete_user_data,
    update_user_active_status,
    get_user_by_phone_number
)
from firebase_admin import auth as firebase_auth


router = APIRouter(prefix="/api/admins", tags=["admin-management"])


@router.get("", response_model=List[UserResponse])
async def list_admin_users(current_user: dict = Depends(get_current_user)):
    """List all admin users (admin only)."""
    # Check if current user is admin
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    admins = get_all_admin_users()
    return admins


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    user_data: AdminUserCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new admin user (admin only)."""
    # Check if current user is admin
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Check if user already exists
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    try:
        # Create Firebase user
        firebase_user = firebase_auth.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.display_name,
            email_verified=False
        )

        # Create Firestore user with admin role
        firestore_user = create_user(
            firebase_uid=firebase_user.uid,
            email=user_data.email,
            display_name=user_data.display_name,
            phone_number=None,
            role='admin'
        )

        return firestore_user
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already in use"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create admin user: {str(e)}"
        )


@router.patch("/{firebase_uid}/role", response_model=dict)
async def update_admin_role(
    firebase_uid: str,
    request: UpdateUserRoleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update an admin's role (admin only)."""
    # Check if current user is admin
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Prevent changing your own role
    if firebase_uid == current_user['firebase_uid']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )

    # Validate role
    if request.role not in ['user', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'user' or 'admin'"
        )

    # Update role
    success = update_user_role(firebase_uid, request.role)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {
        "message": f"User role updated to {request.role}",
        "firebase_uid": firebase_uid,
        "role": request.role
    }


@router.patch("/{firebase_uid}/status", response_model=dict)
async def toggle_admin_status(
    firebase_uid: str,
    is_active: bool,
    current_user: dict = Depends(get_current_user)
):
    """Enable or disable an admin account (admin only).

    When disabled:
    - Admin cannot log in
    - Existing sessions remain valid until token expires
    - All data is preserved (can be re-enabled later)

    Args:
        firebase_uid: Firebase UID of the admin to enable/disable
        is_active: True to enable, False to disable
    """
    # Check if current user is admin
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Prevent disabling yourself
    if firebase_uid == current_user['firebase_uid']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot disable your own account"
        )

    # Check if user is admin
    role = get_user_role(firebase_uid)
    if role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not an admin"
        )

    try:
        # Update active status in Firestore
        success = update_user_active_status(firebase_uid, is_active)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin user not found"
            )

        # Also disable/enable in Firebase Auth
        firebase_auth.update_user(
            firebase_uid,
            disabled=not is_active
        )

        status_text = "enabled" if is_active else "disabled"
        print(f"Admin {firebase_uid} {status_text}")

        return {
            "message": f"Admin account {status_text} successfully",
            "firebase_uid": firebase_uid,
            "is_active": is_active
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update admin status: {str(e)}"
        )


@router.get("/search/phone/{phone_number}", response_model=UserResponse)
async def search_user_by_phone(
    phone_number: str,
    current_user: dict = Depends(get_current_user)
):
    """Search for a user by phone number (admin only).

    Args:
        phone_number: Phone number with country code (e.g., +1234567890)

    Returns:
        User data if found

    Raises:
        404: User not found
    """
    # Check if current user is admin
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    user = get_user_by_phone_number(phone_number)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with phone number {phone_number} not found"
        )

    return user


@router.delete("/{firebase_uid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_user(
    firebase_uid: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an admin user permanently (admin only). Cannot delete yourself.

    This will permanently delete the user and ALL associated data including:
    - Firebase Auth account
    - User profile
    - Orders and vouchers
    - Chat sessions and messages
    - Device tokens and trusted devices
    - OTP sessions and password reset tokens

    WARNING: This action cannot be undone. Consider using the disable endpoint instead.
    """
    # Check if current user is admin
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Prevent deleting yourself
    if firebase_uid == current_user['firebase_uid']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account"
        )

    # Check if user is admin
    role = get_user_role(firebase_uid)
    if role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not an admin"
        )

    try:
        # Cascade delete all user data from Firestore
        deletion_counts = cascade_delete_user_data(firebase_uid)

        # Delete from Firebase Auth
        firebase_auth.delete_user(firebase_uid)

        print(f"Admin user {firebase_uid} deleted. Removed: {deletion_counts}")
        return None
    except firebase_auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete admin: {str(e)}"
        )
