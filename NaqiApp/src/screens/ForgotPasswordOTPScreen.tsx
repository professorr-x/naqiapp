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

type ForgotPasswordOTPRouteProp = RouteProp<
  RootStackParamList,
  'ForgotPasswordOTP'
>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ForgotPasswordOTPScreen: React.FC = () => {
  const {i18n, t} = useTranslation();
  const route = useRoute<ForgotPasswordOTPRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const {sendLoginOTP, verifyForgotPasswordOTP} = useAuth();

  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  const {sessionId, phoneNumberMasked, email} = route.params;

  useEffect(() => {
    // Send OTP automatically when screen loads
    sendOTPCode();
  }, []);

  const sendOTPCode = async () => {
    try {
      setLoading(true);
      // Note: We need to get the full phone number from backend
      // For now, show that OTP was sent
      Alert.alert(
        i18n.language === 'ar' ? 'إرسال رمز التحقق' : 'OTP Sent',
        i18n.language === 'ar'
          ? `تم إرسال رمز التحقق إلى ${phoneNumberMasked}`
          : `Verification code sent to ${phoneNumberMasked}`,
      );
    } catch (error) {
      console.error('Error sending OTP:', error);
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'فشل إرسال رمز التحقق'
          : 'Failed to send verification code',
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

    if (!confirmation) {
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
      // Verify OTP and get reset token
      const resetToken = await verifyForgotPasswordOTP(
        sessionId,
        confirmation,
        otp,
      );

      // Navigate to reset password screen
      navigation.navigate('ResetPassword', {
        resetToken,
      });
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'رمز التحقق غير صحيح'
          : 'Invalid verification code',
      );
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
          {i18n.language === 'ar'
            ? `تم إرسال رمز التحقق إلى ${phoneNumberMasked}`
            : `Verification code sent to ${phoneNumberMasked}`}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOTP}
          maxLength={6}
          autoFocus
          editable={!loading}
        />

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
          <Text style={styles.backButtonText}>
            {i18n.language === 'ar' ? 'رجوع' : 'Go Back'}
          </Text>
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
  },
});

export default ForgotPasswordOTPScreen;
