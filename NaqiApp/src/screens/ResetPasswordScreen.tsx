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

type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ResetPasswordScreen: React.FC = () => {
  const {i18n, t} = useTranslation();
  const route = useRoute<ResetPasswordRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const {resetPassword} = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const {resetToken} = route.params;

  const handleResetPassword = async () => {
    // Validate passwords
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'
          : 'Password must be at least 6 characters',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'كلمات المرور غير متطابقة'
          : 'Passwords do not match',
      );
      return;
    }

    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword);

      Alert.alert(
        i18n.language === 'ar' ? 'نجاح' : 'Success',
        i18n.language === 'ar'
          ? 'تم إعادة تعيين كلمة المرور بنجاح'
          : t('auth.passwordResetSuccess'),
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to login screen
              navigation.navigate('Login');
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'فشل في إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.'
          : 'Failed to reset password. Please try again.',
      );
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.resetPassword')}</Text>
        <Text style={styles.subtitle}>
          {i18n.language === 'ar'
            ? 'أدخل كلمة المرور الجديدة'
            : 'Enter your new password'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={t('auth.enterNewPassword')}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder={t('auth.confirmNewPassword')}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>
              {t('auth.resetPassword')}
            </Text>
          )}
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
    marginBottom: 15,
    color: COLORS.black,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;
