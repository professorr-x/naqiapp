import React, {createContext, useState, useEffect, useContext, ReactNode} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from 'react-native-config';
import {
  checkDeviceRequiresOTP,
  verifyLoginOTP,
  initiateForgotPassword,
  verifyForgotPasswordOTP,
  resetPasswordWithToken,
  checkPhoneAvailability,
  signUpWithPhonePassword,
  verifyPhoneAfterSignup,
  loginWithPhonePassword,
  sendLoginOTP,
  verifyLoginOTPPhone,
} from '../services/api';
import {getDeviceFingerprint, getDeviceInfo} from '../utils/deviceFingerprint';
import notificationService from '../services/notificationService';

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
  }>;
  verifyPhoneSignup: (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
    rememberDevice: boolean,
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
  const setupPushNotifications = async () => {
    try {
      const hasPermission = await notificationService.requestPermission();
      if (hasPermission) {
        const token = await notificationService.getToken();
        if (token) {
          await notificationService.registerToken(token);
          console.log('Push notifications registered successfully');
        }
      } else {
        console.log('Push notification permission denied');
      }
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
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

        // Fetch user role from backend
        try {
          const response = await axios.get(`${Config.API_BASE_URL}/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setUserRole(response.data.role || 'user');
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('user'); // Default to user
        }

        // Check if phone is linked
        setNeedsPhoneVerification(!hasPhone);
        setUser(firebaseUser);

        // Setup push notifications after successful authentication
        setupPushNotifications();
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
    notificationService.setupNotificationHandlers((data) => {
      // Handle notification tap - navigate to order history
      if (data?.type === 'order_status_update') {
        console.log('Order status update notification tapped:', data);
        // Navigation will be handled by the app's navigation context
        // You can emit an event or use a navigation ref here
      }
    });
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
    const response = await verifyForgotPasswordOTP(sessionId);

    return response.data.reset_token;
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

    // Firebase was created in the backend with the user
    // Now sign in to get the auth state
    // The backend created an email-based account using phone as identifier
    const phoneEmail = `${formattedPhone.replace('+', '')}@naqi.app`;
    await auth().signInWithEmailAndPassword(phoneEmail, password);

    return {
      sessionId: response.data.session_id,
      userId: response.data.user_id,
    };
  };

  const verifyPhoneSignup = async (
    sessionId: string,
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string,
    rememberDevice: boolean,
  ) => {
    // Verify OTP and link phone to the email/password account
    const credential = auth.PhoneAuthProvider.credential(
      confirmation.verificationId,
      code,
    );

    // Link phone credential to current user (already signed in with email/password)
    const currentUser = auth().currentUser;
    if (currentUser) {
      try {
        await currentUser.linkWithCredential(credential);
      } catch (error: any) {
        // If phone already linked, that's okay
        if (error.code !== 'auth/credential-already-in-use') {
          throw error;
        }
      }
    }

    // Notify backend to mark phone as verified and trust device
    await verifyPhoneAfterSignup(sessionId, rememberDevice);

    // Phone is now verified and linked to the account
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
    await verifyLoginOTPPhone(sessionId, rememberDevice);
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
