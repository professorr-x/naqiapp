import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {QuantityScreenNavigationProp, RootStackParamList} from '../navigation/types';
import {COLORS, BOTTLE_QUANTITIES} from '../constants';

type QuantityScreenRouteProp = RouteProp<RootStackParamList, 'Quantity'>;

const QuantityScreen: React.FC = () => {
  const navigation = useNavigation<QuantityScreenNavigationProp>();
  const route = useRoute<QuantityScreenRouteProp>();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(null);

  const handleNext = () => {
    if (selectedQuantity) {
      navigation.navigate('Delivery', {
        orderType: route.params.orderType,
        quantity: selectedQuantity,
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
        <Text style={styles.title}>{t('quantity.title')}</Text>
      </View>

      <View style={styles.content}>
        {BOTTLE_QUANTITIES.map(quantity => {
          const deliveryCount = quantity / 2; // 2 bottles per delivery
          return (
            <TouchableOpacity
              key={quantity}
              style={[
                styles.quantityCard,
                selectedQuantity === quantity && styles.quantityCardSelected,
              ]}
              onPress={() => setSelectedQuantity(quantity)}>
              <View style={styles.quantityContent}>
                <Text style={styles.quantityNumber}>{deliveryCount}</Text>
                <Text style={styles.quantityLabel}>{t('quantity.deliveries')}</Text>
              </View>
              <Text style={styles.bottlesPerDelivery}>{t('quantity.bottlesPerDelivery')}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.depositInfo}>
          <Text style={styles.depositTitle}>{t('quantity.deposit')}</Text>
          <Text style={styles.depositDesc}>{t('quantity.depositDesc')}</Text>
        </View>
      </View>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 20)}]}>
        <TouchableOpacity
          style={[styles.nextButton, !selectedQuantity && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selectedQuantity}>
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
  quantityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 30,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  quantityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quantityNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 10,
  },
  quantityLabel: {
    fontSize: 18,
    color: COLORS.gray,
  },
  bottlesPerDelivery: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  depositInfo: {
    backgroundColor: COLORS.lightGray,
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  depositTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  depositDesc: {
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

export default QuantityScreen;
