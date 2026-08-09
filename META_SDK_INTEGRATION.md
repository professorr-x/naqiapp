# Meta SDK Integration Guide

## ✅ Integration Complete with Environment Variables

The Meta (Facebook) SDK has been successfully integrated into your NAQI Water Delivery app for marketing campaign tracking with **secure environment variable configuration**. This allows your client to:

1. **Track app installs and opens** - See how many people install and use the app
2. **Track order submissions** - Measure conversion rates and campaign ROI
3. **Optimize ad campaigns** - Meta will use this data to show ads to people more likely to order

## Files Modified

### Environment Variables (NEW - Secure Configuration)
- [.env](.env) - **NEW** - Contains your Meta credentials (NOT committed to git)
- [.env.example](.env.example) - **NEW** - Template for other developers
- [.gitignore](.gitignore) - Updated to exclude .env files
- **Package**: `react-native-config` installed for environment variable support

### JavaScript/TypeScript Files
- [src/constants/index.ts](NaqiApp/src/constants/index.ts#L24) - Reads Meta App ID from environment variables
- [src/types/react-native-config.d.ts](NaqiApp/src/types/react-native-config.d.ts) - **NEW** - TypeScript declarations
- [src/utils/metaTracking.ts](NaqiApp/src/utils/metaTracking.ts) - **NEW** - Created tracking utility functions
- [App.tsx](NaqiApp/App.tsx#L7) - Added SDK initialization and app open tracking
- [src/screens/SummaryScreen.tsx](NaqiApp/src/screens/SummaryScreen.tsx#L77) - Added order submission tracking

### iOS Configuration
- [ios/NaqiApp/Info.plist](NaqiApp/ios/NaqiApp/Info.plist) - Uses `$(META_APP_ID)` from environment
- Ran `pod install` to install Meta SDK and react-native-config

### Android Configuration
- [android/app/build.gradle](NaqiApp/android/app/build.gradle) - Configured to read from .env and generate resources
- [android/app/src/main/AndroidManifest.xml](NaqiApp/android/app/src/main/AndroidManifest.xml) - References environment-based values
- [android/app/src/main/res/values/strings.xml](NaqiApp/android/app/src/main/res/values/strings.xml) - Removed hardcoded values

## Events Being Tracked

### 1. App Activation/Open
- **When**: Every time the app opens or comes to foreground
- **Purpose**: Track daily/monthly active users, measure app engagement
- **Meta Event**: `fb_mobile_activate_app`

### 2. Order Submission (Purchase)
- **When**: When a customer successfully submits an order via WhatsApp
- **Purpose**: Track conversions, calculate ROI, optimize for purchases
- **Meta Event**: `Purchase` (Standard event)
- **Data Tracked**:
  - Total price (in IQD)
  - Order type (weekly/monthly/extended)
  - Number of vouchers
  - Delivery area
  - Delivery date and time window

## Testing the Integration

### Before You Deploy:

1. **Build and run the app** on a test device:
   ```bash
   # iOS
   cd ios && pod install && cd ..
   npx react-native run-ios

   # Android
   npx react-native run-android
   ```

2. **Check the console logs** - You should see:
   - "Meta SDK initialized successfully" when app starts
   - "Meta: App activation tracked" when app opens
   - "Meta: Order submission tracked" when an order is submitted

3. **Test an order flow**:
   - Open the app
   - Complete the order flow
   - Submit an order
   - Check console for tracking confirmation

### Verifying Events in Meta Events Manager:

Your client can verify events are being received:

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager2)
2. Select their app
3. Click on "Test Events" tab
4. Open the app on a test device
5. Events should appear in real-time (within 20 seconds)

## Security: Environment Variables

### ✅ Your credentials are now secure!

Your Meta App ID and Client Token are stored in `.env` which is:
- **NOT committed to git** (added to .gitignore)
- **Loaded at build time** into both iOS and Android
- **Accessible in JavaScript** via react-native-config

**Current configuration:**
- App ID: `1528397728871968`
- Client Token: `75bef...` (already configured! ✅)

### For Other Developers / CI/CD

Share the `.env.example` file and ask them to:
1. Copy `.env.example` to `.env`
2. Fill in the actual values
3. Never commit `.env` to version control

### 2. Campaign Setup

Tell your client:

> "The Meta SDK is now integrated and tracking app installs, opens, and order submissions. To use this data for your marketing campaigns:
>
> 1. **Create a conversion campaign** in Meta Ads Manager
> 2. **Choose 'App Installs' or 'App Events'** as the campaign objective
> 3. **Select your app** (App ID: 1528397728871968)
> 4. **Optimize for 'Purchase' events** to drive orders
> 5. Meta will show your ads to people most likely to order water
>
> You can view all tracked events in Meta Events Manager at: https://business.facebook.com/events_manager2"

### 3. Expected Timeline

- **Test events**: Visible immediately (within 20 seconds)
- **Campaign data**: Meta needs 50+ conversion events to optimize effectively
- **ROI tracking**: Available immediately in Ads Manager after campaign launch

## Advanced: Additional Events (Optional)

If your client wants more detailed tracking, you can add these optional events:

```typescript
// In any screen, import and use:
import {trackScreenView, trackStartOrder, trackViewOrderSummary} from '../utils/metaTracking';

// Track screen views
trackScreenView('HomeScreen');

// Track when user starts ordering
trackStartOrder();

// Track when user views order summary
trackViewOrderSummary(order);
```

## Troubleshooting

### Events Not Showing in Meta Events Manager?

1. **Check console logs** - Are tracking functions being called?
2. **Verify App ID** is correct (1528397728871968)
3. **Wait 24 hours** - Sometimes there's a delay for first-time setup
4. **Use Test Events** - Real-time event testing in Events Manager

### Build Issues?

**iOS:**
- Run `cd ios && pod install && cd ..`
- Clean build folder in Xcode: Product → Clean Build Folder

**Android:**
- Clean build: `cd android && ./gradlew clean && cd ..`
- Rebuild: `npx react-native run-android`

## Privacy Considerations

⚠️ **Important**: Meta SDK collects device and usage data for ad targeting. Make sure your privacy policy mentions:
- Data collection for advertising purposes
- Meta/Facebook SDK usage
- How users can opt-out of personalized ads

You already have a privacy policy at `/Users/yas/Documents/naqi_app/privacy-policy.html` - make sure it covers this.

## Support Resources

- Meta SDK Documentation: https://developers.facebook.com/docs/react-native
- Events Manager: https://business.facebook.com/events_manager2
- Meta Ads Manager: https://business.facebook.com/adsmanager

## Summary

✅ Meta SDK installed and configured
✅ Environment variables set up securely
✅ App ID: 1528397728871968 (from .env)
✅ Client Token: Configured ✅
✅ Tracking app opens and order submissions
✅ Ready for marketing campaigns
✅ .env excluded from git (secure!)

**Next Steps:**
1. Test the app thoroughly (rebuild required!)
2. Deploy to production
3. Tell client to create campaigns in Meta Ads Manager
4. Share .env.example with other developers (not .env!)
