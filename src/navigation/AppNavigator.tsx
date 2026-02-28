import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  WelcomeScreen,
  PairDeviceScreen,
  SettingsScreen,
  SharedCanvasScreen,
  QRScannerScreen,
} from '../screens';
import { colors } from '../theme';
import { useSettingsStore } from '../store';

export type RootStackParamList = {
  Welcome: undefined;
  PairDevice: undefined;
  Settings: undefined;
  SharedCanvas: undefined;
  QRScanner: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);

  useEffect(() => {
    // Small delay to ensure store has hydrated from AsyncStorage
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={hasCompletedOnboarding ? 'SharedCanvas' : 'Welcome'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.backgroundDark },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="PairDevice" component={PairDeviceScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SharedCanvas" component={SharedCanvasScreen} />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
  },
});
