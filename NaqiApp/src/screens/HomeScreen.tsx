import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {HomeScreenNavigationProp} from '../navigation/types';
import {COLORS} from '../constants';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const {t, i18n} = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
          <Text style={styles.langButtonText}>
            {i18n.language === 'en' ? 'عربي' : 'English'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Image
          source={require('../assets/loading_screen.png')}
          style={styles.loadingImage}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/full_logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        {/* <Text style={styles.appName}>{t('app.name')}</Text> */}
        {/* <Text style={styles.tagline}>{t('app.tagline')}</Text> */}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('OrderType')}>
            <Text style={styles.primaryButtonText}>
              {t('home.orderWater')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('HowItWorks')}>
            <Text style={styles.secondaryButtonText}>
              {t('home.howItWorks')}
            </Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    alignItems: 'flex-end',
  },
  langButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  langButtonText: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingImage: {
    width: 200,
    height: 200,
    marginBottom: 15,
  },
  logoImage: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 50,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HomeScreen;
