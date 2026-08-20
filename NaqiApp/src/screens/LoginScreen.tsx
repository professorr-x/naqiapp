import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../contexts/AuthContext';
import type {RootStackParamList} from '../navigation/types';
import CountryPicker, {Country, CountryCode} from 'react-native-country-picker-modal';
import {COLORS} from '../constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen = () => {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [countryCode, setCountryCode] = useState<CountryCode>('IQ');
  const [callingCode, setCallingCode] = useState('964');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const {signInWithPhone, signUpWithPhone} = useAuth();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogin = async () => {
    // Validation
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', t('auth.invalidPhone'));
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Error', t('auth.invalidPassword'));
      return;
    }

    try {
      setLoading(true);

      // Remove leading 0 if present (for international format)
      const normalizedPhone = phoneNumber.startsWith('0')
        ? phoneNumber.substring(1)
        : phoneNumber;

      // Sign in with phone/password
      const fullPhoneNumber = `+${callingCode}${normalizedPhone}`;
      const result = await signInWithPhone(fullPhoneNumber, password, `+${callingCode}`);

      if (result.requiresOtp) {
        // Navigate to OTP screen for verification
        navigation.navigate('LoginOTP', {
          phoneNumber: fullPhoneNumber,
          sessionId: result.sessionId!,
          phoneNumberMasked: result.phoneNumberMasked!,
          password: password,
        });
      }
      // If no OTP required, navigation will be handled by AppNavigator
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        t('auth.loginError');
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    // Validation
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', t('auth.invalidPhone'));
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Error', t('auth.invalidPasswordLength'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', t('auth.passwordMismatch'));
      return;
    }
    if (!fullName || fullName.trim().length < 2) {
      Alert.alert('Error', t('auth.invalidName'));
      return;
    }

    try {
      setLoading(true);

      // Remove leading 0 if present (for international format)
      const normalizedPhone = phoneNumber.startsWith('0')
        ? phoneNumber.substring(1)
        : phoneNumber;

      const fullPhoneNumber = `+${callingCode}${normalizedPhone}`;
      const result = await signUpWithPhone(fullPhoneNumber, password, fullName, `+${callingCode}`);

      // Navigate to phone verification screen with OTP confirmation
      navigation.navigate('OTPVerification', {
        confirmation: result.confirmation,
        phoneNumber: result.phoneNumber,
        sessionId: result.sessionId,
        password: result.password,
        verificationType: 'signup',
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        t('auth.signupError');
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header with Language Toggle */}
        <View style={styles.header}>
          <Text style={styles.logo}>NAQI</Text>
          <TouchableOpacity
            style={styles.langButton}
            onPress={toggleLanguage}>
            <Text style={styles.langText}>
              {i18n.language === 'en' ? 'عربي' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'login' && styles.activeTab]}
            onPress={() => setActiveTab('login')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'login' && styles.activeTabText,
              ]}>
              {t('auth.login')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
            onPress={() => setActiveTab('signup')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'signup' && styles.activeTabText,
              ]}>
              {t('auth.signup')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {activeTab === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder={t('auth.fullName')}
              placeholderTextColor={COLORS.gray}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />
          )}

          <View style={styles.phoneInputContainer}>
            <TouchableOpacity
              style={styles.countryPickerContainer}
              onPress={() => setCountryPickerVisible(true)}
              activeOpacity={0.7}
              disabled={loading}>
              <CountryPicker
                countryCode={countryCode}
                withFilter
                withFlag
                withCallingCode
                withEmoji
                visible={countryPickerVisible}
                onClose={() => setCountryPickerVisible(false)}
                onSelect={(country: Country) => {
                  setCountryCode(country.cca2);
                  if (country.callingCode && country.callingCode.length > 0) {
                    setCallingCode(country.callingCode[0]);
                  }
                  setCountryPickerVisible(false);
                }}
                containerButtonStyle={styles.countryPickerButton}
              />
              <Text style={styles.callingCode}>+{callingCode}</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              placeholder={t('auth.phoneNumber')}
              placeholderTextColor={COLORS.gray}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            placeholderTextColor={COLORS.gray}
            color="#333"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          {activeTab === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder={t('auth.confirmPassword')}
              placeholderTextColor={COLORS.gray}
              color="#333"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={activeTab === 'login' ? handleLogin : handleSignup}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {activeTab === 'login'
                  ? t('auth.signIn')
                  : t('auth.createAccount')}
              </Text>
            )}
          </TouchableOpacity>

          {activeTab === 'login' && (
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}>
              <Text style={styles.forgotPasswordText}>
                {t('auth.forgotPassword')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  langButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  langText: {
    fontSize: 14,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 30,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    overflow: 'hidden',
  },
  countryPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 15,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  countryPickerButton: {
    marginRight: 8,
  },
  callingCode: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#0066CC',
    fontSize: 14,
  },
});

export default LoginScreen;
