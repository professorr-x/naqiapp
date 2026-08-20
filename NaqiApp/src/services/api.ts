import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import Config from 'react-native-config';

const API_BASE_URL = Config.API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('firebase_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Handle token expiration
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expired - refresh it
      const currentUser = auth().currentUser;

      if (currentUser) {
        try {
          const newToken = await currentUser.getIdToken(true);
          await AsyncStorage.setItem('firebase_token', newToken);

          // Retry original request
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Token refresh failed - user needs to re-authenticate
          console.error('Token refresh failed:', refreshError);
          return Promise.reject(error);
        }
      }
    }
    return Promise.reject(error);
  },
);

// ==================== Sign Up APIs ====================

export const checkPhoneAvailability = async (
  phoneNumber: string,
  countryCode: string = '+964',
) => {
  return api.post('/auth/signup/check-phone', {
    phone_number: phoneNumber,
    country_code: countryCode,
  });
};

export const signUpWithPhonePassword = async (
  phoneNumber: string,
  password: string,
  confirmPassword: string,
  displayName: string,
  deviceFingerprint: string,
  deviceInfo: {deviceName: string; deviceOS: string},
  email?: string,
  countryCode: string = '+964',
) => {
  return api.post('/auth/signup/phone-password', {
    phone_number: phoneNumber,
    password,
    confirm_password: confirmPassword,
    display_name: displayName,
    email,
    country_code: countryCode,
    device_fingerprint: deviceFingerprint,
    device_name: deviceInfo.deviceName,
    device_os: deviceInfo.deviceOS,
  });
};

export const verifyPhoneAfterSignup = async (
  sessionId: string,
  rememberDevice: boolean,
) => {
  return api.post('/auth/signup/verify-phone', {
    session_id: sessionId,
    remember_device: rememberDevice,
  });
};

export const initiateOTPSignup = async (
  phoneNumber: string,
  displayName: string,
  deviceFingerprint: string,
  email?: string,
  countryCode: string = '+964',
) => {
  return api.post('/auth/signup/otp-initiate', {
    phone_number: phoneNumber,
    display_name: displayName,
    email,
    country_code: countryCode,
    device_fingerprint: deviceFingerprint,
  });
};

export const completeOTPSignup = async (
  sessionId: string,
  firebaseUid: string,
  rememberDevice: boolean,
) => {
  return api.post('/auth/signup/otp-complete', {
    session_id: sessionId,
    firebase_uid: firebaseUid,
    remember_device: rememberDevice,
  });
};

// ==================== Phone Login APIs ====================

export const loginWithPhonePassword = async (
  phoneNumber: string,
  password: string,
  deviceFingerprint: string,
  deviceInfo: {deviceName: string; deviceOS: string},
  countryCode: string = '+964',
) => {
  return api.post('/auth/login/phone-password', {
    phone_number: phoneNumber,
    password,
    device_fingerprint: deviceFingerprint,
    device_name: deviceInfo.deviceName,
    device_os: deviceInfo.deviceOS,
    country_code: countryCode,
  });
};

export const sendLoginOTP = async (
  phoneNumber: string,
  countryCode: string = '+964',
) => {
  return api.post('/auth/login/otp-send', {
    phone_number: phoneNumber,
    country_code: countryCode,
  });
};

export const verifyLoginOTPPhone = async (
  sessionId: string,
  rememberDevice: boolean,
) => {
  return api.post('/auth/login/otp-verify', {
    session_id: sessionId,
    remember_device: rememberDevice,
  });
};

// ==================== Login OTP APIs (Legacy Email-based) ====================

export const checkDeviceRequiresOTP = async (
  email: string,
  deviceFingerprint: string,
  deviceInfo: {deviceName: string; deviceOS: string},
) => {
  return api.post('/auth/login/check-device', {
    email,
    device_fingerprint: deviceFingerprint,
    device_name: deviceInfo.deviceName,
    device_os: deviceInfo.deviceOS,
  });
};

export const createLoginOTPSession = async (
  email: string,
  deviceFingerprint: string,
) => {
  return api.post('/auth/login/create-session', {
    email,
    device_fingerprint: deviceFingerprint,
  });
};

export const verifyLoginOTP = async (
  sessionId: string,
  rememberDevice: boolean,
) => {
  return api.post('/auth/login/verify-otp', {
    session_id: sessionId,
    remember_device: rememberDevice,
  });
};

// ==================== Forgot Password APIs ====================

export const initiateForgotPassword = async (email: string) => {
  return api.post('/auth/forgot-password/initiate', {email});
};

export const verifyForgotPasswordOTP = async (sessionId: string, otpCode: string) => {
  return api.post('/auth/forgot-password/verify-otp', {
    session_id: sessionId,
    otp_code: otpCode,
  });
};

export const resetPasswordWithToken = async (
  resetToken: string,
  newPassword: string,
) => {
  return api.post('/auth/forgot-password/reset', {
    reset_token: resetToken,
    new_password: newPassword,
  });
};

// ==================== Trusted Devices APIs ====================

export const getTrustedDevices = async () => {
  return api.get('/auth/trusted-devices');
};

export const revokeTrustedDevice = async (deviceId: string) => {
  return api.delete(`/auth/trusted-devices/${deviceId}`);
};

// ==================== User Preferences APIs ====================

export const updateUserLanguage = async (language: 'en' | 'ar') => {
  return api.patch('/users/me/language', {language});
};

// ==================== Twilio Verify APIs ====================

export const sendTwilioVerification = async (
  phoneNumber: string,
  locale: string = 'en',
) => {
  return api.post(`/auth/verify/send?phone_number=${encodeURIComponent(phoneNumber)}&locale=${locale}`);
};

export const checkTwilioVerification = async (
  phoneNumber: string,
  code: string,
) => {
  return api.post(`/auth/verify/check?phone_number=${encodeURIComponent(phoneNumber)}&code=${code}`);
};

export const isIraqiNumber = (phoneNumber: string): boolean => {
  // Check if phone number is from Iraq (+964)
  const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  return normalized.startsWith('+964');
};

// ==================== Phone 2FA Linking APIs (Twilio) ====================

export const initiatePhoneLinking = async (phoneNumber: string) => {
  return api.post(`/auth/link-phone/initiate?phone_number=${encodeURIComponent(phoneNumber)}`);
};

export const verifyPhoneLinking = async (sessionId: string, otpCode: string) => {
  return api.post(`/auth/link-phone/verify?session_id=${sessionId}&otp_code=${otpCode}`);
};

export default api;
