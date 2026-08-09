import React from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import {RootStackParamList, BottomTabParamList} from './types';
import {useAuth} from '../contexts/AuthContext';
import {COLORS} from '../constants';

// Import auth screens
import LoginScreen from '../screens/LoginScreen';
import LoginOTPScreen from '../screens/LoginOTPScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ForgotPasswordOTPScreen from '../screens/ForgotPasswordOTPScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import Phone2FAScreen from '../screens/Phone2FAScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';

// Import app screens
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrderTypeScreen from '../screens/OrderTypeScreen';
import QuantityScreen from '../screens/QuantityScreen';
import DeliveryScreen from '../screens/DeliveryScreen';
import SummaryScreen from '../screens/SummaryScreen';
import HowItWorksScreen from '../screens/HowItWorksScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * Main Tabs Navigator
 * Bottom tab navigation for the main app screens
 */
const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Chat':
              iconName = focused
                ? 'chatbubble-ellipses'
                : 'chatbubble-ellipses-outline';
              break;
            case 'OrderHistory':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{tabBarLabel: 'Chat'}}
      />
      <Tab.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{tabBarLabel: 'Orders'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: 'Profile'}}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const {user, loading, needsPhoneVerification} = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        {!user ? (
          // Not authenticated - show login and password reset screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="LoginOTP" component={LoginOTPScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen
              name="ForgotPasswordOTP"
              component={ForgotPasswordOTPScreen}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
            <Stack.Screen
              name="OTPVerification"
              component={OTPVerificationScreen}
            />
          </>
        ) : needsPhoneVerification ? (
          // Authenticated but needs phone 2FA
          <>
            <Stack.Screen name="Phone2FA" component={Phone2FAScreen} />
            <Stack.Screen
              name="OTPVerification"
              component={OTPVerificationScreen}
            />
          </>
        ) : (
          // Fully authenticated - show app
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="OrderType" component={OrderTypeScreen} />
            <Stack.Screen name="Quantity" component={QuantityScreen} />
            <Stack.Screen name="Delivery" component={DeliveryScreen} />
            <Stack.Screen name="Summary" component={SummaryScreen} />
            <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
});


export default AppNavigator;
