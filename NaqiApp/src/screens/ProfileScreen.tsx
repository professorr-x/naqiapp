import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../contexts/AuthContext';
import {COLORS} from '../constants';
import auth from '@react-native-firebase/auth';
import {updateUserLanguage} from '../services/api';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const {t, i18n} = useTranslation();
  const {user, signOut} = useAuth();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      t('profile.confirmLogout'),
      t('profile.confirmLogoutMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('auth.logout'),
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled automatically by AppNavigator
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', t('profile.fillAllFields'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', t('auth.invalidPassword'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', t('auth.passwordMismatch'));
      return;
    }

    try {
      setLoading(true);

      // Re-authenticate user before changing password
      const currentUser = auth().currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('No user signed in');
      }

      const credential = auth.EmailAuthProvider.credential(
        currentUser.email,
        currentPassword,
      );

      await currentUser.reauthenticateWithCredential(credential);
      await currentUser.updatePassword(newPassword);

      Alert.alert('Success', t('profile.passwordChanged'));
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Change password error:', error);

      let errorMessage = 'Failed to change password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = t('profile.wrongCurrentPassword');
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (language: 'en' | 'ar') => {
    if (languageLoading) return;

    try {
      setLanguageLoading(true);

      // Update i18n language
      await i18n.changeLanguage(language);

      // Save to AsyncStorage
      await AsyncStorage.setItem('user_language', language);

      // Update backend preference
      try {
        await updateUserLanguage(language);
      } catch (apiError) {
        console.error('Failed to update language on backend:', apiError);
        // Continue anyway - local change is more important
      }

      Alert.alert('Success', t('profile.languageChanged'));
    } catch (error) {
      console.error('Language change error:', error);
      Alert.alert('Error', 'Failed to change language');
    } finally {
      setLanguageLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.userInfo}>
          <Text style={styles.label}>{t('auth.email')}</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.label}>{t('auth.fullName')}</Text>
          <Text style={styles.value}>{user?.displayName || 'N/A'}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.label}>{t('profile.phoneNumber')}</Text>
          <Text style={styles.value}>
            {user?.phoneNumber || t('profile.notLinked')}
          </Text>
        </View>

        <View style={styles.languageSection}>
          <Text style={styles.label}>{t('profile.language')}</Text>
          <View style={styles.languageButtons}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === 'en' && styles.languageButtonActive,
              ]}
              onPress={() => handleLanguageChange('en')}
              disabled={languageLoading}>
              <Text
                style={[
                  styles.languageButtonText,
                  i18n.language === 'en' && styles.languageButtonTextActive,
                ]}>
                {t('profile.english')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === 'ar' && styles.languageButtonActive,
              ]}
              onPress={() => handleLanguageChange('ar')}
              disabled={languageLoading}>
              <Text
                style={[
                  styles.languageButtonText,
                  i18n.language === 'ar' && styles.languageButtonTextActive,
                ]}>
                {t('profile.arabic')}
              </Text>
            </TouchableOpacity>
          </View>
          {languageLoading && (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={styles.languageLoader}
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => setShowPasswordChange(!showPasswordChange)}>
          <Text style={styles.optionButtonText}>
            {t('profile.changePassword')}
          </Text>
        </TouchableOpacity>

        {showPasswordChange && (
          <View style={styles.passwordChangeContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('profile.currentPassword')}
              placeholderTextColor={COLORS.gray}
              color="#333"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder={t('profile.newPassword')}
              placeholderTextColor={COLORS.gray}
              color="#333"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder={t('auth.confirmPassword')}
              placeholderTextColor={COLORS.gray}
              color="#333"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleChangePassword}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {t('profile.updatePassword')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    fontSize: 28,
    color: COLORS.primary,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.black,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userInfo: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  label: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
  },
  languageSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  languageButtonText: {
    fontSize: 15,
    color: COLORS.black,
    fontWeight: '500',
  },
  languageButtonTextActive: {
    color: COLORS.white,
  },
  languageLoader: {
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  optionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  passwordChangeContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#DC3545',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
