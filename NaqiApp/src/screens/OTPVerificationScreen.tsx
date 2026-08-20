import React, {useState} from 'react';
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

type OTPVerificationRouteProp = RouteProp<
  RootStackParamList,
  'OTPVerification'
>;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const OTPVerificationScreen: React.FC = () => {
  const {i18n, t} = useTranslation();
  const route = useRoute<OTPVerificationRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const {verifyPhoneOTP, verifyPhoneSignup} = useAuth();
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);

  const {confirmation, phoneNumber, sessionId, password, verificationType} = route.params;

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

    setLoading(true);
    try {
      if (verificationType === 'signup' && sessionId && password) {
        // Handle signup verification (uses Twilio)
        await verifyPhoneSignup(sessionId, confirmation, otp, true, phoneNumber, password);
        // User will be automatically navigated to dashboard by auth state change
      } else if (verificationType === 'phone_linking' && sessionId) {
        // Handle phone linking for existing users (uses Twilio)
        await verifyPhoneOTP(sessionId, otp);
        Alert.alert(
          i18n.language === 'ar' ? 'نجح' : 'Success',
          i18n.language === 'ar'
            ? 'تم ربط رقم الهاتف بنجاح'
            : 'Phone number linked successfully',
        );
        // Navigation will be handled by auth state change in AppNavigator
      } else {
        // Fallback: old phone linking flow (should not happen anymore)
        Alert.alert(
          i18n.language === 'ar' ? 'خطأ' : 'Error',
          i18n.language === 'ar'
            ? 'نوع التحقق غير صالح'
            : 'Invalid verification type',
        );
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);

      let errorMessage = 'Invalid verification code';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'رمز التحقق غير صحيح'
          : errorMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoneNumber = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.verifyOTP')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.otpSentTo')} {phoneNumber}
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
          style={styles.backButton}
          onPress={handleChangePhoneNumber}
          disabled={loading}>
          <Text style={styles.backButtonText}>
            {t('auth.changePhoneNumber')}
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
  backButton: {
    marginTop: 15,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default OTPVerificationScreen;
