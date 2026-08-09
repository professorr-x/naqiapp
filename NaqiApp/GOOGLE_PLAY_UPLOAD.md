# Google Play Store Upload Guide

## ✅ Production Build Complete!

Your Android App Bundle (AAB) is ready for Google Play Store upload.

### Build Information

- **Build Type**: Production Release (AAB)
- **File**: `android/app/build/outputs/bundle/release/app-release.aab`
- **Size**: 47 MB
- **Environment**: Production (.env.production)
- **Signed**: Yes (with naqi-release.keystore)
- **Meta SDK**: Configured and enabled
- **Build Date**: July 16, 2026

### App Details

- **Package ID**: `com.naqiapp`
- **Version Code**: 1
- **Version Name**: 1.0
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 35 (Android 15)

## How to Upload to Google Play Console

### Step 1: Go to Google Play Console

1. Visit [Google Play Console](https://play.google.com/console)
2. Sign in with your developer account
3. Select your app (or create a new app if first time)

### Step 2: Upload AAB

1. In the left menu, click **"Release" → "Production"**
2. Click **"Create new release"**
3. Click **"Upload"** and select:
   ```
   /Users/yas/Documents/naqi_app/NaqiApp/android/app/build/outputs/bundle/release/app-release.aab
   ```
4. Wait for upload to complete (may take a few minutes)

### Step 3: Review and Release

1. **Release name**: Enter "1.0" or "Initial Release"
2. **Release notes**: Add what's new (required)
   ```
   Initial release of NAQI Water Delivery app
   - Order water delivery with voucher system
   - Multiple delivery areas in Baghdad
   - WhatsApp integration for order confirmation
   - Arabic and English language support
   ```
3. Click **"Review release"**
4. Review all information
5. Click **"Start rollout to Production"**

### Step 4: Store Listing (If First Release)

If this is your first release, you'll also need to complete:

1. **App details**: Name, description, icon, screenshots
2. **Categorization**: Choose "Food & Drink" or "Shopping"
3. **Contact details**: Email, phone, privacy policy URL
4. **Privacy policy**: Upload or link to your privacy policy
5. **Content rating**: Complete the questionnaire
6. **Target audience**: Select age groups
7. **Store presence**: Choose countries (Iraq recommended)
8. **Pricing**: Free (assuming free app)

## Important Notes

### ✅ What's Included in This Build

- Meta (Facebook) SDK for marketing tracking
- App install and order conversion tracking
- Production environment variables
- Release signing with your keystore
- Optimized and minified code

### 🔒 Security

- Build is signed with `naqi-release.keystore`
- Keystore credentials: `naqiapp2026`
- **Keep keystore file safe** - you need it for all future updates!
- If you lose the keystore, you cannot update the app

### 📱 Testing Before Release

**Highly recommended**: Test the AAB before releasing to production

1. Go to Google Play Console
2. Instead of "Production", select **"Internal testing"** or **"Closed testing"**
3. Upload the AAB there first
4. Add your email as a tester
5. Install and test the app
6. Once verified, promote to production

### 🔄 Future Updates

When you need to release an update:

1. **Increment version** in `android/app/build.gradle`:
   ```gradle
   versionCode 2      // Increment by 1
   versionName "1.1"  // Update as needed
   ```

2. **Rebuild AAB**:
   ```bash
   cd /Users/yas/Documents/naqi_app/NaqiApp
   rm -rf android/app/build
   ENVFILE=.env.production cd android && ./gradlew bundleRelease
   ```

3. **Upload to Google Play Console** following the same steps above

## Meta SDK Verification

After your app is live:

1. Install the app from Google Play
2. Open the app (this triggers app activation event)
3. Complete an order (this triggers purchase event)
4. Check [Meta Events Manager](https://business.facebook.com/events_manager2)
5. You should see events appearing within 20 seconds

Your client can then:
- Create conversion campaigns
- Optimize for "Purchase" events
- Track ROI from their marketing campaigns

## Troubleshooting

### Upload Failed: "You need to use a different version code"

**Solution**: Increment `versionCode` in build.gradle and rebuild

### Upload Failed: "Signature mismatch"

**Solution**: Make sure you're using the same keystore for all releases

### App Rejected: "Missing Privacy Policy"

**Solution**: Add privacy policy URL in Store Listing section

### Events Not Showing in Meta

**Solution**:
1. Wait 24 hours for first-time setup
2. Check that `.env.production` has correct values
3. Use "Test Events" in Meta Events Manager for real-time testing

## Support Resources

- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [AAB Format Documentation](https://developer.android.com/guide/app-bundle)
- [Meta Events Manager](https://business.facebook.com/events_manager2)
- [React Native Release Builds](https://reactnative.dev/docs/signed-apk-android)

## Build Location

Your AAB file is at:
```
/Users/yas/Documents/naqi_app/NaqiApp/android/app/build/outputs/bundle/release/app-release.aab
```

**Keep this file** as a backup until the app is successfully published.

---

**Ready to upload!** 🚀

Good luck with your app launch!
