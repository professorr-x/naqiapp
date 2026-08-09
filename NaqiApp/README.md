# NAQI (نقي) Mobile App

React Native mobile application for NAQI RO water delivery service in Baghdad, Iraq.

## Overview

NAQI is a water delivery app that allows customers to:
- Order RO (Reverse Osmosis) purified water
- Choose between one-time orders or prepaid vouchers (weekly/monthly)
- Schedule delivery day and time window
- Send order confirmation via WhatsApp

## Features

- **Bilingual Support**: Arabic (default) and English
- **Simple Order Flow**:
  1. Select order type (one-time, weekly voucher, monthly voucher)
  2. Choose bottle quantity (2, 4, or 6 bottles)
  3. Schedule delivery (date and time window)
  4. Review order summary
  5. Confirm via WhatsApp
- **No Authentication Required**: Simple, frictionless ordering
- **Cash Payment**: Payment on delivery only (MVP)
- **Bottle Deposit System**: Transparent deposit tracking

## Tech Stack

- **Framework**: React Native 0.83.1
- **Language**: TypeScript
- **Navigation**: React Navigation (Native Stack)
- **Internationalization**: i18next, react-i18next
- **State Management**: React Hooks (useState, useEffect)

## Prerequisites

- Node.js 18+
- npm or yarn
- For Android: Android Studio, JDK 17
- For iOS: Xcode 14+, CocoaPods

## Installation

1. Install dependencies:
```bash
npm install
```

2. For iOS (macOS only):
```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

## Running the App

### Android
```bash
npm run android
# or
npx react-native run-android
```

### iOS
```bash
npm run ios
# or
npx react-native run-ios
```

## Configuration

### WhatsApp Number
Update the WhatsApp contact number in `src/constants/index.ts`:
```typescript
export const WHATSAPP_NUMBER = '+9647XXXXXXXXX';
```

### Pricing
Update default pricing in `src/constants/index.ts`:
```typescript
export const DEFAULT_PRICING: PricingConfig = {
  oneTimePrice: 2000,
  weeklyVoucherPrice: 1800,
  monthlyVoucherPrice: 1600,
  bottleDeposit: 5000,
};
```

## Project Structure

```
NaqiApp/
├── src/
│   ├── components/        # Reusable components
│   ├── constants/         # App constants and config
│   ├── i18n/             # Internationalization
│   ├── navigation/        # Navigation setup
│   ├── screens/          # App screens
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── android/              # Android native code
├── ios/                  # iOS native code
└── App.tsx              # App entry point
```

## App Flow

1. **Home Screen**: Welcome screen with language toggle
2. **Order Type Screen**: Select one-time, weekly, or monthly order
3. **Quantity Screen**: Choose 2, 4, or 6 bottles
4. **Delivery Screen**: Select delivery date and time window
5. **Summary Screen**: Review order and enter customer details
6. **WhatsApp Confirmation**: Order sent to business WhatsApp

## Building for Production

### Android APK
```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

### iOS Archive
1. Open `ios/NaqiApp.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Distribute App

## Business Logic

### Bottle Deposit
- 5,000 IQD per 20L bottle
- Charged on first order
- Refundable when bottles returned

### Voucher System
- **Weekly Voucher**: 1 delivery per week
- **Monthly Voucher**: 4 deliveries per month

### Delivery Windows
- **Morning**: 9am - 1pm
- **Afternoon**: 1pm - 6pm

### Service Area
Phase 1: الرصافة (Rusafa), Baghdad

## Support

For issues or questions, review the developer brief or backend API documentation.

## License

Proprietary - NAQI Water Delivery Service
