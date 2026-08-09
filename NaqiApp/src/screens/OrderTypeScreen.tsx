import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {OrderTypeScreenNavigationProp} from '../navigation/types';
import {COLORS, DEFAULT_PRICING} from '../constants';
import {OrderType} from '../types';
import {toArabicNumerals} from '../utils/numbers';

const OrderTypeScreen: React.FC = () => {
  const navigation = useNavigation<OrderTypeScreenNavigationProp>();
  const {t, i18n} = useTranslation();

  const handleSelectOrderType = (orderType: OrderType, quantity: number) => {
    navigation.navigate('Delivery', {orderType, quantity});
  };

  const orderTypes = [
    {
      type: 'oneTime' as OrderType,
      title: t('orderType.oneTime'),
      description: t('orderType.oneTimeDesc'),
      price: DEFAULT_PRICING.oneTimePrice,
      deliveries: 4,
      quantity: 8, // 4 deliveries x 2 bottles
    },
    {
      type: 'weekly' as OrderType,
      title: t('orderType.weekly'),
      description: t('orderType.weeklyDesc'),
      price: DEFAULT_PRICING.weeklyVoucherPrice,
      deliveries: 8,
      quantity: 16, // 8 deliveries x 2 bottles
    },
    {
      type: 'monthly' as OrderType,
      title: t('orderType.monthly'),
      description: t('orderType.monthlyDesc'),
      price: DEFAULT_PRICING.monthlyVoucherPrice,
      deliveries: 12,
      quantity: 24, // 12 deliveries x 2 bottles
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('orderType.title')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {orderTypes.map(item => (
          <TouchableOpacity
            key={item.type}
            style={styles.card}
            onPress={() => handleSelectOrderType(item.type, item.quantity)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardPrice}>
                {item.price.toLocaleString()} {t('common.iqd')}
              </Text>
            </View>
            <Text style={styles.cardSubtext}>{t('orderType.pricePerBottle')}</Text>

            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>
                {t('orderType.deliveriesLabel')} {i18n.language === 'ar' ? toArabicNumerals(item.deliveries) : item.deliveries}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.descriptionBox}>
          <Text style={styles.cardDescription}>{t('orderType.oneTimeDesc')}</Text>
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'normal',
    color: COLORS.black,
    flex: 1,
    marginRight: 10,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  descriptionBox: {
    backgroundColor: COLORS.lightGray,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    marginTop: 5,
  },
  asteriskLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.black,
    lineHeight: 20,
  },
  cardSubtext: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  deliveryInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  deliverySubtext: {
    fontSize: 12,
    color: COLORS.gray,
  },
});

export default OrderTypeScreen;
