from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    display_name: str


class UserCreate(UserBase):
    password: str
    phone_number: Optional[str] = None


class UserResponse(UserBase):
    firebase_uid: str
    role: str
    phone_number: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UpdateUserRoleRequest(BaseModel):
    firebase_uid: str
    role: str  # "user" or "admin"


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    # Admins don't need phone initially
