import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register for push notifications and get FCM token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  // Must be a physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    // Always try to get Expo push token - required for Expo's push service
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    token = tokenData.data;

    console.log('Expo push token:', token);

    // Validate it's an Expo token
    if (!token.startsWith('ExponentPushToken[')) {
      console.warn('Got non-Expo token, push notifications may not work:', token);
    }
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    // Don't fall back to native token - it won't work with Expo's push service
  }

  // Android specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('drawing-updates', {
      name: 'Drawing Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f44725',
    });
  }

  return token;
}

/**
 * Send a push notification to partner's device
 * Note: In production, this should be done via your backend server
 * for security reasons (to protect FCM server key)
 */
export async function sendPushToPartner(
  partnerToken: string,
  senderName: string,
  pairingId: string
): Promise<boolean> {
  try {
    // Using Expo's push notification service
    const message = {
      to: partnerToken,
      sound: 'default',
      title: 'New Drawing!',
      body: `${senderName} sent you a drawing`,
      data: {
        type: 'new_drawing',
        pairingId,
      },
      priority: 'high',
      channelId: 'drawing-updates',
      // Enable background processing
      _contentAvailable: true,
      // Android specific
      android: {
        priority: 'high',
        channelId: 'drawing-updates',
      },
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Add listener for received notifications
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for notification responses (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the last notification response (for when app opens from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}
