from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.middleware.auth import get_current_user
from app.schemas.user import UserResponse
from app.schemas.auth import (
    CheckDeviceRequest, CheckDeviceResponse,
    CreateLoginSessionRequest, CreateLoginSessionResponse,
    VerifyLoginOTPRequest, VerifyLoginOTPResponse,
    InitiateForgotPasswordRequest, InitiateForgotPasswordResponse,
    VerifyForgotPasswordOTPRequest, VerifyForgotPasswordOTPResponse,
    ResetPasswordRequest, ResetPasswordResponse,
    TrustedDeviceResponse, TrustedDevicesListResponse,
    RevokeDeviceResponse,
    # Sign Up Schemas
    CheckPhoneAvailabilityRequest, CheckPhoneAvailabilityResponse,
    SignUpWithPhonePasswordRequest, SignUpWithPhonePasswordResponse,
    InitiatePhoneSignUpRequest, InitiatePhoneSignUpResponse,
    CompletePhoneSignUpRequest, CompletePhoneSignUpResponse,
    # Phone Login Schemas
    PhoneLoginRequest, PhoneLoginResponse,
    SendOTPRequest, SendOTPResponse,
    VerifyOTPLoginRequest, VerifyOTPLoginResponse
)
from app import database
from app import firebase_admin
from firebase_admin import auth
from datetime import datetime, timedelta, timezone

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current authenticated user profile"""
    return current_user


@router.post("/verify")
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Verify token is valid - used for token refresh checks"""
    return {
        "valid": True,
        "user_id": current_user.get('id'),
        "phone_number": current_user.get('phone_number'),
        "display_name": current_user.get('display_name')
    }


def mask_phone_number(phone: str) -> str:
    """Mask phone number for security (e.g., +9647801234567 -> +964***4567)"""
    if not phone or len(phone) < 8:
        return "***"
    return f"{phone[:4]}***{phone[-4:]}"


def extract_country_code(phone_number: str) -> str:
    """
    Extract country code from phone number in E.164 format.
    E.g., +9647801234567 -> +964, +447931904370 -> +44, +31683255285 -> +31

    Common country code lengths:
    - 1 digit: +1 (USA, Canada)
    - 2 digits: +44 (UK), +31 (Netherlands), +81 (Japan), +86 (China), etc.
    - 3 digits: +964 (Iraq), +971 (UAE), +966 (Saudi Arabia), etc.
    """
    if not phone_number or not phone_number.startswith('+'):
        return "+964"  # Default fallback

    # Try to extract country code (1-3 digits after +)
    # We'll check common patterns from longest to shortest
    phone_digits = phone_number[1:]  # Remove + sign

    # 3-digit country codes (most specific first)
    if len(phone_digits) >= 3:
        potential_code = phone_digits[:3]
        # Common 3-digit codes
        if potential_code in ['964', '971', '966', '968', '965', '967', '974', '973', '962', '970', '961', '963', '972']:
            return f"+{potential_code}"

    # 2-digit country codes
    if len(phone_digits) >= 2:
        potential_code = phone_digits[:2]
        # Common 2-digit codes (checking for non-overlap with 3-digit)
        if potential_code in ['44', '31', '32', '33', '34', '36', '39', '41', '43', '45', '46', '47', '48', '49',
                              '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66',
                              '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98']:
            return f"+{potential_code}"

    # 1-digit country codes (USA/Canada)
    if len(phone_digits) >= 1 and phone_digits[0] == '1':
        return "+1"

    # Default fallback
    return "+964"


# ==================== Sign Up Endpoints ====================

@router.post("/signup/check-phone", response_model=CheckPhoneAvailabilityResponse)
async def check_phone_availability(request: CheckPhoneAvailabilityRequest):
    """
    Check if phone number is available for registration.
    Call this before showing the signup form.
    """
    phone_number = request.phone_number
    if not phone_number.startswith('+'):
        phone_number = f"{request.country_code}{phone_number}"

    try:
        # Check in Firebase Auth
        is_available = firebase_admin.verify_phone_number_available(phone_number)

        if is_available:
            return CheckPhoneAvailabilityResponse(
                available=True,
                message="Phone number is available"
            )
        else:
            return CheckPhoneAvailabilityResponse(
                available=False,
                message="Phone number already registered"
            )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/signup/phone-password", response_model=SignUpWithPhonePasswordResponse)
