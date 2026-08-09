import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import api from './api';

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

      await api.post('/device-tokens/register', {
        device_token: token,
        device_platform: Platform.OS,
        device_name: deviceName,
        device_os: `${Platform.OS} ${systemVersion}`,
        app_version: appVersion,
      });

      console.log('Device token registered successfully');
    } catch (error) {
      console.error('Failed to register device token:', error);
      throw error;
    }
  }

  /**
   * Setup notification handlers for foreground, background, and quit states
   */
  setupNotificationHandlers(onNotificationTap: (data: any) => void) {
    // Foreground notification handler
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground notification received:', remoteMessage);
      // You can show an in-app notification here if needed
      // For now, we'll just log it - the system notification will show automatically
    });

    // Background/quit state - notification opened (app in background)
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened from background:', remoteMessage);
      if (remoteMessage.data) {
        onNotificationTap(remoteMessage.data);
      }
    });

    // Check if app was opened from a notification (quit state)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification opened from quit state:', remoteMessage);
          if (remoteMessage.data) {
            onNotificationTap(remoteMessage.data);
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
