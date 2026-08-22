# App Store Review Bypass - OTP Authentication

## Purpose

This change adds a hardcoded bypass mechanism for Apple App Store reviewers to test the OTP authentication flow without receiving real SMS messages. Real users continue to go through the normal Twilio Verify flow unchanged.

## Why This Is Needed

Apple App Store reviewers need to test the complete authentication flow when reviewing app submissions. However, sending real SMS messages to reviewers presents several challenges:

1. **Unreliable delivery**: SMS delivery can be delayed or fail, causing review delays
2. **International issues**: Reviewers may be in different countries with varying SMS reliability
3. **Privacy concerns**: Sharing reviewer phone numbers is not ideal
4. **Review delays**: SMS issues can cause app rejection and submission delays

This bypass allows reviewers to use a predefined phone number and OTP code that always works, ensuring smooth app review.

## Implementation Details

### Configuration

Two new environment variables control the bypass:

- `REVIEWER_PHONE_NUMBER` (default: `+15551234567`) - The phone number that triggers the bypass
- `REVIEWER_OTP_CODE` (default: `424242`) - The OTP code that approves verification

These are configured in `.env.example` and should be set in production environments.

### Changes to `/api/auth/verify/send`

When the incoming phone number matches `REVIEWER_PHONE_NUMBER`:
- Skips the Twilio Verify call entirely
- Returns the same response shape as a successful Twilio "pending" response
- Logs an info-level message: "OTP bypass used for reviewer number" (no PII)

### Changes to `/api/auth/verify/check`

When the incoming phone number matches `REVIEWER_PHONE_NUMBER`:

**If the code matches `REVIEWER_OTP_CODE`:**
- Skips Twilio Verify
- Ensures a user record exists (creates if needed):
  - Creates Firebase user with display name "App Store Reviewer" if doesn't exist
  - Creates Firestore user record if doesn't exist
- Returns the same response shape as a successful Twilio "approved" response
- Logs an info-level message: "OTP bypass used for reviewer number"

**If the code doesn't match:**
- Skips Twilio Verify (does NOT fall through to Twilio)
- Returns HTTP 400 with "Invalid verification code" (same as Twilio rejection)
- This prevents leaking that a bypass exists

### Security Considerations

1. **Logging**: Only logs that bypass was used, no phone numbers or codes in logs
2. **No leakage**: Wrong codes for reviewer phone return same error as normal failed verification
3. **Isolated**: Bypass logic is contained to these two endpoints
4. **Transparent**: Frontend is completely unaware - same API contract
5. **User creation**: Reviewer user is clearly labeled as "App Store Reviewer"

### Testing

Comprehensive tests in `tests/test_otp_verification_bypass.py` cover:

1. ✅ Reviewer phone + correct code → approved (Twilio not called)
2. ✅ Reviewer phone + wrong code → rejected (Twilio not called)
3. ✅ Non-reviewer phone → normal Twilio path (Twilio called)
4. ✅ User creation on first successful verification
5. ✅ Existing user handling
6. ✅ Phone normalization (with/without leading +)

Run tests with:
```bash
pytest tests/test_otp_verification_bypass.py -v
```

## Files Changed

1. **backend/.env.example** - Added `REVIEWER_PHONE_NUMBER` and `REVIEWER_OTP_CODE`
2. **backend/app/api/auth.py** - Added bypass logic to both endpoints
3. **backend/tests/test_otp_verification_bypass.py** - Added comprehensive tests
4. **backend/tests/__init__.py** - Created tests package

## Deployment Notes

In production:
1. Set `REVIEWER_PHONE_NUMBER` to the actual number shared with Apple (use secrets manager)
2. Set `REVIEWER_OTP_CODE` to a secure code (use secrets manager)
3. Coordinate with Apple review team to provide them the credentials
4. Monitor logs for bypass usage to detect any misuse

## Alternative Approaches Considered

1. **TestFlight bypass**: Would still require SMS for production review
2. **Feature flags**: Over-engineered for this use case
3. **Separate test environment**: Defeats purpose of reviewing actual production app
4. **Mock Twilio in production**: Too risky, affects all users

The simple environment variable approach is minimal, secure, and exactly what's needed.