async def signup_with_phone_password(request: SignUpWithPhonePasswordRequest):
    """
    Sign up with phone number and password.

    Flow:
    1. Backend creates user in Firebase Auth
    2. Backend sends OTP for phone verification
    3. Client verifies OTP with Firebase
    4. Client calls /signup/verify-phone endpoint
    """
    # Validate passwords match
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    # Validate password strength
    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # Normalize phone number
    phone_number = request.phone_number
    if not phone_number.startswith('+'):
        phone_number = f"{request.country_code}{phone_number}"

    # Check if phone already exists
    if not firebase_admin.verify_phone_number_available(phone_number):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )

    # Check if email already exists (if provided)
    if request.email:
        existing_user = firebase_admin.get_user_by_email(request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    try:
        # Create user in Firebase Auth
        firebase_user = firebase_admin.create_user_with_phone_and_password(
            phone_number=phone_number,
            password=request.password,
            display_name=request.display_name,
            email=request.email
        )

        # Extract actual country code from the phone number
        actual_country_code = extract_country_code(phone_number)

        # Create user in Firestore
        user = database.create_user(
            firebase_uid=firebase_user['uid'],
            email=request.email or '',
            phone_number=phone_number,
            display_name=request.display_name,
            email_verified=False,
            country_code=actual_country_code,
            role='user'
        )

        # Create OTP session for phone verification
        session = database.create_otp_session(
            user_id=user['id'],
            firebase_uid=firebase_user['uid'],
            phone_number=phone_number,
            session_type='phone_verification',
            device_fingerprint=request.device_fingerprint
        )

        return SignUpWithPhonePasswordResponse(
            success=True,
            message="Account created. Please verify your phone number.",
            requires_phone_verification=True,
            session_id=session['id'],
            user_id=user['id']
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/signup/verify-phone")
async def verify_phone_after_signup(request: VerifyLoginOTPRequest):
    """
    Verify phone number after signup.
    Client should verify OTP with Firebase first, then call this endpoint.

    This marks the phone as verified and optionally trusts the device.
    """
    # Get OTP session
    session = database.get_otp_session(request.session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification session not found"
        )

    # Check if session expired
    expires_at = session.get('expires_at')
    if expires_at:
        # Handle both timezone-aware and timezone-naive datetimes
        now = datetime.now(timezone.utc) if (hasattr(expires_at, 'tzinfo') and expires_at.tzinfo) else datetime.utcnow()
        if expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification session expired"
            )

    # Check session type
    if session.get('session_type') != 'phone_verification':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session type"
        )

    # Mark session as verified
    database.mark_otp_verified(request.session_id)

    # Update user's phone_verified status in Firestore
    db = database.get_firestore_db()
    users_ref = db.collection(database.USERS_COLLECTION)
    query = users_ref.where('firebase_uid', '==', session['firebase_uid']).limit(1)

    for doc in query.stream():
        doc.reference.update({
            'phone_verified': True,
            'updated_at': database.firestore.SERVER_TIMESTAMP
        })

    device_trusted = False

    # Trust device if requested
    if request.remember_device:
        database.create_trusted_device(
            user_id=session['user_id'],
            firebase_uid=session['firebase_uid'],
            device_fingerprint=session['device_fingerprint'],
            device_name="Mobile Device",
            device_os="Unknown"
        )
        device_trusted = True

    return {
        "success": True,
        "message": "Phone number verified successfully",
        "device_trusted": device_trusted
    }


