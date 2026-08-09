import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {
  SummaryScreenNavigationProp,
  SummaryScreenRouteProp,
} from '../navigation/types';
import {COLORS, AREAS} from '../constants';
import {Order} from '../types';
import {toArabicNumerals} from '../utils/numbers';
import {trackOrderSubmission} from '../utils/metaTracking';
import {useAuth} from '../contexts/AuthContext';
import api from '../services/api';

const SummaryScreen: React.FC = () => {
  const navigation = useNavigation<SummaryScreenNavigationProp>();
  const route = useRoute<SummaryScreenRouteProp>();
  const {t, i18n} = useTranslation();
  const {user} = useAuth();
  const insets = useSafeAreaInsets();

  const [customerArea, setCustomerArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {order} = route.params;

  // Use account display name automatically
  const customerName = user?.displayName || user?.email?.split('@')[0] || 'Customer';

  const orderTypeLabels = {
    oneTime: t('orderType.oneTime'),
    weekly: t('orderType.weekly'),
    monthly: t('orderType.monthly'),
  };

  const timeWindowLabels = {
    morning: t('delivery.morning'),
    afternoon: t('delivery.afternoon'),
  };

  const handleConfirmOrder = async () => {
    if (!customerArea.trim() || !landmark.trim()) {
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        i18n.language === 'ar'
          ? 'يرجى ملء جميع الحقول المطلوبة'
          : 'Please fill in all required fields'
      );
      return;
    }

    setIsSubmitting(true);

    // Combine address fields into customerArea
    const fullAddress = [
      customerArea.trim(),
      landmark.trim(),
    ].join(' - ');

    const completeOrder: Order = {
      ...order,
      customerName: customerName,
      customerArea: fullAddress,
      customerNotes: notes.trim() || undefined,
    } as Order;

    try {
      // Submit order to backend API
      const response = await api.post('/orders/', {
        order_type: completeOrder.orderType,
        bottle_quantity: completeOrder.bottleQuantity,
        delivery_date: completeOrder.deliveryDate.toISOString().split('T')[0],
        delivery_time_window: completeOrder.deliveryTimeWindow,
        customer_name: completeOrder.customerName,
        customer_area: completeOrder.customerArea,
        water_cost: completeOrder.waterCost,
        deposit_amount: completeOrder.depositAmount,
        total_price: completeOrder.totalPrice,
      });

      // Track order submission for Meta marketing campaign
      trackOrderSubmission(completeOrder);

      Alert.alert(
        i18n.language === 'ar' ? 'تم' : 'Success',
        i18n.language === 'ar'
          ? `تم إرسال طلبك بنجاح!\nرقم الطلب: ${response.data.id}`
          : `Order submitted successfully!\nOrder ID: ${response.data.id}`,
        [
          {
            text: i18n.language === 'ar' ? 'حسناً' : 'OK',
            onPress: () => navigation.navigate('MainTabs'),
          },
        ],
      );
    } catch (error: any) {
      console.error('Error submitting order:', error);
      const errorMessage = error.response?.data?.detail || (
        i18n.language === 'ar'
          ? 'تعذر إرسال الطلب. يرجى المحاولة مرة أخرى.'
          : 'Could not send order. Please try again.'
      );
      Alert.alert(
        i18n.language === 'ar' ? 'خطأ' : 'Error',
        errorMessage,
      );
    } finally {
      setIsSubmitting(false);
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
        <Text style={styles.title}>{t('summary.title')}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>{t('summary.customerName')}</Text>
          <View style={[styles.input, styles.readOnlyField]}>
            <Text style={styles.readOnlyText}>{customerName}</Text>
          </View>
          <Text style={styles.hintText}>
            {i18n.language === 'ar'
              ? 'يتم استخدام اسم حسابك تلقائياً'
              : 'Using your account name automatically'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('summary.area')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('summary.area')}
            value={customerArea}
            onChangeText={setCustomerArea}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('summary.landmark')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('summary.landmark')}
            value={landmark}
            onChangeText={setLandmark}
          />
          <Text style={styles.hintText}>{t('summary.landmarkHint')}</Text>
        </View>

        <View style={styles.locationInstructionBox}>
          <Text style={styles.locationInstructionText}>{t('summary.locationInstruction')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('summary.notes')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('summary.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.summaryCard}>
          {/* <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('summary.bookType')}:</Text>
            <Text style={styles.summaryValue}>
              {order.orderType && orderTypeLabels[order.orderType]}
            </Text>
          </View> */}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('summary.deliveryCount')}:</Text>
            <Text style={styles.summaryValue}>
              {i18n.language === 'ar' ? toArabicNumerals((order.bottleQuantity || 0) / 2) : (order.bottleQuantity || 0) / 2}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('delivery.selectDay')}:</Text>
            <Text style={styles.summaryValue}>
              {order.deliveryDate?.toLocaleDateString(i18n.language === 'ar' ? 'ar-IQ' : 'en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('delivery.selectTime')}:</Text>
            <Text style={styles.summaryValue}>
              {order.deliveryTimeWindow &&
                timeWindowLabels[order.deliveryTimeWindow]}
            </Text>
          </View>
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('summary.waterCost')}</Text>
            <Text style={styles.priceValue}>
              {order.waterCost?.toLocaleString()} {t('common.iqd')}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('summary.bottleDeposit')}</Text>
            <Text style={styles.priceValue}>
              {order.depositAmount?.toLocaleString()} {t('common.iqd')}
            </Text>
          </View>

          <Text style={styles.depositNote}>{t('summary.depositNote')}</Text>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>{t('summary.total')}</Text>
            <Text style={styles.totalValue}>
              {order.totalPrice?.toLocaleString()} {t('common.iqd')}
            </Text>
          </View>

          <Text style={styles.paymentNote}>{t('summary.paymentMethod')}</Text>
        </View>

        <View style={styles.voucherNote}>
          <Text style={styles.voucherNoteText}>{t('summary.voucherInstruction')}</Text>
        </View>

        <View style={styles.whatsappNote}>
          <Text style={styles.whatsappNoteText}>{t('summary.whatsappConfirmation')}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 20)}]}>
        <TouchableOpacity
          style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
          onPress={handleConfirmOrder}
          disabled={isSubmitting}>
          <Text style={styles.confirmButtonText}>
            {isSubmitting ? (i18n.language === 'ar' ? 'جاري المعالجة...' : 'Processing...') : t('summary.confirm')}
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  readOnlyField: {
    backgroundColor: COLORS.lightGray,
    borderColor: '#E0E0E0',
  },
  readOnlyText: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 6,
    fontStyle: 'italic',
  },
  locationInstructionBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  locationInstructionText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  locationHint: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  priceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  depositNote: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentNote: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 10,
    fontStyle: 'italic',
  },
  voucherNote: {
    backgroundColor: '#FFF8E1',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  voucherNoteText: {
    fontSize: 13,
    color: '#F57C00',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  whatsappNote: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  whatsappNoteText: {
    fontSize: 13,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SummaryScreen;
