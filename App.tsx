import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, AppState, AppStateStatus, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { AppNavigator } from './src/navigation';
import { colors } from './src/theme';
import { initializeFirebase } from './src/services/firebase';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './src/services/notifications';
import { applyReceivedDrawing, registerBackgroundNotificationHandler, getPairingId, getDeviceId, saveDeviceId } from './src/services/backgroundTask';
import { listenForPairingStatus } from './src/services/strokeSync';
import { useSettingsStore, usePairingStore } from './src/store';
import { isBatteryOptimizationIgnored, requestBatteryOptimizationBypass } from './modules/wallpaper';

// Initialize Firebase
initializeFirebase();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const appState = useRef(AppState.currentState);
  const { autoApplyDrawings } = useSettingsStore();
  const { pairingId, isPaired, myDeviceId, setMyDeviceId, disconnect } = usePairingStore();

  useEffect(() => {
    async function loadFonts() {
      try {
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Error loading fonts:', error);
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  // Initialize device ID
  useEffect(() => {
    const initDeviceId = async () => {
      let deviceId = await getDeviceId();
      if (!deviceId) {
        deviceId = `device_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
        await saveDeviceId(deviceId);
      }
      if (!myDeviceId || myDeviceId !== deviceId) {
        setMyDeviceId(deviceId);
      }
    };
    initDeviceId();
  }, [myDeviceId, setMyDeviceId]);

  // Listen for partner disconnection
  useEffect(() => {
    if (!isPaired || !pairingId || !myDeviceId) return;

    console.log('Setting up pairing status listener...');
    const unsubscribe = listenForPairingStatus(
      pairingId,
      myDeviceId,
      () => {
        console.log('Partner disconnected - clearing local pairing state');
        disconnect();
      }
    );

    return () => {
      console.log('Cleaning up pairing status listener');
      unsubscribe();
    };
  }, [isPaired, pairingId, myDeviceId, disconnect]);

  // Check for pending drawings when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // App came to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App came to foreground, checking for pending drawings...');

        // If auto-apply is enabled and we're paired, check for new drawings
        // Use forceApply=true since we're coming from background
        if (autoApplyDrawings && isPaired && pairingId) {
          await applyReceivedDrawing(pairingId, true);
          // Silent apply - no popup
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [autoApplyDrawings, isPaired, pairingId]);

  // Check battery optimization when paired (Android only)
  useEffect(() => {
    if (!isPaired || Platform.OS !== 'android') return;

    const checkBatteryOptimization = async () => {
      const isIgnored = await isBatteryOptimizationIgnored();
      if (!isIgnored) {
        Alert.alert(
          'Enable Background Updates',
          'To receive lockscreen drawings while the app is closed, please disable battery optimization for LokLok.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => requestBatteryOptimizationBypass(),
            },
          ]
        );
      }
    };

    // Small delay to not interrupt initial app experience
    const timer = setTimeout(checkBatteryOptimization, 2000);
    return () => clearTimeout(timer);
  }, [isPaired]);

  // Set up push notifications
  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        console.log('Push token:', token);
      }
    });

    // Register background notification handler for when device is locked
    registerBackgroundNotificationHandler();

    // Handle notifications received while app is open
    const notificationListener = addNotificationReceivedListener(async (notification) => {
      console.log('Notification received:', notification);
      const data = notification.request.content.data;

      if (data?.type === 'new_drawing' && data?.pairingId) {
        // Auto-apply if setting is enabled
        const autoApply = useSettingsStore.getState().autoApplyDrawings;
        if (autoApply) {
          await applyReceivedDrawing(data.pairingId, true);
          // Silent apply - no popup
        }
      }
    });

    // Handle notification taps
    const responseListener = addNotificationResponseListener(async (response) => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      if (data?.type === 'new_drawing' && data?.pairingId) {
        // Apply the drawing when user taps notification
        await applyReceivedDrawing(data.pairingId, true);
        // Silent apply - no popup
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