@router.post("/signup/otp-initiate", response_model=InitiatePhoneSignUpResponse)
async def initiate_otp_signup(request: InitiatePhoneSignUpRequest):
    """
    Initiate OTP-based signup (passwordless registration).

    Flow:
    1. Backend checks if phone is available
    2. Backend creates a pending signup session
    3. Client sends OTP via Firebase
    4. Client verifies OTP with Firebase
    5. Client calls /signup/otp-complete with Firebase UID
    """
    # Normalize phone number
    phone_number = request.phone_number
    if not phone_number.startswith('+'):
        phone_number = f"{request.country_code}{phone_number}"

    # Check if phone already exists
    if not firebase_admin.verify_phone_number_available(phone_number):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )

    # Check if email already exists (if provided)
    if request.email:
        existing_user = firebase_admin.get_user_by_email(request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    # Create a temporary OTP session with signup data
    db = database.get_firestore_db()

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Extract actual country code from the phone number
    actual_country_code = extract_country_code(phone_number)

    session_data = {
        'phone_number': phone_number,
        'display_name': request.display_name,
        'email': request.email or '',
        'session_type': 'otp_signup',
        'device_fingerprint': request.device_fingerprint,
        'created_at': database.firestore.SERVER_TIMESTAMP,
        'expires_at': expires_at,
        'verified': False,
        'country_code': actual_country_code
    }

    doc_ref = db.collection(database.OTP_SESSIONS_COLLECTION).document()
    doc_ref.set(session_data)

    return InitiatePhoneSignUpResponse(
        success=True,
        message="OTP will be sent to your phone number",
        session_id=doc_ref.id,
        phone_number=phone_number,
        expires_in_seconds=600
    )


@router.post("/signup/otp-complete", response_model=CompletePhoneSignUpResponse)
async def complete_otp_signup(request: CompletePhoneSignUpRequest):
    """
    Complete OTP-based signup after Firebase OTP verification.

    Client should:
    1. Verify OTP with Firebase signInWithPhoneNumber
    2. Get the Firebase user UID
    3. Call this endpoint with session_id and firebase_uid
    """
    # Get OTP session
    session = database.get_otp_session(request.session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signup session not found"
        )

    # Check if session expired
    expires_at_check = session.get('expires_at')
    if expires_at_check:
        # Handle both timezone-aware and timezone-naive datetimes
        now = datetime.now(timezone.utc) if (hasattr(expires_at_check, 'tzinfo') and expires_at_check.tzinfo) else datetime.utcnow()
        if expires_at_check < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup session expired"
            )

    # Check session type
    if session.get('session_type') != 'otp_signup':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session type"
        )

    # Verify the Firebase UID exists
    try:
        firebase_user = auth.get_user(request.firebase_uid)
    except auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firebase user not found"
        )

    # Verify phone numbers match
    if firebase_user.phone_number != session.get('phone_number'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number mismatch"
        )

    # Update Firebase user with display name and email if needed
    update_data = {}
    if session.get('display_name') and not firebase_user.display_name:
        update_data['display_name'] = session.get('display_name')
    if session.get('email') and not firebase_user.email:
        update_data['email'] = session.get('email')
        update_data['email_verified'] = False

    if update_data:
        auth.update_user(request.firebase_uid, **update_data)

    # Create user in Firestore
    user = database.create_user(
        firebase_uid=request.firebase_uid,
        email=session.get('email', ''),
        phone_number=session.get('phone_number'),
        display_name=session.get('display_name'),
        email_verified=False,
        country_code=session.get('country_code'),
        role='user'
    )

    # Mark session as verified
    database.mark_otp_verified(request.session_id)

    # Mark phone as verified in Firestore
    db = database.get_firestore_db()
    user_ref = db.collection(database.USERS_COLLECTION).document(user['id'])
    user_ref.update({
        'phone_verified': True,
        'updated_at': database.firestore.SERVER_TIMESTAMP
    })

    device_trusted = False

    # Trust device if requested
    if request.remember_device:
        database.create_trusted_device(
            user_id=user['id'],
            firebase_uid=request.firebase_uid,
            device_fingerprint=session.get('device_fingerprint'),
            device_name="Mobile Device",
            device_os="Unknown"
        )
        device_trusted = True

    return CompletePhoneSignUpResponse(
        success=True,
        message="Account created successfully",
        user_id=user['id'],
        device_trusted=device_trusted
    )


# ==================== Login OTP Endpoints ====================

