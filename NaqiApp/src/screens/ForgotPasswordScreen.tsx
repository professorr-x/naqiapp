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
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../contexts/AuthContext';
import {COLORS} from '../constants';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ForgotPasswordScreen: React.FC = () => {
  const {i18n, t} = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const {startForgotPassword, sendLoginOTP} = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validate email
    if (!email || !email.includes('@')) {
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح'
          : 'Please enter a valid email address',
      );
      return;
    }

    setLoading(true);
    try {
      const {phoneNumberMasked, sessionId} = await startForgotPassword(email);

      // Navigate to OTP verification screen
      navigation.navigate('ForgotPasswordOTP', {
        sessionId,
        phoneNumberMasked,
        email,
      });
    } catch (error: any) {
      console.error('Error initiating forgot password:', error);
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'فشل في إرسال رمز التحقق. يرجى التحقق من بريدك الإلكتروني.'
          : 'Failed to send verification code. Please check your email.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.forgotPassword')}</Text>
        <Text style={styles.subtitle}>
          {i18n.language === 'ar'
            ? 'أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور'
            : 'Enter your email to reset your password'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={t('auth.email')}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>{t('auth.sendOTP')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}>
          <Text style={styles.backButtonText}>
            {i18n.language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
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
    fontSize: 16,
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

export default ForgotPasswordScreen;
