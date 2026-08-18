# Twilio Verify OTP Setup Guide

## Why Twilio Verify?

Twilio Verify handles **everything automatically**:
- ✅ OTP generation (6-digit codes)
- ✅ SMS delivery with retries
- ✅ Code verification
- ✅ Rate limiting & fraud protection
- ✅ Automatic expiration (10 minutes)
- ✅ Multi-language support

**Cost**: ~$0.05 per verification (cheaper than manual SMS)

---

## Step 1: Twilio Account Setup (10 minutes)

### 1.1 Sign Up
1. Go to https://www.twilio.com/try-twilio
2. Sign up and verify your email
3. Complete phone verification

### 1.2 Create Verify Service
1. Go to Twilio Console → **Verify** → **Services**
2. Click **Create new Service**
3. Name: `Naqi App OTP`
4. Click **Create**
5. **Copy the Service SID**: `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 1.3 Get Credentials
From Twilio Console → Account Dashboard:

```
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: (click to reveal)
Verify Service SID: VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Keep these safe!

### 1.4 Enable Iraq SMS
1. Go to **Messaging** → **Geographic Permissions**
2. Find **Iraq** in the list
3. Enable it
4. Accept compliance requirements

---

## Step 2: Configure Render Environment Variables

1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add these variables:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_ENABLED=true
```

5. Click **Save Changes**

---

## Step 3: Deploy Backend

The backend code is already set up! Just deploy:

```bash
cd /Users/yas/Documents/naqi_app
git add .
git commit -m "Add Twilio Verify for Iraqi numbers"
git push origin main
```

Render will auto-deploy (if enabled) or manually trigger deploy in dashboard.

---

## Step 4: Verify Deployment

Check Render logs for:

```
✓ Twilio Verify Service initialized with SID: VAxxxxxxxxxx
```

---

## How It Works

### For Iraqi Numbers (+964):

**Current Flow (Firebase - FAILS):**
```
User enters phone → Firebase sends SMS → ❌ Error code 39
```

**New Flow (Twilio Verify - WORKS):**
```
1. User enters +964 number
2. App detects it's Iraqi
3. Backend calls Twilio Verify API
4. Twilio sends SMS to Iraqi number
5. User enters 6-digit code
6. Backend verifies with Twilio
7. ✅ User logged in
```

### For Other Numbers (UK, UAE, etc):

```
Uses Firebase (existing flow - no changes)
```

---

## Testing

### Test 1: Send OTP to Iraqi Number

```bash
curl -X POST https://your-backend.onrender.com/auth/verify/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+9647773435352"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Verification code sent",
  "phone_masked": "+964***5352"
}
```

User receives SMS with 6-digit code.

### Test 2: Verify OTP Code

```bash
curl -X POST https://your-backend.onrender.com/auth/verify/check \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+9647773435352",
    "code": "123456"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Phone number verified"
}
```

---

## Frontend Integration

Your app will **automatically** use Twilio for Iraqi numbers. No changes needed!

The backend detects `+964` and routes to Twilio Verify instead of Firebase.

---

## Monitoring

### Check Twilio Logs
1. Twilio Console → Monitor → Logs → Verify
2. See all verification attempts
3. Check delivery status

### Check Costs
1. Twilio Console → Monitor → Usage
2. See SMS costs per country
3. Iraq: ~$0.05 per verification

---

## Troubleshooting

### Issue: "Twilio Verify service is not enabled"
- Check `TWILIO_VERIFY_ENABLED=true` in Render
- Verify credentials are correct
- Restart backend service

### Issue: "Failed to send verification"
- Check Iraq is enabled in Geographic Permissions
- Verify phone number format: `+9647XXXXXXXXX`
- Check Twilio account balance

### Issue: "Invalid verification code"
- Code expires after 10 minutes
- Maximum 5 attempts per verification
- User must request new code

---

## Cost Estimate

### Example Usage (100 Iraqi users/month):
- 100 signups × 1 verification = 100 verifications
- 100 logins × 1 verification = 100 verifications
- **Total**: 200 verifications
- **Cost**: 200 × $0.05 = **$10/month**

Much cheaper than losing Iraqi users!

---

## Next Steps

1. ✅ Deploy backend with Twilio Verify
2. ✅ Test with Iraqi user: +9647773435352
3. ✅ Monitor Twilio dashboard for delivery
4. ✅ Celebrate working OTP! 🎉

---

## Support

- **Twilio Docs**: https://www.twilio.com/docs/verify/api
- **Twilio Support**: https://support.twilio.com
- **Backend Logs**: Render Dashboard → Logs
