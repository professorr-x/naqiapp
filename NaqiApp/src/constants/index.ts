import { PricingConfig } from '../types';
import Config from 'react-native-config';

// Pricing configuration (can be fetched from backend)
// Note: Prices are per bottle. Each voucher = two 20L bottles delivery.
export const DEFAULT_PRICING: PricingConfig = {
  oneTimePrice: 2000, // IQD per bottle (4 vouchers)
  weeklyVoucherPrice: 1750, // IQD per bottle (8 vouchers)
  monthlyVoucherPrice: 1500, // IQD per bottle (12 vouchers)
  bottleDeposit: 5000, // IQD per bottle
};

// Voucher quantity options (each voucher = two 20L bottles)
// Weekly Book: 4 vouchers
// Monthly Book: 8 vouchers
// Extended Book: 12 vouchers
export const BOTTLE_QUANTITIES = [8, 16, 24];

// Company contact
export const WHATSAPP_NUMBER = '+964 776 111 2202';

// Meta (Facebook) SDK Configuration
// Values are loaded from .env file via react-native-config
export const META_APP_ID = Config.META_APP_ID || '';
export const META_CLIENT_TOKEN = Config.META_CLIENT_TOKEN || '';

// Colors
export const COLORS = {
  primary: '#1E88E5',
  secondary: '#42A5F5',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#9E9E9E',
  lightGray: '#F5F5F5',
  error: '#F44336',
  success: '#4CAF50',
};

// Area options (Phase 1: الرصافة)
export const AREAS = [
  'الكرادة',
  'الجادرية',
  'زيونة',
  'البتاويين',
  'الميدان',
  'الشواكة',
  'الكريعات',
  'الأعظمية',
  'الكاظمية',
];