@router.post("/login/check-device", response_model=CheckDeviceResponse)
async def check_device(request: CheckDeviceRequest):
    """
    Check if device needs OTP for login.
    Returns whether OTP is required based on device trust status.
    """
    # Look up user by email using Firebase Admin
    firebase_user = firebase_admin.get_user_by_email(request.email)

    if not firebase_user:
        # User doesn't exist - return user_exists=False
        # Don't reveal if user exists for security
        return CheckDeviceResponse(
            requires_otp=True,
            user_exists=False
        )

    firebase_uid = firebase_user['uid']
    phone_number = firebase_user.get('phone_number')

    if not phone_number:
        # User has no phone number - cannot use OTP
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no phone number registered. Please contact support."
        )

    # Check if device is trusted
    is_trusted = database.is_device_trusted(firebase_uid, request.device_fingerprint)

    if is_trusted:
        # Update last used timestamp
        device = database.get_trusted_device(firebase_uid, request.device_fingerprint)
        if device:
            database.update_device_last_used(device['id'])

        return CheckDeviceResponse(
            requires_otp=False,
            user_exists=True
        )

    # Device not trusted - OTP required
    # Get user from Firestore to create session
    user = database.get_user_by_firebase_uid(firebase_uid)
    if not user:
        # Create user in Firestore if not exists (first time login)
        user = database.create_user(
            firebase_uid=firebase_uid,
            email=firebase_user['email'],
            phone_number=phone_number,
            display_name=firebase_user.get('display_name'),
            email_verified=firebase_user.get('email_verified', False),
            country_code=extract_country_code(phone_number)
        )

    # Create OTP session
    session = database.create_otp_session(
        user_id=user['id'],
        firebase_uid=firebase_uid,
        phone_number=phone_number,
        session_type='login',
        device_fingerprint=request.device_fingerprint
    )

    return CheckDeviceResponse(
        requires_otp=True,
        user_exists=True,
        phone_number_masked=mask_phone_number(phone_number),
        session_id=session['id']
    )


@router.post("/login/create-session", response_model=CreateLoginSessionResponse)
async def create_login_session(request: CreateLoginSessionRequest):
    """
    Create an OTP session for login (alternative endpoint).
    Similar to check-device but always creates a session.
    """
    # Look up user by email
    firebase_user = firebase_admin.get_user_by_email(request.email)

    if not firebase_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    firebase_uid = firebase_user['uid']
    phone_number = firebase_user.get('phone_number')

    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no phone number registered"
        )

    # Get or create user in Firestore
    user = database.get_user_by_firebase_uid(firebase_uid)
    if not user:
        user = database.create_user(
            firebase_uid=firebase_uid,
            email=firebase_user['email'],
            phone_number=phone_number,
            display_name=firebase_user.get('display_name'),
            email_verified=firebase_user.get('email_verified', False),
            country_code=extract_country_code(phone_number)
        )

    # Create OTP session
    session = database.create_otp_session(
        user_id=user['id'],
        firebase_uid=firebase_uid,
        phone_number=phone_number,
        session_type='login',
        device_fingerprint=request.device_fingerprint
    )

    return CreateLoginSessionResponse(
        session_id=session['id'],
        phone_number_masked=mask_phone_number(phone_number),
        expires_in_seconds=600  # 10 minutes
    )


@router.post("/login/verify-otp", response_model=VerifyLoginOTPResponse)
async def verify_login_otp(request: VerifyLoginOTPRequest):
    """
    Verify OTP for login and optionally trust the device.
    Note: Frontend should verify OTP with Firebase first, then call this endpoint.
    """
    # Get OTP session
    session = database.get_otp_session(request.session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OTP session not found"
        )

    # Check if session expired
    expires_at = session.get('expires_at')
    if expires_at:
        # Handle both timezone-aware and timezone-naive datetimes
        now = datetime.now(timezone.utc) if (hasattr(expires_at, 'tzinfo') and expires_at.tzinfo) else datetime.utcnow()
        if expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP session has expired"
            )

    # Check if session type is correct
    if session.get('session_type') != 'login':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session type"
        )

    # Mark session as verified
    database.mark_otp_verified(request.session_id)

    device_trusted = False

    # Trust device if requested
    if request.remember_device:
        device_name = "Unknown Device"  # Frontend should send this
        device_os = "Unknown OS"  # Frontend should send this

        database.create_trusted_device(
            user_id=session['user_id'],
            firebase_uid=session['firebase_uid'],
            device_fingerprint=session['device_fingerprint'],
            device_name=device_name,
            device_os=device_os
        )
        device_trusted = True

    return VerifyLoginOTPResponse(
        success=True,
        message="OTP verified successfully",
        device_trusted=device_trusted
    )


