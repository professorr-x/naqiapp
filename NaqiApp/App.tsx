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
    // Initialize Meta SDK when app starts
    initializeMetaSDK();

    // Track initial app open
    trackAppOpen();

    // Hide splash screen after app is ready
    BootSplash.hide({fade: true});

    // Track app opens when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        trackAppOpen();
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
