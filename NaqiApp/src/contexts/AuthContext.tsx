import React, {createContext, useState, useEffect, useContext, ReactNode} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from 'react-native-config';
import {
  checkDeviceRequiresOTP,
  verifyLoginOTP,
  initiateForgotPassword,
  verifyForgotPasswordOTP as apiVerifyForgotPasswordOTP,
  resetPasswordWithToken,
  checkPhoneAvailability,
  signUpWithPhonePassword,
  verifyPhoneAfterSignup,
  loginWithPhonePassword,
  sendLoginOTP,
  verifyLoginOTPPhone,
  sendTwilioVerification,
  checkTwilioVerification,
  isIraqiNumber,
} from '../services/api';
import {getDeviceFingerprint, getDeviceInfo} from '../utils/deviceFingerprint';
import notificationService, {NotificationData} from '../services/notificationService';
import {navigate} from '../navigation/AppNavigator';
import i18n from '../i18n';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  idToken: string | null;
  needsPhoneVerification: boolean;
  userRole: string | null;
  refreshUserRole: () => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<FirebaseAuthTypes.UserCredential>;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<FirebaseAuthTypes.UserCredential>;
  sendPasswordReset: (email: string) => Promise<void>;
  linkPhoneToAccount: (
    phoneNumber: string,
  ) => Promise<FirebaseAuthTypes.ConfirmationResult>;
  verifyPhoneOTP: (
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
  ) => Promise<void>;
  isPhoneLinked: () => boolean;
  signOut: () => Promise<void>;
  // New OTP methods
  checkDeviceForLogin: (email: string) => Promise<{
    requiresOtp: boolean;
    userExists: boolean;
    phoneNumberMasked?: string;
    sessionId?: string;
  }>;
  sendLoginOTP: (phoneNumber: string) => Promise<FirebaseAuthTypes.ConfirmationResult>;
  verifyLoginOTPAndTrust: (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
    rememberDevice: boolean,
  ) => Promise<void>;
  startForgotPassword: (email: string) => Promise<{
    phoneNumberMasked: string;
    sessionId: string;
  }>;
  verifyForgotPasswordOTP: (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
  ) => Promise<string>;
  resetPassword: (resetToken: string, newPassword: string) => Promise<void>;
  // Phone-based authentication
  checkPhoneAvailability: (phoneNumber: string, countryCode?: string) => Promise<{
    available: boolean;
    message: string;
  }>;
  signUpWithPhone: (
    phoneNumber: string,
    password: string,
    displayName: string,
    countryCode?: string,
  ) => Promise<{
    sessionId: string;
    userId: string;
    confirmation: FirebaseAuthTypes.ConfirmationResult;
    phoneNumber: string;
    password: string;
  }>;
  verifyPhoneSignup: (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
    rememberDevice: boolean,
    phoneNumber: string,
    password: string,
  ) => Promise<void>;
  signInWithPhone: (
    phoneNumber: string,
    password: string,
    countryCode?: string,
  ) => Promise<{
    requiresOtp: boolean;
    sessionId?: string;
    phoneNumberMasked?: string;
  }>;
  verifyPhoneLoginOTP: (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
    rememberDevice: boolean,
  ) => Promise<void>;
  // Twilio Verify methods (for Iraqi numbers)
  sendTwilioOTP: (phoneNumber: string) => Promise<void>;
  verifyTwilioOTP: (phoneNumber: string, code: string) => Promise<void>;
  isIraqiNumber: (phoneNumber: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Setup push notifications
  const setupPushNotifications = async (firebaseToken: string) => {
    try {
      console.log('[AuthContext] Setting up push notifications with auth token');
      const hasPermission = await notificationService.requestPermission();
      if (hasPermission) {
        const fcmToken = await notificationService.getToken();
        if (fcmToken) {
          // Pass Firebase auth token directly to avoid AsyncStorage race condition
          await notificationService.registerToken(fcmToken, firebaseToken);
          console.log('[AuthContext] ✓ Push notifications registered successfully');
        }
      } else {
        console.log('[AuthContext] Push notification permission denied');
      }
    } catch (error) {
      console.error('[AuthContext] Failed to setup push notifications:', error);
    }
  };

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async firebaseUser => {
      if (firebaseUser) {
        // Check if this is an old phone-only user (no email provider)
        const hasEmail = firebaseUser.providerData.some(
          provider => provider.providerId === 'password',
        );
        const hasPhone = firebaseUser.providerData.some(
          provider => provider.providerId === 'phone',
        );

        // If user only has phone auth (old system), sign them out
        if (hasPhone && !hasEmail) {
          console.log('Old phone-only user detected, signing out...');
          await auth().signOut();
          await AsyncStorage.removeItem('firebase_token');
          setUser(null);
          setIdToken(null);
          setNeedsPhoneVerification(false);
          setLoading(false);
          return;
        }

        // Get and store ID token
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
        await AsyncStorage.setItem('firebase_token', token);

        // Fetch user role and language preference from backend
        try {
          const response = await axios.get(`${Config.API_BASE_URL}/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setUserRole(response.data.role || 'user');

          // Sync language preference from backend if available
          const backendLanguage = response.data.preferred_language;
          if (backendLanguage && (backendLanguage === 'en' || backendLanguage === 'ar')) {
            const currentLanguage = await AsyncStorage.getItem('user_language');
            if (currentLanguage !== backendLanguage) {
              // Backend preference takes precedence
              await AsyncStorage.setItem('user_language', backendLanguage);
              i18n.changeLanguage(backendLanguage);
              console.log(`Language synced from backend: ${backendLanguage}`);
            }
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('user'); // Default to user
        }

        // Check if phone is linked
        setNeedsPhoneVerification(!hasPhone);
        setUser(firebaseUser);

        // Setup push notifications after successful authentication
        // Pass the Firebase token directly to avoid AsyncStorage race condition
        setupPushNotifications(token);
      } else {
        setIdToken(null);
        setNeedsPhoneVerification(false);
        setUserRole(null);
        await AsyncStorage.removeItem('firebase_token');
        setUser(null);
      }

      setLoading(false);
    });

    return subscriber;
  }, []);

  // Setup notification handlers once on mount
  useEffect(() => {
    const handleNotificationTap = (data: NotificationData) => {
      console.log('Notification tapped with data:', data);

      // Handle different notification types
      switch (data.type) {
        case 'order_status_update':
        case 'order_update':
          // Navigate to OrderDetails screen if orderId is provided
          if (data.orderId) {
            console.log('Navigating to OrderDetails with orderId:', data.orderId);
            navigate('OrderDetails', {orderId: data.orderId});
          } else {
            // Navigate to OrderHistory if no specific order ID
            console.log('Navigating to OrderHistory');
            navigate('MainTabs', {screen: 'OrderHistory'});
          }
          break;

        case 'chat_message':
          // Navigate to Chat screen
          console.log('Navigating to Chat');
          navigate('MainTabs', {screen: 'Chat'});
          break;

        case 'promotion':
        case 'general':
        default:
          // Navigate to Home screen for general notifications
          console.log('Navigating to Home');
          navigate('MainTabs', {screen: 'Home'});
          break;
      }
    };

    notificationService.setupNotificationHandlers(handleNotificationTap);
  }, []);

  // Email/Password authentication
  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      password,
    );
    await userCredential.user.updateProfile({displayName});
    return userCredential;
  };

  const signInWithEmail = async (email: string, password: string) => {
    return await auth().signInWithEmailAndPassword(email, password);
  };

  const sendPasswordReset = async (email: string) => {
    await auth().sendPasswordResetEmail(email);
  };

  // Phone 2FA - linking phone to email account
  const linkPhoneToAccount = async (phoneNumber: string) => {
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+${phoneNumber}`;

    console.log('linkPhoneToAccount called with:', formattedPhone);
    console.log('Current user:', auth().currentUser?.email);

    try {
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      console.log('signInWithPhoneNumber resolved with confirmation:', confirmation.verificationId);
      return confirmation;
    } catch (error) {
      console.error('signInWithPhoneNumber error:', error);
      throw error;
    }
  };

  const verifyPhoneOTP = async (
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
  ) => {
    // Get the phone credential
    const credential = auth.PhoneAuthProvider.credential(
      confirmation.verificationId,
      code,
    );

    // Link the credential to the current user (don't sign in with it)
    const currentUser = auth().currentUser;
    if (currentUser) {
      await currentUser.linkWithCredential(credential);
    } else {
      throw new Error('No user is currently signed in');
    }
  };

  const isPhoneLinked = () => {
    return (
      user?.providerData.some(provider => provider.providerId === 'phone') ??
      false
    );
  };

  const signOut = async () => {
    // Unregister device token before signing out
    await notificationService.unregisterToken();
    await auth().signOut();
    await AsyncStorage.removeItem('firebase_token');
    setUserRole(null);
  };

  const refreshUserRole = async () => {
    if (!user || !idToken) return;

    try {
      const response = await axios.get(`${Config.API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      setUserRole(response.data.role || 'user');
    } catch (error) {
      console.error('Error refreshing user role:', error);
    }
  };

  // ==================== New OTP Methods ====================

  const checkDeviceForLogin = async (email: string) => {
    const deviceFingerprint = await getDeviceFingerprint();
    const deviceInfo = await getDeviceInfo();

    const response = await checkDeviceRequiresOTP(
      email,
      deviceFingerprint,
      deviceInfo,
    );

    return {
      requiresOtp: response.data.requires_otp,
      userExists: response.data.user_exists,
      phoneNumberMasked: response.data.phone_number_masked,
      sessionId: response.data.session_id,
    };
  };

  const sendLoginOTP = async (phoneNumber: string) => {
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+${phoneNumber}`;

    return await auth().signInWithPhoneNumber(formattedPhone);
  };

  const verifyLoginOTPAndTrust = async (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
    rememberDevice: boolean,
  ) => {
    // Verify OTP with Firebase first
    await confirmation.confirm(code);

    // Get fresh Firebase token and save to AsyncStorage
    const currentUser = auth().currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      await AsyncStorage.setItem('firebase_token', token);
    }

    // Then notify backend to trust device if requested
    await verifyLoginOTP(sessionId, rememberDevice);
  };

  const startForgotPassword = async (email: string) => {
    const response = await initiateForgotPassword(email);

    return {
      phoneNumberMasked: response.data.phone_number_masked,
      sessionId: response.data.session_id,
    };
  };

  const verifyForgotPasswordOTP = async (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
  ) => {
    // Verify OTP with Firebase first
    await confirmation.confirm(code);

    // Then get reset token from backend
    try {
      const response = await apiVerifyForgotPasswordOTP(sessionId);
      return response.data.reset_token;
    } catch (backendError: any) {
      // If backend validation fails, sign out to prevent unwanted auth state
      console.error('Backend forgot password OTP verification failed:', backendError);
      await signOut();

      // Re-throw with more specific error message
      const errorMessage = backendError.message || 'Failed to verify OTP';
      if (errorMessage.includes('expired') || errorMessage.includes('invalid session')) {
        throw new Error('Session expired. Please start the password reset process again.');
      }
      throw new Error(errorMessage);
    }
  };

  const resetPassword = async (resetToken: string, newPassword: string) => {
    await resetPasswordWithToken(resetToken, newPassword);
  };

  // ==================== Phone-based Authentication Methods ====================

  const checkPhoneAvailabilityFn = async (
    phoneNumber: string,
    countryCode: string = '+964',
  ) => {
    const response = await checkPhoneAvailability(phoneNumber, countryCode);
    return {
      available: response.data.available,
      message: response.data.message,
    };
  };

  const signUpWithPhone = async (
    phoneNumber: string,
    password: string,
    displayName: string,
    countryCode: string = '+964',
  ) => {
    const deviceFingerprint = await getDeviceFingerprint();
    const deviceInfo = await getDeviceInfo();

    // Normalize phone number
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `${countryCode}${phoneNumber}`;

    // Create user in backend (this creates the Firebase Auth user with phone + password)
    const response = await signUpWithPhonePassword(
      phoneNumber,
      password,
      password, // confirm_password
      displayName,
      deviceFingerprint,
      deviceInfo,
      undefined, // email is optional
      countryCode,
    );

    // Send OTP via Twilio Verify instead of Firebase (avoids iOS reCAPTCHA requirement)
    const language = await AsyncStorage.getItem('user_language');
    const locale = language === 'ar' ? 'ar' : 'en';
    await sendTwilioVerification(formattedPhone, locale);

    return {
      sessionId: response.data.session_id,
      userId: response.data.user_id,
      confirmation: null, // No Firebase confirmation needed for Twilio
      phoneNumber: formattedPhone,
      password, // Store password to sign in after OTP verification
    };
  };

  const verifyPhoneSignup = async (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult | null,
    code: string,
    rememberDevice: boolean,
    phoneNumber: string,
    password: string,
  ) => {
    // Verify OTP with Twilio instead of Firebase
    await checkTwilioVerification(phoneNumber, code);

    // Sign in with email/password (backend already created the user)
    const phoneEmail = `${phoneNumber.replace('+', '')}@naqi.app`;
    await auth().signInWithEmailAndPassword(phoneEmail, password);

    // Get fresh Firebase token and save to AsyncStorage
    const user = auth().currentUser;
    if (user) {
      const token = await user.getIdToken();
      await AsyncStorage.setItem('firebase_token', token);
    }

    // Notify backend to mark phone as verified and trust device
    await verifyPhoneAfterSignup(sessionId, rememberDevice);

    // Phone is now verified and account is ready
  };

  const signInWithPhone = async (
    phoneNumber: string,
    password: string,
    countryCode: string = '+964',
  ) => {
    const deviceFingerprint = await getDeviceFingerprint();
    const deviceInfo = await getDeviceInfo();

    // Normalize phone number
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `${countryCode}${phoneNumber}`;

    // Check if device requires OTP
    const response = await loginWithPhonePassword(
      phoneNumber,
      password,
      deviceFingerprint,
      deviceInfo,
      countryCode,
    );

    if (!response.data.requires_otp) {
      // Trusted device - sign in with password directly
      const phoneEmail = `${formattedPhone.replace('+', '')}@naqi.app`;
      await auth().signInWithEmailAndPassword(phoneEmail, password);
    }

    return {
      requiresOtp: response.data.requires_otp,
      sessionId: response.data.session_id,
      phoneNumberMasked: response.data.phone_number_masked,
    };
  };

  const verifyPhoneLoginOTP = async (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
    rememberDevice: boolean,
  ) => {
    // Verify OTP with Firebase first - this links the phone to the account
    const credential = auth.PhoneAuthProvider.credential(
      confirmation.verificationId,
      code,
    );

    // Link phone credential to current user or sign in
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        // User is signed in with email/password, link phone
        await currentUser.linkWithCredential(credential);
      } else {
        // Sign in with phone credential
        await auth().signInWithCredential(credential);
      }
    } catch (error: any) {
      // If already linked, just confirm
      if (error.code === 'auth/credential-already-in-use') {
        await auth().signInWithCredential(credential);
      } else {
        throw error;
      }
    }

    // Then notify backend to trust device if requested
    try {
      // Get fresh Firebase token directly from the user (not AsyncStorage)
      const currentUser = auth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        await AsyncStorage.setItem('firebase_token', token);
      }

      await verifyLoginOTPPhone(sessionId, rememberDevice);
    } catch (backendError: any) {
      // If backend validation fails, sign out the user to prevent auto-navigation
      console.error('Backend OTP verification failed:', backendError);
      await signOut();

      // Re-throw with more specific error message
      const errorMessage = backendError.message || 'Backend verification failed';
      if (errorMessage.includes('expired') || errorMessage.includes('invalid session')) {
        throw new Error('Session expired. Please try logging in again.');
      }
      throw new Error(errorMessage);
    }
  };

  // ==================== Twilio Verify Methods ====================

  const sendTwilioOTP = async (phoneNumber: string) => {
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+${phoneNumber}`;

    // Get user's language preference
    const language = await AsyncStorage.getItem('user_language');
    const locale = language === 'ar' ? 'ar' : 'en';

    await sendTwilioVerification(formattedPhone, locale);
  };

  const verifyTwilioOTP = async (phoneNumber: string, code: string) => {
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+${phoneNumber}`;

    await checkTwilioVerification(formattedPhone, code);
  };

  const checkIsIraqiNumber = (phoneNumber: string): boolean => {
    return isIraqiNumber(phoneNumber);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        idToken,
        needsPhoneVerification,
        userRole,
        refreshUserRole,
        signUpWithEmail,
        signInWithEmail,
        sendPasswordReset,
        linkPhoneToAccount,
        verifyPhoneOTP,
        isPhoneLinked,
        signOut,
        checkDeviceForLogin,
        sendLoginOTP: sendLoginOTP,
        verifyLoginOTPAndTrust,
        startForgotPassword,
        verifyForgotPasswordOTP,
        resetPassword,
        // Phone-based authentication
        checkPhoneAvailability: checkPhoneAvailabilityFn,
        signUpWithPhone,
        verifyPhoneSignup,
        signInWithPhone,
        verifyPhoneLoginOTP,
        // Twilio Verify (for Iraqi numbers)
        sendTwilioOTP,
        verifyTwilioOTP,
        isIraqiNumber: checkIsIraqiNumber,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