# ==================== Phone Login Endpoints ====================

@router.post("/login/phone-password", response_model=PhoneLoginResponse)
async def login_with_phone_password(request: PhoneLoginRequest):
    """
    Login with phone number + password.
    Client should:
    1. Call this to check device trust
    2. If OTP not required, sign in with Firebase using phone email + password
    3. If OTP required, OTP is sent via Twilio automatically
    4. Client verifies OTP and calls verify-otp endpoint
    """
    from app.services.twilio_verify import twilio_verify_service
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"[LOGIN] Endpoint called for phone: {request.phone_number}")

    # Normalize phone number
    phone_number = request.phone_number
    if not phone_number.startswith('+'):
        phone_number = f"{request.country_code}{phone_number}"

    logger.info(f"[LOGIN] Normalized phone: {phone_number}")

    # Look up user by phone
    firebase_user = firebase_admin.get_user_by_phone_number(phone_number)

    if not firebase_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    firebase_uid = firebase_user['uid']

    # Check device trust
    is_trusted = database.is_device_trusted(firebase_uid, request.device_fingerprint)

    if is_trusted:
        device = database.get_trusted_device(firebase_uid, request.device_fingerprint)
        if device:
            database.update_device_last_used(device['id'])

        return PhoneLoginResponse(
            requires_otp=False,
            message="Proceed with password login"
        )

    # Device not trusted - require OTP
    user = database.get_user_by_firebase_uid(firebase_uid)
    if not user:
        user = database.create_user(
            firebase_uid=firebase_uid,
            email=firebase_user.get('email', ''),
            phone_number=phone_number,
            display_name=firebase_user.get('display_name'),
            email_verified=False,
            country_code=extract_country_code(phone_number)
        )

    # Create OTP session
    session = database.create_otp_session(
        user_id=user['id'],
        firebase_uid=firebase_uid,
        phone_number=phone_number,
        session_type='phone_login',
        device_fingerprint=request.device_fingerprint
    )

    # Send OTP via Twilio
    logger.info(f"[LOGIN] About to send OTP to {phone_number}, session_id: {session['id']}")
    if twilio_verify_service.enabled:
        result = twilio_verify_service.send_verification(phone_number, 'sms', 'en')
        logger.info(f"[LOGIN] OTP send result: {result}")
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {result['error']}"
            )

    logger.info(f"[LOGIN] Returning response with requires_otp=True, session_id: {session['id']}")
    return PhoneLoginResponse(
        requires_otp=True,
        message="OTP sent to your phone",
        session_id=session['id'],
        phone_number_masked=mask_phone_number(phone_number),
        phone_number=phone_number  # Include for frontend to use with Twilio
    )


@router.post("/login/otp-send", response_model=SendOTPResponse)
async def send_otp(request: SendOTPRequest):
    """
    Initiate OTP-only login (passwordless).
    Sends OTP via Twilio and creates a session for tracking.
    """
    from app.services.twilio_verify import twilio_verify_service

    phone_number = request.phone_number
    if not phone_number.startswith('+'):
        phone_number = f"{request.country_code}{phone_number}"

    # Look up user
    firebase_user = firebase_admin.get_user_by_phone_number(phone_number)

    if not firebase_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with this phone number"
        )

    user = database.get_user_by_firebase_uid(firebase_user['uid'])
    if not user:
        user = database.create_user(
            firebase_uid=firebase_user['uid'],
            email=firebase_user.get('email', ''),
            phone_number=phone_number,
            display_name=firebase_user.get('display_name'),
            country_code=extract_country_code(phone_number)
        )

    # Create OTP session
    session = database.create_otp_session(
        user_id=user['id'],
        firebase_uid=firebase_user['uid'],
        phone_number=phone_number,
        session_type='otp_login',
        device_fingerprint='otp_login'
    )

    # Send OTP via Twilio
    if twilio_verify_service.enabled:
        result = twilio_verify_service.send_verification(phone_number, 'sms', 'en')
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {result['error']}"
            )

    return SendOTPResponse(
        success=True,
        message="OTP sent to phone number",
        session_id=session['id'],
        expires_in_seconds=600,
        phone_number=phone_number  # Include for frontend
    )


