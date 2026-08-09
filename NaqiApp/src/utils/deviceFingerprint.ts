import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {sha256} from 'react-native-sha256';

const INSTALLATION_ID_KEY = '@naqi_installation_id';

/**
 * Generate a unique device fingerprint for trusted device tracking
 * Uses a combination of device ID and installation ID
 * The installation ID persists across app launches but resets on reinstall
 */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    // Get or create installation ID (persists across app launches)
    let installationId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);

    if (!installationId) {
      // Generate new installation ID
      installationId = await DeviceInfo.getUniqueId();
      await AsyncStorage.setItem(INSTALLATION_ID_KEY, installationId);
    }

    // Get device-specific ID
    const deviceId = await DeviceInfo.getDeviceId();

    // Combine both IDs for fingerprint
    const fingerprintData = `${deviceId}_${installationId}`;

    // Hash the fingerprint for privacy and security
    const fingerprint = await sha256(fingerprintData);

    return fingerprint;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to timestamp-based fingerprint if device info fails
    const fallbackId = `fallback_${Date.now()}_${Math.random()}`;
    return sha256(fallbackId);
  }
}

/**
 * Get device information (name and OS)
 * Used for displaying device info to users
 */
export async function getDeviceInfo(): Promise<{
  deviceName: string;
  deviceOS: string;
}> {
  try {
    const deviceName = await DeviceInfo.getDeviceName();
    const systemName = DeviceInfo.getSystemName();
    const systemVersion = DeviceInfo.getSystemVersion();

    return {
      deviceName: deviceName || 'Unknown Device',
      deviceOS: `${systemName} ${systemVersion}`,
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return {
      deviceName: 'Unknown Device',
      deviceOS: 'Unknown OS',
    };
  }
}

/**
 * Clear installation ID (for testing or logout)
 * This will cause a new fingerprint to be generated on next login
 */
export async function clearDeviceFingerprint(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INSTALLATION_ID_KEY);
  } catch (error) {
    console.error('Error clearing device fingerprint:', error);
  }
}
