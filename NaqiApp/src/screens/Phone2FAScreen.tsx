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
import {useAuth} from '../contexts/AuthContext';
import CountryPicker, {Country, CountryCode} from 'react-native-country-picker-modal';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Phone2FA'>;

const Phone2FAScreen: React.FC<Props> = ({navigation}) => {
  const {t} = useTranslation();
  const [countryCode, setCountryCode] = useState<CountryCode>('IQ');
  const [callingCode, setCallingCode] = useState('964');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const {linkPhoneToAccount, signOut} = useAuth();

  const handleVerifyPhone = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', t('auth.invalidPhone'));
      return;
    }

    try {
      setLoading(true);
      const fullPhoneNumber = `+${callingCode}${phoneNumber}`;
      console.log('Sending verification code to:', fullPhoneNumber);

      const confirmation = await linkPhoneToAccount(fullPhoneNumber);
      console.log('Verification code sent successfully');

      navigation.navigate('OTPVerification', {
        confirmation,
        phoneNumber: fullPhoneNumber,
      });
    } catch (error: any) {
      console.error('Phone verification error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      let errorMessage = 'Failed to send verification code';
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUseAnotherAccount = async () => {
    try {
      await signOut();
      // Navigation to Login will be handled automatically by AppNavigator
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.phone2FA')}</Text>
          <Text style={styles.description}>{t('auth.phone2FADesc')}</Text>

          <View style={styles.phoneInputContainer}>
            <TouchableOpacity
              style={styles.countryPickerContainer}
              onPress={() => setCountryPickerVisible(true)}
              activeOpacity={0.7}>
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
              placeholder={t('auth.enterPhoneNumber')}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={15}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyPhone}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.verifyPhone')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleUseAnotherAccount}
            disabled={loading}>
            <Text style={styles.backButtonText}>
              {t('auth.useAnotherAccount')}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              A verification code will be sent to your phone number via SMS.
            </Text>
          </View>
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
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
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
  backButton: {
    marginTop: 15,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#0066CC',
    fontSize: 15,
    fontWeight: '500',
  },
  infoContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default Phone2FAScreen;