@router.post("/login/otp-verify", response_model=VerifyOTPLoginResponse)
async def verify_otp_login(request: VerifyOTPLoginRequest):
    """
    Verify OTP code with Twilio and complete login.
    """
    session = database.get_otp_session(request.session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OTP session not found"
        )

    expires_at = session.get('expires_at')
    if expires_at:
        # Handle both timezone-aware and timezone-naive datetimes
        if hasattr(expires_at, 'tzinfo') and expires_at.tzinfo is not None:
            now = datetime.now(timezone.utc)
        else:
            now = datetime.utcnow()

        if expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP session expired"
            )

    # Accept both phone_login and otp_login session types
    session_type = session.get('session_type')
    if session_type not in ['phone_login', 'otp_login']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session type"
        )

    # Get phone number from session
    phone_number = session.get('phone_number')
    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number not found in session"
        )

    # Verify OTP code with Twilio
    logger.info(f"[OTP-VERIFY] Verifying code for {phone_number}, session: {request.session_id}")
    if twilio_verify_service.enabled:
        result = twilio_verify_service.check_verification(phone_number, request.code)

        if not result['valid']:
            logger.error(f"[OTP-VERIFY] Verification failed: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error'] or "Invalid verification code"
            )

        logger.info(f"[OTP-VERIFY] Twilio verification successful for {phone_number}")
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Twilio Verify service is not available"
        )

    # Mark session as verified
    database.mark_otp_verified(request.session_id)

    device_trusted = False

    # Optionally trust device
    if request.remember_device:
        database.create_trusted_device(
            user_id=session['user_id'],
            firebase_uid=session['firebase_uid'],
            device_fingerprint=session.get('device_fingerprint', 'otp_login'),
            device_name="Mobile Device",
            device_os="Unknown"
        )
        device_trusted = True

    return VerifyOTPLoginResponse(
        success=True,
        message="Login successful",
        device_trusted=device_trusted
    )


# ==================== Forgot Password Endpoints ====================

@router.post("/forgot-password/initiate", response_model=InitiateForgotPasswordResponse)
async def initiate_forgot_password(request: InitiateForgotPasswordRequest):
    """
    Initiate forgot password flow.
    Looks up user, sends OTP via Twilio, and returns masked phone number.
    """
    from app.services.twilio_verify import twilio_verify_service

    # Look up user by email
    firebase_user = firebase_admin.get_user_by_email(request.email)

    if not firebase_user:
        # For security, don't reveal if user exists
        # Return generic message
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="If an account with this email exists, an OTP will be sent to the registered phone number"
        )

    firebase_uid = firebase_user['uid']
    phone_number = firebase_user.get('phone_number')

    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No phone number registered for this account. Please contact support."
        )

    # Get or create user in Firestore
    user = database.get_user_by_firebase_uid(firebase_uid)
    if not user:
        user = database.create_user(
            firebase_uid=firebase_uid,
            email=firebase_user['email'],
            phone_number=phone_number,
            display_name=firebase_user.get('display_name'),
            email_verified=firebase_user.get('email_verified', False),
            country_code=extract_country_code(phone_number)
        )

    # Create OTP session for forgot password
    session = database.create_otp_session(
        user_id=user['id'],
        firebase_uid=firebase_uid,
        phone_number=phone_number,
        session_type='forgot_password',
        device_fingerprint='forgot_password'  # No device tracking for password reset
    )

    # Send OTP via Twilio Verify
    if twilio_verify_service.enabled:
        result = twilio_verify_service.send_verification(phone_number, 'sms', 'en')
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {result['error']}"
            )

    return InitiateForgotPasswordResponse(
        success=True,
        phone_number_masked=mask_phone_number(phone_number),
        session_id=session['id'],
        phone_number=phone_number  # Include full phone number for Twilio verification
    )


