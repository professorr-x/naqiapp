import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/native';
import {Order} from '../types';
import {FirebaseAuthTypes} from '@react-native-firebase/auth';

// Bottom Tab Navigator Params
export type BottomTabParamList = {
  Home: undefined;
  Chat: undefined;
  OrderHistory: undefined;
  Profile: undefined;
};

// Root Stack Navigator Params
export type RootStackParamList = {
  Login: undefined;
  LoginOTP: {
    phoneNumber: string;
    sessionId: string;
    phoneNumberMasked: string;
  };
  ForgotPassword: undefined;
  ForgotPasswordOTP: {
    sessionId: string;
    phoneNumberMasked: string;
    email: string;
    phoneNumber: string;
  };
  ResetPassword: {
    resetToken: string;
  };
  Phone2FA: {
    isNewUser: boolean;
  };
  OTPVerification: {
    confirmation?: FirebaseAuthTypes.ConfirmationResult | null;  // Legacy, kept for backwards compatibility
    phoneNumber: string;
    sessionId?: string;
    password?: string;
    verificationType?: 'signup' | 'phone2fa' | 'phone_linking';
  };
  OTPTest: undefined;
  MainTabs: undefined;
  OrderType: undefined;
  Quantity: {orderType: string};
  Delivery: {orderType: string; quantity: number; isReorder?: boolean};
  Summary: {order: Partial<Order>; isReorder?: boolean};
  HowItWorks: undefined;
  OrderDetails: {orderId: string};
  MetaSDKTest: undefined;
};

// Bottom Tab Navigation Props
export type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type ChatScreenNavigationProp = BottomTabNavigationProp<
  BottomTabParamList,
  'Chat'
>;

export type OrderHistoryScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'OrderHistory'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type ProfileScreenNavigationProp = BottomTabNavigationProp<
  BottomTabParamList,
  'Profile'
>;

// Stack Navigation Props
export type OrderTypeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'OrderType'
>;

export type QuantityScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Quantity'
>;

export type DeliveryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Delivery'
>;

export type SummaryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Summary'
>;

export type SummaryScreenRouteProp = RouteProp<RootStackParamList, 'Summary'>;
