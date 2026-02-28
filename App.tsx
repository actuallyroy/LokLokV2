import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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

// Initialize Firebase
initializeFirebase();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

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

  // Set up push notifications
  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        console.log('Push token:', token);
        // TODO: Store this token for pairing
      }
    });

    // Handle notifications received while app is open
    const notificationListener = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      // Handle the notification (e.g., show a toast, update UI)
    });

    // Handle notification taps
    const responseListener = addNotificationResponseListener((response) => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      if (data?.type === 'new_drawing') {
        // Navigate to canvas or show the drawing
        console.log('New drawing received from partner');
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