@router.post("/forgot-password/verify-otp", response_model=VerifyForgotPasswordOTPResponse)
async def verify_forgot_password_otp(request: VerifyForgotPasswordOTPRequest):
    """
    Verify OTP for forgot password via Twilio and generate reset token.
    """
    from app.services.twilio_verify import twilio_verify_service

    # Get OTP session
    session = database.get_otp_session(request.session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OTP session not found"
        )

    # Check if session expired
    expires_at = session.get('expires_at')
    if expires_at:
        # Handle both timezone-aware and timezone-naive datetimes
        now = datetime.now(timezone.utc) if (hasattr(expires_at, 'tzinfo') and expires_at.tzinfo) else datetime.utcnow()
        if expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP session has expired"
            )

    # Check if session type is correct
    if session.get('session_type') != 'forgot_password':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session type"
        )

    # Verify OTP with Twilio
    if twilio_verify_service.enabled:
        phone_number = session.get('phone_number')
        result = twilio_verify_service.check_verification(phone_number, request.otp_code)
        if not result['valid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error'] or "Invalid OTP code"
            )

    # Mark session as verified
    database.mark_otp_verified(request.session_id)

    # Generate password reset token
    reset_token_data = database.create_reset_token(
        user_id=session['user_id'],
        firebase_uid=session['firebase_uid']
    )

    return VerifyForgotPasswordOTPResponse(
        success=True,
        reset_token=reset_token_data['token'],
        expires_in_seconds=900  # 15 minutes
    )


@router.post("/forgot-password/reset", response_model=ResetPasswordResponse)
async def reset_password(request: ResetPasswordRequest):
    """
    Reset password using the reset token.
    Updates password via Firebase Admin SDK.
    """
    # Validate reset token
    token_data = database.get_reset_token(request.reset_token)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Validate password strength (minimum 6 characters)
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )

    try:
        # Update password via Firebase Admin
        firebase_admin.update_user_password(
            token_data['firebase_uid'],
            request.new_password
        )

        # Mark token as used
        database.mark_token_used(request.reset_token)

        return ResetPasswordResponse(
            success=True,
            message="Password reset successfully"
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== Trusted Devices Endpoints ====================

@router.get("/trusted-devices", response_model=TrustedDevicesListResponse)
async def get_trusted_devices(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get list of trusted devices for the current user"""
    devices = database.get_user_trusted_devices(current_user['firebase_uid'])

    device_responses = []
    for device in devices:
        device_responses.append(TrustedDeviceResponse(
            id=device['id'],
            device_name=device.get('device_name', 'Unknown Device'),
            device_os=device.get('device_os', 'Unknown OS'),
            trusted_at=device.get('trusted_at', datetime.now(timezone.utc)),
            last_used_at=device.get('last_used_at', datetime.now(timezone.utc)),
            expires_at=device.get('expires_at', datetime.now(timezone.utc))
        ))

    return TrustedDevicesListResponse(devices=device_responses)


@router.delete("/trusted-devices/{device_id}", response_model=RevokeDeviceResponse)
async def revoke_trusted_device(
    device_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Revoke a trusted device"""
    # TODO: Add validation to ensure device belongs to current user
    success = database.revoke_trusted_device(device_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    return RevokeDeviceResponse(
        success=True,
        message="Device revoked successfully"
    )


# ==================== Phone 2FA Linking Endpoints (Twilio) ====================

@router.post("/link-phone/initiate")
async def initiate_phone_linking(
    phone_number: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Initiate phone linking for existing user (2FA setup).
    Sends OTP via Twilio to the phone number.
    """
    from app.services.twilio_verify import twilio_verify_service

    # Normalize phone number
    if not phone_number.startswith('+'):
        phone_number = f"+{phone_number}"

    # Check if phone is already linked to another account
    existing_user = firebase_admin.get_user_by_phone_number(phone_number)
    if existing_user and existing_user['uid'] != current_user['firebase_uid']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already linked to another account"
        )

    # Create OTP session for phone linking
    session = database.create_otp_session(
        user_id=current_user['id'],
        firebase_uid=current_user['firebase_uid'],
        phone_number=phone_number,
        session_type='phone_linking',
        device_fingerprint='phone_linking'
    )

    # Send OTP via Twilio (default to English)
    if twilio_verify_service.enabled:
        result = twilio_verify_service.send_verification(phone_number, 'sms', 'en')
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {result['error']}"
            )

    return {
        'success': True,
        'session_id': session['id'],
        'phone_number': phone_number,
        'phone_number_masked': mask_phone_number(phone_number),
        'message': 'OTP sent to phone number'
    }


@router.post("/link-phone/verify")
async def verify_phone_linking(
    session_id: str,
    otp_code: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Verify OTP and link phone to user account via Twilio.
    """
    from app.services.twilio_verify import twilio_verify_service

    # Get OTP session
    session = database.get_otp_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OTP session not found"
        )

    # Verify session belongs to current user
    if session['firebase_uid'] != current_user['firebase_uid']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session does not belong to current user"
        )

    # Check if session expired
    expires_at = session.get('expires_at')
    if expires_at:
        now = datetime.now(timezone.utc) if (hasattr(expires_at, 'tzinfo') and expires_at.tzinfo) else datetime.utcnow()
        if expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP session has expired"
            )

    # Check if session type is correct
    if session.get('session_type') != 'phone_linking':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session type"
        )

    # Verify OTP with Twilio
    phone_number = session.get('phone_number')
    if twilio_verify_service.enabled:
        result = twilio_verify_service.check_verification(phone_number, otp_code)
        if not result['valid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error'] or "Invalid OTP code"
            )

    # Update user's phone number in Firebase Auth
    try:
        auth.update_user(
            current_user['firebase_uid'],
            phone_number=phone_number
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update phone number: {str(e)}"
        )

    # Update user's phone number in Firestore
    db = database.get_firestore_db()
    user_ref = db.collection(database.USERS_COLLECTION).document(current_user['id'])
    user_ref.update({
        'phone_number': phone_number,
        'phone_verified': True,
        'country_code': extract_country_code(phone_number),
        'updated_at': database.firestore.SERVER_TIMESTAMP
    })

    # Mark session as verified
    database.mark_otp_verified(session_id)

    return {
        'success': True,
        'message': 'Phone number linked successfully'
    }


