import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {DeliveryScreenNavigationProp, RootStackParamList} from '../navigation/types';
import {COLORS, DEFAULT_PRICING} from '../constants';
import {DeliveryTimeWindow, OrderType} from '../types';

type DeliveryScreenRouteProp = RouteProp<RootStackParamList, 'Delivery'>;

const DeliveryScreen: React.FC = () => {
  const navigation = useNavigation<DeliveryScreenNavigationProp>();
  const route = useRoute<DeliveryScreenRouteProp>();
  const {t, i18n} = useTranslation();
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeWindow, setSelectedTimeWindow] =
    useState<DeliveryTimeWindow | null>(null);

  // Generate next 7 days for delivery
  const getNextSevenDays = () => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const timeWindows: {value: DeliveryTimeWindow; label: string; time: string}[] = [
    {
      value: 'morning',
      label: t('delivery.morning'),
      time: t('delivery.morningTime'),
    },
    {
      value: 'afternoon',
      label: t('delivery.afternoon'),
      time: t('delivery.afternoonTime'),
    },
  ];

  const handleNext = () => {
    if (selectedDate && selectedTimeWindow) {
      const orderType = route.params.orderType as OrderType;
      const quantity = route.params.quantity;

      // Calculate pricing
      let pricePerBottle = DEFAULT_PRICING.oneTimePrice;
      if (orderType === 'weekly') {
        pricePerBottle = DEFAULT_PRICING.weeklyVoucherPrice;
      } else if (orderType === 'monthly') {
        pricePerBottle = DEFAULT_PRICING.monthlyVoucherPrice;
      }

      const waterCost = pricePerBottle * quantity;
      // Deposit is only for bottles on first visit (2 bottles), not entire book
      const bottlesPerVisit = 2;
      const depositAmount = DEFAULT_PRICING.bottleDeposit * bottlesPerVisit;

      navigation.navigate('Summary', {
        order: {
          orderType,
          bottleQuantity: quantity,
          deliveryDate: selectedDate,
          deliveryTimeWindow: selectedTimeWindow,
          waterCost,
          depositAmount,
          totalPrice: waterCost + depositAmount,
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('delivery.title')}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>{t('delivery.selectDay')}</Text>
        {getNextSevenDays().map(date => {
          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[
                styles.dateCard,
                selectedDate?.toDateString() === date.toDateString() &&
                  styles.dateCardSelected,
              ]}
              onPress={() => handleDateSelect(date)}>
              <View style={styles.dateCardContent}>
                <Text style={styles.dateText}>
                  {date.toLocaleDateString(i18n.language === 'ar' ? 'ar-IQ' : 'en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.sectionTitle, styles.sectionMargin]}>
          {t('delivery.selectTime')}
        </Text>
        {timeWindows.map(window => (
          <TouchableOpacity
            key={window.value}
            style={[
              styles.timeCard,
              selectedTimeWindow === window.value && styles.timeCardSelected,
            ]}
            onPress={() => setSelectedTimeWindow(window.value)}>
            <Text style={styles.timeLabel}>{window.label}</Text>
            <Text style={styles.timeSubtext}>{window.time}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 20)}]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!selectedDate || !selectedTimeWindow) && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedDate || !selectedTimeWindow}>
          <Text style={styles.nextButtonText}>{t('common.next')}</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 15,
  },
  sectionMargin: {
    marginTop: 25,
  },
  dateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  dateCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  dateCardDisabled: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.6,
  },
  dateCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: COLORS.black,
    flex: 1,
  },
  dateTextDisabled: {
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  fullBadge: {
    backgroundColor: COLORS.error,
    color: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold',
  },
  remainingText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  timeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  timeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 5,
  },
  timeSubtext: {
    fontSize: 14,
    color: COLORS.gray,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DeliveryScreen;
