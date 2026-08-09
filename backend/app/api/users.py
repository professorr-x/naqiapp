"""
Users API endpoints

This module provides endpoints for user management including:
- Current user information
- Admin user management
- Role updates
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.user import UserResponse, UpdateUserRoleRequest, AdminUserCreate
from app.middleware.rbac import require_admin, get_current_user
from app.database import (
    get_user_by_firebase_uid,
    get_user_role,
    update_user_role,
    get_all_admin_users,
    get_all_users,
    create_user,
    get_user_by_email,
    delete_user_from_firestore
)
from firebase_admin import auth as firebase_auth


router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info."""
    # Fetch full user data from Firestore
    user_data = get_user_by_firebase_uid(current_user['firebase_uid'])

    # If user doesn't exist in Firestore, create them automatically
    # This happens when users sign up via Firebase Auth but haven't been synced to Firestore yet
    if not user_data:
        try:
            # Get additional user info from Firebase Auth
            firebase_user = firebase_auth.get_user(current_user['firebase_uid'])

            # Create user in Firestore
            user_data = create_user(
                firebase_uid=current_user['firebase_uid'],
                email=firebase_user.email or current_user['email'],
                phone_number=firebase_user.phone_number,
                display_name=firebase_user.display_name,
                email_verified=firebase_user.email_verified,
                role='user'  # Default to user role
            )

            print(f"Auto-created Firestore user for: {current_user['firebase_uid']}")
        except Exception as e:
            print(f"Error auto-creating user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user profile: {str(e)}"
            )

    return user_data


@router.get("", response_model=List[UserResponse])
async def list_all_users(current_user: dict = Depends(get_current_user)):
    """List all users (admin only)."""
    # Check if current user is admin
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    users = get_all_users()
    return users


@router.get("/admins", response_model=List[UserResponse])
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


@router.post("/admins", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
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


@router.patch("/role", response_model=dict)
async def update_user_role_endpoint(
    request: UpdateUserRoleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a user's role (admin only)."""
    # Check if current user is admin
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Validate role
    if request.role not in ['user', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'user' or 'admin'"
        )

    # Update role
    success = update_user_role(request.firebase_uid, request.role)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {
        "message": f"User role updated to {request.role}",
        "firebase_uid": request.firebase_uid,
        "role": request.role
    }


@router.delete("/admins/{firebase_uid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_user(
    firebase_uid: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an admin user (admin only). Cannot delete yourself."""
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
        # Delete from Firebase Auth
        firebase_auth.delete_user(firebase_uid)

        # User will be automatically deleted from Firestore or marked inactive
        # depending on your implementation

        return None
    except firebase_auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


@router.delete("/{firebase_uid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    firebase_uid: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete any user (admin only). Cannot delete yourself."""
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
            detail="Cannot delete your own account"
        )

    try:
        # Delete from Firebase Auth
        firebase_auth.delete_user(firebase_uid)

        # Delete from Firestore
        delete_user_from_firestore(firebase_uid)

        return None
    except firebase_auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )
