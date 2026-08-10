# Building Android APK for Testing

This guide will help you build an Android APK with the production backend URL for testing on your phone.

## Prerequisites

Before building, ensure you have:
- ✅ Node.js and npm installed
- ✅ Android Studio installed
- ✅ Java JDK installed (JDK 17 recommended)
- ✅ Android SDK and Build Tools installed
- ✅ Environment variables set (`ANDROID_HOME`, `JAVA_HOME`)

## Quick Build (Debug APK for Testing)

This is the fastest way to build an APK for testing on your phone:

### Step 1: Install Dependencies

```bash
cd NaqiApp
npm install
```

### Step 2: Build Debug APK

```bash
# Build debug APK with production environment
cd android
ENVFILE=../.env.production ./gradlew assembleDebug

# Or if on Windows PowerShell:
# $env:ENVFILE="../.env.production"; ./gradlew assembleDebug
```

### Step 3: Find Your APK

The APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 4: Install on Your Phone

**Option A: Using ADB (USB Connection)**
1. Enable Developer Options on your phone
2. Enable USB Debugging
3. Connect phone to computer via USB
4. Run:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Option B: Manual Transfer**
1. Copy `app-debug.apk` to your phone (via USB, email, or cloud)
2. Open the APK file on your phone
3. Allow installation from unknown sources if prompted
4. Install the app

## Production Build (Release APK)

For a production-ready APK with optimizations and signing:

### Step 1: Generate Upload Keystore (First Time Only)

Skip this if you already have a keystore.

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Important:** Remember your keystore password and key password!

### Step 2: Configure Gradle Signing

1. Create `android/gradle.properties` (if it doesn't exist)
2. Add your keystore info:

```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=your_keystore_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

**Security:** Add `gradle.properties` to `.gitignore` to keep passwords private!

### Step 3: Build Release APK

```bash
cd android
ENVFILE=../.env.production ./gradlew assembleRelease

# Or on Windows PowerShell:
# $env:ENVFILE="../.env.production"; ./gradlew assembleRelease
```

### Step 4: Find Your Release APK

The signed APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

This APK is:
- ✅ Optimized for production
- ✅ Signed with your keystore
- ✅ Smaller file size
- ✅ Better performance
- ✅ Ready for distribution

## Environment Configuration

Your app is now configured with:
- 🌐 **Backend API**: `https://naqiapp.onrender.com/api`
- 📱 **Meta App ID**: Production Facebook SDK credentials
- 🔌 **Socket.IO**: Connects to production backend

## Testing Checklist

After installing the APK, test these features:

### Authentication
- [ ] Phone number signup with OTP
- [ ] Phone + password login
- [ ] Password reset flow
- [ ] Device trust/2FA

### Orders
- [ ] View pricing and quantities
- [ ] Create new order
- [ ] View order history
- [ ] Track delivery status

### Chat
- [ ] Send text messages
- [ ] Receive admin replies (test with admin dashboard)
- [ ] Real-time updates via Socket.IO

### Notifications
- [ ] Receive FCM push notifications
- [ ] Order status updates
- [ ] Chat message notifications

## Troubleshooting

### Build Failed: "SDK location not found"

**Solution:** Set ANDROID_HOME environment variable:
```bash
# macOS/Linux
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Windows
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
```

### Build Failed: "Java version"

**Solution:** Use JDK 17:
```bash
# Check Java version
java -version

# If wrong version, install JDK 17 and set JAVA_HOME
export JAVA_HOME=/path/to/jdk-17
```

### APK Installation Blocked

**Solution:** Enable "Install from Unknown Sources" on your phone:
1. Settings → Security → Unknown Sources
2. Or Settings → Apps → Special Access → Install Unknown Apps

### App Crashes on Startup

**Common causes:**
1. Missing Firebase `google-services.json` file
2. Backend URL is incorrect
3. Meta SDK not configured

**Check logs:**
```bash
adb logcat | grep -i "ReactNative\|crash"
```

### Cannot Connect to Backend

**Solutions:**
1. Verify backend is running: https://naqiapp.onrender.com/health
2. Check phone has internet connection
3. Verify API_BASE_URL in `.env.production` is correct
4. Check backend CORS allows your app

### Socket.IO Not Connecting

**Solutions:**
1. Verify backend Socket.IO is running
2. Check firewall settings
3. Try accessing backend URL in phone browser first
4. Review app logs for connection errors

## Build Optimization

### Reduce APK Size

1. **Enable ProGuard** (already configured in `build.gradle`):
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

2. **Use App Bundle** (for Google Play):
```bash
cd android
ENVFILE=../.env.production ./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Enable Hermes (Better Performance)

Hermes is already enabled in your project for better performance and smaller APK size.

## Building for Different Environments

### Development (Local Backend)
```bash
cd android
./gradlew assembleDebug
```
Uses `.env` file with `localhost:8000`

### Staging
```bash
cd android
ENVFILE=../.env.staging ./gradlew assembleDebug
```

### Production
```bash
cd android
ENVFILE=../.env.production ./gradlew assembleRelease
```

## Distribution

### Internal Testing
1. Share APK file directly with testers
2. Install manually on their devices
3. Collect feedback

### Google Play Internal Testing
1. Build release bundle: `./gradlew bundleRelease`
2. Upload `.aab` file to Play Console
3. Create internal testing track
4. Invite testers via email

### Production Release
1. Build signed release bundle
2. Upload to Google Play Console
3. Complete store listing
4. Submit for review

## Additional Resources

- [React Native Build Guide](https://reactnative.dev/docs/signed-apk-android)
- [Android Signing Guide](https://developer.android.com/studio/publish/app-signing)
- [Google Play Upload Guide](https://support.google.com/googleplay/android-developer/answer/9859152)

## Quick Reference Commands

```bash
# Clean build
cd android && ./gradlew clean

# Build debug APK
ENVFILE=../.env.production ./gradlew assembleDebug

# Build release APK
ENVFILE=../.env.production ./gradlew assembleRelease

# Build release bundle (for Play Store)
ENVFILE=../.env.production ./gradlew bundleRelease

# Install debug on connected device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Check app logs
adb logcat | grep ReactNative

# List connected devices
adb devices
```

## Important Notes

1. **Debug APK**: Use for testing only. Not optimized, not signed for distribution.
2. **Release APK**: Optimized and signed. Ready for distribution.
3. **App Bundle (.aab)**: Required for Google Play Store upload.
4. **Keystore Security**: NEVER commit your keystore or passwords to git!
5. **Backend URL**: Make sure production URL is correct before building.

## Next Steps

1. ✅ Build debug APK
2. ✅ Test on your phone
3. ✅ Verify backend connection
4. ✅ Test all features
5. 🔄 If everything works, build release APK
6. 📤 Distribute to testers or upload to Play Store

Good luck with your build! 🚀
