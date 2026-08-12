import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';
import api from './api';

export interface NotificationData {
  type?: string;
  orderId?: string;
  [key: string]: any;
}

export class NotificationService {
  /**
   * Request notification permission from user
   * Android 13+ and iOS require explicit permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Android 13+ requires POST_NOTIFICATIONS permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      // iOS permission request
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      return enabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM device token
   */
  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Register device token with backend
   */
  async registerToken(token: string): Promise<void> {
    try {
      const deviceName = await DeviceInfo.getDeviceName();
      const systemVersion = DeviceInfo.getSystemVersion();
      const appVersion = DeviceInfo.getVersion();

      console.log('[NotificationService] Registering device token...');
      console.log('[NotificationService] Token preview:', token.substring(0, 20) + '...');
      console.log('[NotificationService] Platform:', Platform.OS);

      const response = await api.post('/device-tokens/register', {
        device_token: token,
        device_platform: Platform.OS,
        device_name: deviceName,
        device_os: `${Platform.OS} ${systemVersion}`,
        app_version: appVersion,
      });

      console.log('[NotificationService] ✓ Device token registered successfully');
      console.log('[NotificationService] Response:', response.data);
    } catch (error: any) {
      console.error('[NotificationService] ✗ Failed to register device token');
      console.error('[NotificationService] Error details:', error.response?.data || error.message);
      console.error('[NotificationService] Status code:', error.response?.status);
      throw error;
    }
  }

  /**
   * Create a notification channel for Android (required for Android 8.0+)
   */
  async createNotificationChannel() {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });
    }
  }

  /**
   * Display a foreground notification using Notifee
   */
  async displayForegroundNotification(
    title: string,
    body: string,
    data?: NotificationData,
  ) {
    await this.createNotificationChannel();

    await notifee.displayNotification({
      title,
      body,
      data: data || {},
      android: {
        channelId: 'default',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        sound: 'default',
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          banner: true,
          sound: true,
          badge: true,
        },
      },
    });
  }

  /**
   * Setup notification handlers for foreground, background, and quit states
   */
  setupNotificationHandlers(onNotificationTap: (data: NotificationData) => void) {
    // Foreground notification handler - display banner when app is open
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground notification received:', remoteMessage);

      const title = remoteMessage.notification?.title || 'New Notification';
      const body = remoteMessage.notification?.body || '';
      const data = remoteMessage.data as NotificationData;

      // Display the notification banner
      await this.displayForegroundNotification(title, body, data);
    });

    // Handle notification tap events from Notifee (foreground notifications)
    notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS) {
        console.log('Foreground notification tapped:', detail.notification?.data);
        if (detail.notification?.data) {
          onNotificationTap(detail.notification.data as NotificationData);
        }
      }
    });

    // Background notification tap handler (Notifee)
    notifee.onBackgroundEvent(async ({type, detail}) => {
      if (type === EventType.PRESS) {
        console.log('Background notification tapped:', detail.notification?.data);
        if (detail.notification?.data) {
          onNotificationTap(detail.notification.data as NotificationData);
        }
      }
    });

    // Background/quit state - notification opened (app in background) - Firebase
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened from background (Firebase):', remoteMessage);
      if (remoteMessage.data) {
        onNotificationTap(remoteMessage.data as NotificationData);
      }
    });

    // Check if app was opened from a notification (quit state) - Firebase
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification opened from quit state (Firebase):', remoteMessage);
          if (remoteMessage.data) {
            onNotificationTap(remoteMessage.data as NotificationData);
          }
        }
      });

    // Handle token refresh
    messaging().onTokenRefresh(async token => {
      console.log('FCM token refreshed:', token);
      try {
        await this.registerToken(token);
      } catch (error) {
        console.error('Failed to register refreshed token:', error);
      }
    });
  }

  /**
   * Unregister device token from backend (on logout)
   */
  async unregisterToken(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token) {
        await api.delete(`/device-tokens/${token}`);
        console.log('Device token unregistered successfully');
      }
    } catch (error) {
      console.error('Failed to unregister device token:', error);
      // Don't throw - logout should succeed even if token cleanup fails
    }
  }
}

export default new NotificationService();
