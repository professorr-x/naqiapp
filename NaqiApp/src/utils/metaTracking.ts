import {Settings, AppEventsLogger} from 'react-native-fbsdk-next';
import {META_APP_ID} from '../constants';
import {Order} from '../types';

/**
 * Initialize Meta SDK
 * Call this once when the app starts
 */
export const initializeMetaSDK = () => {
  try {
    Settings.setAppID(META_APP_ID);
    Settings.initializeSDK();
    console.log('Meta SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Meta SDK:', error);
  }
};

/**
 * Track app activation/open
 * Meta automatically tracks installs, but you should track activations
 */
export const trackAppOpen = () => {
  try {
    AppEventsLogger.logEvent('fb_mobile_activate_app');
    console.log('Meta: App activation tracked');
  } catch (error) {
    console.error('Failed to track app open:', error);
  }
};

/**
 * Track order submission (Purchase event)
 * This is crucial for measuring campaign ROI and conversion tracking
 */
export const trackOrderSubmission = (order: Order) => {
  try {
    // Standard Purchase event - Meta uses this for conversion optimization
    AppEventsLogger.logPurchase(
      order.totalPrice,
      'IQD', // Iraqi Dinar
      {
        // Additional parameters for better campaign optimization
        'fb_content_type': 'product',
        'fb_content_id': order.orderType,
        'fb_num_items': order.bottleQuantity / 2, // Number of vouchers
        'order_type': order.orderType,
        'delivery_area': order.customerArea || 'unknown',
        'delivery_date': order.deliveryDate.toISOString(),
        'time_window': order.deliveryTimeWindow,
      },
    );

    console.log('Meta: Order submission tracked', {
      value: order.totalPrice,
      currency: 'IQD',
      orderType: order.orderType,
    });
  } catch (error) {
    console.error('Failed to track order submission:', error);
  }
};

/**
 * Track when user views the order summary screen
 * Useful for tracking funnel progression
 */
export const trackViewOrderSummary = (order: Order) => {
  try {
    AppEventsLogger.logEvent('ViewOrderSummary', {
      'order_type': order.orderType,
      'bottle_quantity': order.bottleQuantity,
      'total_price': order.totalPrice,
    });
    console.log('Meta: Order summary view tracked');
  } catch (error) {
    console.error('Failed to track order summary view:', error);
  }
};

/**
 * Track when user starts the order flow
 * Useful for measuring drop-off rates
 */
export const trackStartOrder = () => {
  try {
    AppEventsLogger.logEvent('StartOrder');
    console.log('Meta: Start order tracked');
  } catch (error) {
    console.error('Failed to track start order:', error);
  }
};

/**
 * Track screen views
 * Useful for understanding user navigation patterns
 */
export const trackScreenView = (screenName: string) => {
  try {
    AppEventsLogger.logEvent('ViewScreen', {
      'screen_name': screenName,
    });
    console.log(`Meta: Screen view tracked - ${screenName}`);
  } catch (error) {
    console.error('Failed to track screen view:', error);
  }
};
