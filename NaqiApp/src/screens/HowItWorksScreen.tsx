import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {COLORS} from '../constants';

const HowItWorksScreen: React.FC = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();

  const steps = [
    {number: '1', text: t('howItWorks.step1')},
    {number: '2', text: t('howItWorks.step2')},
    {number: '3', text: t('howItWorks.step3')},
    {number: '4', text: t('howItWorks.step4')},
    {number: '5', text: t('howItWorks.step5')},
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('howItWorks.title')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.number}</Text>
            </View>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('howItWorks.infoTitle')}</Text>
          <Text style={styles.infoText}>
            • {t('howItWorks.info1')}{'\n'}
            • {t('howItWorks.info2')}{'\n'}
            • {t('howItWorks.info3')}{'\n'}
            • {t('howItWorks.info4')}{'\n'}
            • {t('howItWorks.info5')}
          </Text>
        </View>
      </ScrollView>
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
    
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  infoCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 22,
  },
});

export default HowItWorksScreen;
