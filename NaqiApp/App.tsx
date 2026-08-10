/**
 * NAQI Water Delivery App
 *
 * @format
 */

import React, {useEffect} from 'react';
import {StatusBar, AppState, AppStateStatus} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import AppNavigator from './src/navigation/AppNavigator';
import {AuthProvider} from './src/contexts/AuthContext';
import {ChatProvider} from './src/contexts/ChatContext';
import './src/i18n';
import {initializeMetaSDK, trackAppOpen} from './src/utils/metaTracking';

function App() {
  useEffect(() => {
    // Initialize Meta SDK when app starts (with error handling)
    try {
      initializeMetaSDK();
      trackAppOpen();
    } catch (error) {
      console.log('Meta SDK initialization failed:', error);
    }

    // Hide splash screen after a short delay to ensure app is ready
    setTimeout(() => {
      BootSplash.hide({fade: true});
    }, 1000);

    // Track app opens when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        try {
          trackAppOpen();
        } catch (error) {
          console.log('Track app open failed:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ChatProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <AppNavigator />
        </ChatProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