# ==================== Twilio Verify Endpoints ====================

@router.post("/verify/send")
async def send_verification_code(phone_number: str, locale: str = 'en'):
    """
    Send OTP via Twilio Verify (for restricted countries like Iraq)

    Twilio Verify handles:
    - OTP generation (6-digit)
    - SMS delivery
    - Rate limiting
    - Automatic expiration (10 min)
    """
    from app.services.twilio_verify import twilio_verify_service

    # Check if Twilio Verify is enabled
    if not twilio_verify_service.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Twilio Verify service is not available. Use Firebase for this number."
        )

    # Normalize phone number
    if not phone_number.startswith('+'):
        phone_number = f"+{phone_number}"

    # Check if this number should use Twilio
    if not twilio_verify_service.should_use_verify(phone_number):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This phone number should use Firebase authentication"
        )

    try:
        result = twilio_verify_service.send_verification(phone_number, 'sms', locale)

        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result['error']
            )

        return {
            'success': True,
            'message': 'Verification code sent',
            'phone_masked': mask_phone_number(phone_number),
            'channel': result['channel']
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send verification: {str(e)}"
        )


@router.post("/verify/check")
async def check_verification_code(phone_number: str, code: str):
    """
    Verify OTP code via Twilio Verify

    Returns success if code is valid
    """
    from app.services.twilio_verify import twilio_verify_service

    # Check if Twilio Verify is enabled
    if not twilio_verify_service.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Twilio Verify service is not available"
        )

    # Normalize phone number
    if not phone_number.startswith('+'):
        phone_number = f"+{phone_number}"

    try:
        result = twilio_verify_service.check_verification(phone_number, code)

        if not result['valid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error'] or "Invalid verification code"
            )

        return {
            'success': True,
            'message': 'Phone number verified',
            'status': result['status']
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify code: {str(e)}"
        )
