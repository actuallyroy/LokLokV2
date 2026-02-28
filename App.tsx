import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Alert, AppState, AppStateStatus } from 'react-native';
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
import { applyReceivedDrawing, registerBackgroundNotificationHandler, getPairingId } from './src/services/backgroundTask';
import { useSettingsStore, usePairingStore } from './src/store';

// Initialize Firebase
initializeFirebase();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const appState = useRef(AppState.currentState);
  const { autoApplyDrawings } = useSettingsStore();
  const { pairingId, isPaired } = usePairingStore();

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

  // Check for pending drawings when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // App came to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App came to foreground, checking for pending drawings...');

        // If auto-apply is enabled and we're paired, check for new drawings
        // Use forceApply=true since we're coming from background
        if (autoApplyDrawings && isPaired && pairingId) {
          const success = await applyReceivedDrawing(pairingId, true);
          if (success) {
            Alert.alert('Drawing Applied!', 'A new drawing from your partner has been set as your lockscreen.');
          }
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [autoApplyDrawings, isPaired, pairingId]);

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
          const success = await applyReceivedDrawing(data.pairingId, true);
          if (success) {
            Alert.alert('New Drawing!', 'A drawing from your partner has been applied to your lockscreen.');
          }
        }
      }
    });

    // Handle notification taps
    const responseListener = addNotificationResponseListener(async (response) => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      if (data?.type === 'new_drawing' && data?.pairingId) {
        // Apply the drawing when user taps notification
        const success = await applyReceivedDrawing(data.pairingId, true);
        if (success) {
          Alert.alert('Applied!', 'Drawing has been set as your lockscreen.');
        }
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
