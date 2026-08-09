from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class DeviceTokenCreate(BaseModel):
    device_token: str
    device_platform: Literal["android", "ios"]
    device_name: Optional[str] = None
    device_os: Optional[str] = None
    app_version: Optional[str] = None


class DeviceTokenResponse(BaseModel):
    id: str
    user_id: str
    firebase_uid: str
    device_token: str
    device_platform: str
    device_name: Optional[str] = None
    device_os: Optional[str] = None
    app_version: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_used_at: datetime

    class Config:
        from_attributes = True
