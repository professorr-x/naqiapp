# Add App Store Review Bypass for Phone OTP Authentication

## Summary

Adds a hardcoded bypass mechanism for Apple App Store reviewers to test OTP authentication without receiving real SMS messages. Real users continue through the normal Twilio Verify flow unchanged.

## Motivation

Apple reviewers need to test the complete authentication flow during app review. This bypass prevents review delays caused by SMS delivery issues, international routing problems, or privacy concerns with sharing reviewer phone numbers.

## Changes

### 1. Environment Variables (`.env.example`)
```bash
REVIEWER_PHONE_NUMBER=+15551234567
REVIEWER_OTP_CODE=424242
```

### 2. OTP Send Bypass ([auth.py:1268-1277](backend/app/api/auth.py#L1268-L1277))
When `phone_number` matches `REVIEWER_PHONE_NUMBER`:
- Skips Twilio Verify
- Returns successful "pending" response
- Logs bypass usage (no PII)

### 3. OTP Check Bypass ([auth.py:1334-1385](backend/app/api/auth.py#L1334-L1385))
When `phone_number` matches `REVIEWER_PHONE_NUMBER`:
- **Correct code**: Creates user if needed, returns "approved" status
- **Wrong code**: Returns same error as Twilio rejection (prevents leakage)
- Never calls Twilio

### 4. User Creation on First Check
Creates Firebase + Firestore user with display name "App Store Reviewer" on first successful verification.

### 5. Comprehensive Tests ([test_otp_verification_bypass.py](backend/tests/test_otp_verification_bypass.py))
- ✅ Reviewer phone + correct code → approved
- ✅ Reviewer phone + wrong code → rejected (Twilio not called)
- ✅ Non-reviewer phone → normal Twilio flow
- ✅ User creation and existing user scenarios

## Security

- No PII in logs (only "OTP bypass used for reviewer number")
- Wrong codes return identical error to normal failures
- Frontend completely unaware of bypass
- Bypass isolated to two endpoints

## Testing

```bash
pytest tests/test_otp_verification_bypass.py -v
```

## Deployment

1. Set environment variables in production secrets manager
2. Share credentials with Apple review team
3. Monitor logs for bypass usage

## Files Changed

- `backend/.env.example` - Added reviewer bypass config
- `backend/app/api/auth.py` - Added bypass logic to `/verify/send` and `/verify/check`
- `backend/tests/test_otp_verification_bypass.py` - Added tests
- `backend/tests/__init__.py` - Created tests package

See [APP_STORE_REVIEW_BYPASS.md](backend/APP_STORE_REVIEW_BYPASS.md) for detailed implementation notes.
