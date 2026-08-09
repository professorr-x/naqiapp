from fastapi import APIRouter, Depends, HTTPException
from app.schemas.device_token import DeviceTokenCreate, DeviceTokenResponse
from app.database import register_device_token, deactivate_device_token
from app.middleware.auth import get_current_user
from typing import Dict, Any

router = APIRouter()


@router.post("/register", status_code=201)
async def register_device_token_endpoint(
    token_data: DeviceTokenCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Register FCM device token for push notifications

    Called when:
    - User logs in
    - App starts with authenticated user
    - Token refresh from FCM
    """
    try:
        # Prepare device info
        device_info = {
            'device_name': token_data.device_name,
            'device_os': token_data.device_os,
            'app_version': token_data.app_version
        }

        # Register token
        result = register_device_token(
            user_id=current_user['id'],
            firebase_uid=current_user['firebase_uid'],
            device_token=token_data.device_token,
            device_platform=token_data.device_platform,
            device_info=device_info
        )

        return {
            "message": "Device token registered successfully",
            "token_id": result['id']
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register token: {str(e)}")


@router.delete("/{token}")
async def unregister_device_token_endpoint(
    token: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Manually unregister device token

    Called when:
    - User logs out
    - User disables notifications
    """
    try:
        success = deactivate_device_token(token)

        if not success:
            raise HTTPException(status_code=404, detail="Device token not found")

        return {"message": "Device token unregistered successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unregister token: {str(e)}")
