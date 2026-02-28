import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import { getLatestDrawing, DrawingData } from './strokeSync';
import { getWallpaper, setLockscreenWallpaper } from '../../modules/wallpaper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';
const APPLY_DRAWING_TASK = 'APPLY_DRAWING_TASK';

// Storage keys
const STORAGE_KEYS = {
  PAIRING_ID: 'loklok_pairing_id',
  DEVICE_ID: 'loklok_device_id',
  BACKGROUND_IMAGE_URI: 'loklok_background_image_uri',
};

/**
 * Define the background notification task
 * This runs when a notification is received while app is in background
 */
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }

  console.log('Background notification received:', data);

  const notificationData = data as {
    notification: Notifications.Notification;
  };

  const payload = notificationData?.notification?.request?.content?.data;

  if (payload?.type === 'new_drawing' && payload?.pairingId) {
    // Apply the drawing
    await applyReceivedDrawing(payload.pairingId);
  }
});

/**
 * Register background notification handler
 */
export async function registerBackgroundNotificationHandler(): Promise<void> {
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('Background notification handler registered');
  } catch (error) {
    console.error('Error registering background handler:', error);
  }
}

/**
 * Apply received drawing to lockscreen
 * Uses the pre-rendered image if available, otherwise falls back to compositing
 */
export async function applyReceivedDrawing(pairingId: string): Promise<boolean> {
  try {
    console.log('Applying received drawing for pairing:', pairingId);

    // Get the drawing data from Firestore
    const drawingData = await getLatestDrawing(pairingId);
    if (!drawingData) {
      console.log('No drawing data found');
      return false;
    }

    // Get my device ID to check if this is my own drawing
    const myDeviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (drawingData.senderId === myDeviceId) {
      console.log('Ignoring own drawing');
      return false;
    }

    // If we have a pre-rendered image, use it directly
    if (drawingData.imageBase64) {
      console.log('Using pre-rendered image from partner');
      try {
        // Save base64 to a temp file
        const tempPath = `${FileSystem.cacheDirectory}partner_drawing_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(tempPath, drawingData.imageBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Set as lockscreen
        const success = await setLockscreenWallpaper(tempPath);
        if (success) {
          console.log('Drawing applied to lockscreen successfully');
          return true;
        }
      } catch (imageError) {
        console.error('Error applying image:', imageError);
      }
    }

    console.log('No pre-rendered image available');
    return false;
  } catch (error) {
    console.error('Error applying received drawing:', error);
    return false;
  }
}

/**
 * Save background image URI for later compositing
 */
export async function saveBackgroundImageUri(uri: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.BACKGROUND_IMAGE_URI, uri);
}

/**
 * Get saved background image URI
 */
export async function getBackgroundImageUri(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEYS.BACKGROUND_IMAGE_URI);
}

/**
 * Save pairing ID for background task
 */
export async function savePairingId(pairingId: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PAIRING_ID, pairingId);
}

/**
 * Get saved pairing ID
 */
export async function getPairingId(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEYS.PAIRING_ID);
}

/**
 * Save device ID
 */
export async function saveDeviceId(deviceId: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
}

/**
 * Get device ID
 */
export async function getDeviceId(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
}
