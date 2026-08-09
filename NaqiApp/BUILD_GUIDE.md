# Build Guide - Environment Variables

## How react-native-config Works

### Build Time vs Runtime

**IMPORTANT**: Environment variables are read at **BUILD TIME**, not runtime. This means:
- Values are compiled into the app binary
- You need to rebuild if you change .env
- The .env file is NOT included in the app bundle

### Build Process

1. **Build starts** (iOS/Android)
2. **react-native-config reads .env** file
3. **Variables injected** into native code
4. **App compiled** with those values
5. **Runtime**: JavaScript reads from compiled values

## Local Development

### Default (.env)
```bash
# Just build normally - uses .env by default
npx react-native run-ios
npx react-native run-android
```

### Staging (.env.staging)
```bash
# Set ENVFILE environment variable
ENVFILE=.env.staging npx react-native run-ios
ENVFILE=.env.staging npx react-native run-android
```

### Production (.env.production)
```bash
ENVFILE=.env.production npx react-native run-ios
ENVFILE=.env.production npx react-native run-android
```

## iOS Build

### How iOS Picks Up .env

1. `pod install` runs (doesn't need .env yet)
2. Xcode build starts
3. react-native-config's build phase script runs:
   - Reads `.env` (or `$ENVFILE` if set)
   - Generates `GeneratedDotEnv.m` file
   - Makes variables available as `$(VARIABLE_NAME)` to Info.plist
4. Info.plist uses `$(META_APP_ID)` which gets replaced with actual value
5. App compiles with the values

### iOS Build Commands

```bash
# Development build
npx react-native run-ios

# Production build (from Xcode or command line)
ENVFILE=.env.production xcodebuild \
  -workspace ios/NaqiApp.xcworkspace \
  -scheme NaqiApp \
  -configuration Release

# Or in Xcode: Edit Scheme > Run > Arguments > Environment Variables
# Add: ENVFILE = .env.production
```

## Android Build

### How Android Picks Up .env

1. Gradle build starts
2. `dotenv.gradle` script executes:
   - Reads `.env` (or `$ENVFILE` if set)
   - Makes variables available via `project.env.get("KEY")`
3. `build.gradle` uses `resValue` to generate string resources
4. AndroidManifest.xml references `@string/facebook_app_id`
5. App compiles with the values

### Android Build Commands

```bash
# Development build
npx react-native run-android

# Production APK
cd android
ENVFILE=.env.production ./gradlew assembleRelease
cd ..

# Production AAB (for Google Play)
cd android
ENVFILE=.env.production ./gradlew bundleRelease
cd ..
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Build Android
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      # Create .env from secrets
      - name: Create .env file
        run: |
          echo "META_APP_ID=${{ secrets.META_APP_ID }}" >> .env
          echo "META_CLIENT_TOKEN=${{ secrets.META_CLIENT_TOKEN }}" >> .env

      # Build
      - name: Build Android
        run: |
          cd android
          ./gradlew assembleRelease
```

### Fastlane Example

```ruby
# fastlane/Fastfile
lane :build_production do
  # Create .env from environment or 1Password/etc
  sh("echo 'META_APP_ID=1528397728871968' > ../.env")
  sh("echo 'META_CLIENT_TOKEN=...' >> ../.env")

  # Build
  gym(scheme: "NaqiApp", configuration: "Release")
end
```

## Important Notes

### ✅ DO:
- Keep `.env` in .gitignore (already done)
- Commit `.env.example` to git
- Document required variables in README
- Create .env from secrets in CI/CD
- Rebuild app after changing .env

### ❌ DON'T:
- Commit `.env` to git
- Assume .env is read at runtime (it's build-time!)
- Forget to rebuild after changing values
- Deploy without checking which .env was used

## Troubleshooting

### Problem: Build fails with "Cannot find META_APP_ID"

**Solution**: Make sure .env file exists
```bash
# Check if .env exists
ls -la .env

# If not, copy from example
cp .env.example .env
# Then fill in real values
```

### Problem: Changed .env but app still uses old values

**Solution**: You must rebuild
```bash
# Clean and rebuild
cd android && ./gradlew clean && cd ..
cd ios && pod install && cd ..
npx react-native run-android
npx react-native run-ios
```

### Problem: Different developers have different values

**Solution**: Each developer should have their own .env
```bash
# Developer A
echo "META_APP_ID=dev_app_id" > .env

# Developer B
echo "META_APP_ID=dev_app_id" > .env

# Both use the same structure, values can differ for local testing
```

## Testing Your Setup

```bash
# Test that .env is being read
cd NaqiApp

# Check file exists
cat .env

# Build and check logs (iOS)
npx react-native run-ios 2>&1 | grep "META_APP_ID"

# Build and check logs (Android)
cd android
./gradlew assembleDebug --info | grep "META_APP_ID"
cd ..
```

## Summary

**Before each build:**
1. ✅ Ensure `.env` file exists
2. ✅ Verify it has correct values
3. ✅ Set `ENVFILE=.env.production` for production builds
4. ✅ Remember: values are compiled into the app!

**The .env file is:**
- ✅ Read at BUILD time
- ✅ Values compiled into the app
- ✅ NOT included in app bundle
- ✅ Excluded from git

**You MUST rebuild if:**
- You change .env values
- You switch environments (.env.staging → .env.production)
- You add new variables
