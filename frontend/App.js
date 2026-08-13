import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import IncomingRequestOverlay from './src/components/IncomingRequestOverlay';
import { LocationProvider } from './src/context/LocationContext';
import { VerificationProvider } from './src/context/VerificationContext';
import { IncomingRequestProvider } from './src/context/IncomingRequestContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <LocationProvider>
        <VerificationProvider>
          <IncomingRequestProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <AppNavigator />
              <IncomingRequestOverlay />
            </NavigationContainer>
          </IncomingRequestProvider>
        </VerificationProvider>
      </LocationProvider>
    </SafeAreaProvider>
  );
}
