"""
Authentication Schemas

Pydantic models for OTP authentication and forgot password flows.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ==================== Login OTP Schemas ====================

class CheckDeviceRequest(BaseModel):
    """Request to check if device needs OTP"""
    email: EmailStr
    device_fingerprint: str
    device_name: Optional[str] = None
    device_os: Optional[str] = None


class CheckDeviceResponse(BaseModel):
    """Response indicating if OTP is required"""
    requires_otp: bool
    user_exists: bool
    phone_number_masked: Optional[str] = None
    session_id: Optional[str] = None


class CreateLoginSessionRequest(BaseModel):
    """Request to create an OTP session for login"""
    email: EmailStr
    device_fingerprint: str


class CreateLoginSessionResponse(BaseModel):
    """Response with session details"""
    session_id: str
    phone_number_masked: str
    expires_in_seconds: int


class VerifyLoginOTPRequest(BaseModel):
    """Request to verify login OTP"""
    session_id: str
    remember_device: bool = False


class VerifyLoginOTPResponse(BaseModel):
    """Response after OTP verification"""
    success: bool
    message: str
    device_trusted: bool = False


# ==================== Forgot Password Schemas ====================

class InitiateForgotPasswordRequest(BaseModel):
    """Request to initiate forgot password flow"""
    email: EmailStr


class InitiateForgotPasswordResponse(BaseModel):
    """Response with masked phone number"""
    success: bool
    phone_number_masked: str
    session_id: str
    phone_number: Optional[str] = None  # Full phone number for Twilio verification


class VerifyForgotPasswordOTPRequest(BaseModel):
    """Request to verify OTP for password reset"""
    session_id: str
    otp_code: str  # OTP code entered by user


class VerifyForgotPasswordOTPResponse(BaseModel):
    """Response with reset token"""
    success: bool
    reset_token: str
    expires_in_seconds: int


class ResetPasswordRequest(BaseModel):
    """Request to reset password"""
    reset_token: str
    new_password: str


class ResetPasswordResponse(BaseModel):
    """Response after password reset"""
    success: bool
    message: str


# ==================== Trusted Devices Schemas ====================

class TrustedDeviceResponse(BaseModel):
    """Trusted device information"""
    id: str
    device_name: str
    device_os: str
    trusted_at: datetime
    last_used_at: datetime
    expires_at: datetime


class TrustedDevicesListResponse(BaseModel):
    """List of trusted devices"""
    devices: list[TrustedDeviceResponse]


class RevokeDeviceResponse(BaseModel):
    """Response after revoking a device"""
    success: bool
    message: str


# ==================== Sign Up Schemas ====================

class CheckPhoneAvailabilityRequest(BaseModel):
    """Check if phone number is available for registration"""
    phone_number: str
    country_code: str = "+964"


class CheckPhoneAvailabilityResponse(BaseModel):
    """Response for phone availability check"""
    available: bool
    message: str


class SignUpWithPhonePasswordRequest(BaseModel):
    """Sign up with phone number and password"""
    phone_number: str
    password: str
    confirm_password: str
    display_name: str
    email: Optional[EmailStr] = None  # Optional for account recovery
    country_code: str = "+964"
    device_fingerprint: str
    device_name: Optional[str] = None
    device_os: Optional[str] = None


class SignUpWithPhonePasswordResponse(BaseModel):
    """Response after phone + password signup"""
    success: bool
    message: str
    requires_phone_verification: bool
    session_id: Optional[str] = None
    user_id: Optional[str] = None


class InitiatePhoneSignUpRequest(BaseModel):
    """Initiate OTP-based phone signup (passwordless)"""
    phone_number: str
    display_name: str
    country_code: str = "+964"
    email: Optional[EmailStr] = None
    device_fingerprint: str


class InitiatePhoneSignUpResponse(BaseModel):
    """Response for OTP signup initiation"""
    success: bool
    message: str
    session_id: str
    phone_number: str
    expires_in_seconds: int


class CompletePhoneSignUpRequest(BaseModel):
    """Complete phone signup after OTP verification"""
    session_id: str
    firebase_uid: str  # From Firebase after OTP verification
    remember_device: bool = False


class CompletePhoneSignUpResponse(BaseModel):
    """Response after completing signup"""
    success: bool
    message: str
    user_id: str
    device_trusted: bool = False


# ==================== Phone Login Schemas ====================

class PhoneLoginRequest(BaseModel):
    """Login with phone number and password"""
    phone_number: str
    password: str
    device_fingerprint: str
    country_code: str = "+964"
    device_name: Optional[str] = None
    device_os: Optional[str] = None


class PhoneLoginResponse(BaseModel):
    """Response for phone login"""
    requires_otp: bool
    message: str
    session_id: Optional[str] = None
    phone_number_masked: Optional[str] = None
    phone_number: Optional[str] = None  # Full phone number for Twilio verification


class SendOTPRequest(BaseModel):
    """Request OTP to phone number"""
    phone_number: str
    country_code: str = "+964"


class SendOTPResponse(BaseModel):
    """Response after sending OTP"""
    success: bool
    message: str
    session_id: str
    expires_in_seconds: int
    phone_number: Optional[str] = None  # Full phone number for Twilio verification


class VerifyOTPLoginRequest(BaseModel):
    """Verify OTP and login"""
    session_id: str
    remember_device: bool = False


class VerifyOTPLoginResponse(BaseModel):
    """Response after OTP login verification"""
    success: bool
    message: str
    device_trusted: bool = False
