import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../contexts/AuthContext';
import {COLORS} from '../constants';
import type {RootStackParamList} from '../navigation/types';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

type LoginOTPRouteProp = RouteProp<RootStackParamList, 'LoginOTP'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginOTPScreen: React.FC = () => {
  const {i18n, t} = useTranslation();
  const route = useRoute<LoginOTPRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const {sendLoginOTP, verifyPhoneLoginOTP, sendTwilioOTP, verifyTwilioOTP, isIraqiNumber} = useAuth();

  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [useTwilio, setUseTwilio] = useState(false);

  const {phoneNumber, sessionId, phoneNumberMasked} = route.params;

  useEffect(() => {
    // Check if this is an Iraqi number
    setUseTwilio(isIraqiNumber(phoneNumber));
  }, [phoneNumber]);

  useEffect(() => {
    // Send OTP automatically when screen loads
    sendOTPCode();
  }, []);

  const sendOTPCode = async () => {
    try {
      setLoading(true);
      console.log('=== SENDING OTP ===');
      console.log('Phone number:', phoneNumber);
      console.log('Masked number:', phoneNumberMasked);
      console.log('Using Twilio:', useTwilio);

      if (useTwilio) {
        // Use Twilio Verify for Iraqi numbers
        await sendTwilioOTP(phoneNumber);
        console.log('Twilio OTP sent successfully');
      } else {
        // Use Firebase for other countries
        const confirmationResult = await sendLoginOTP(phoneNumber);
        console.log('Firebase OTP sent successfully, verificationId:', confirmationResult.verificationId);
        setConfirmation(confirmationResult);
      }

      Alert.alert(
        i18n.language === 'ar' ? 'إرسال رمز التحقق' : 'OTP Sent',
        i18n.language === 'ar'
          ? `تم إرسال رمز التحقق إلى ${phoneNumberMasked}`
          : `Verification code sent to ${phoneNumberMasked}`,
      );
    } catch (error: any) {
      console.error('=== OTP SEND ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));

      let errorMessage = 'Failed to send verification code';
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please contact support';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'فشل إرسال رمز التحقق'
          : errorMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام'
          : 'Please enter the 6-digit verification code',
      );
      return;
    }

    // For Firebase, we need confirmation. For Twilio, we don't
    if (!useTwilio && !confirmation) {
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'لم يتم إرسال رمز التحقق بعد'
          : 'Verification code not sent yet',
      );
      return;
    }

    setLoading(true);
    try {
      if (useTwilio) {
        // Verify with Twilio
        await verifyTwilioOTP(phoneNumber, otp);
        console.log('Twilio OTP verified successfully');
        // For Twilio, we also need to call the backend to complete login
        await verifyLoginOTP(sessionId, rememberDevice);
      } else {
        // Verify with Firebase
        await verifyPhoneLoginOTP(sessionId, confirmation, otp, rememberDevice);
      }
      // User is now logged in, navigation will be handled by auth state
    } catch (error: any) {
      console.error('Error verifying OTP:', error);

      // Provide specific error messages based on error type
      let errorMessage = 'Invalid verification code';
      let errorMessageAr = 'رمز التحقق غير صحيح';

      if (error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('session expired') || msg.includes('invalid session')) {
          errorMessage = 'Session expired. Please try logging in again.';
          errorMessageAr = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.';
        } else if (msg.includes('backend verification failed')) {
          errorMessage = 'Verification failed. Please try again.';
          errorMessageAr = 'فشل التحقق. يرجى المحاولة مرة أخرى.';
        } else if (error.code === 'auth/invalid-verification-code') {
          errorMessage = 'Invalid verification code. Please check and try again.';
          errorMessageAr = 'رمز التحقق غير صحيح. يرجى التحقق والمحاولة مرة أخرى.';
        } else if (error.code === 'auth/code-expired') {
          errorMessage = 'Verification code expired. Please request a new one.';
          errorMessageAr = 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
        }
      }

      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar' ? errorMessageAr : errorMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    sendOTPCode();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.verifyOTP')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.otpSentTo')} {phoneNumberMasked}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={COLORS.gray}
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOTP}
          maxLength={6}
          autoFocus
          editable={!loading}
        />

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setRememberDevice(!rememberDevice)}
          disabled={loading}>
          <View
            style={[styles.checkbox, rememberDevice && styles.checkboxChecked]}>
            {rememberDevice && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            {t('auth.rememberDevice')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>{t('auth.verify')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendOTP}
          disabled={loading}>
          <Text style={styles.resendButtonText}>{t('auth.resendOTP')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}>
          <Text style={styles.backButtonText}>{t('auth.backToLogin')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.black,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 20,
    color: COLORS.black,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.black,
    flex: 1,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 15,
    padding: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  backButton: {
    marginTop: 10,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginOTPScreen;
