import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import { getLatestDrawing, DrawingData } from './strokeSync';
import { getWallpaper, setLockscreenWallpaper, compositeAndSetLockscreen } from '../../modules/wallpaper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';
const APPLY_DRAWING_TASK = 'APPLY_DRAWING_TASK';

// Storage keys
const STORAGE_KEYS = {
  PAIRING_ID: 'loklok_pairing_id',
  DEVICE_ID: 'loklok_device_id',
  BACKGROUND_IMAGE_URI: 'loklok_background_image_uri',
  LAST_APPLIED_DRAWING_TIME: 'loklok_last_applied_drawing_time',
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
 * Uses native compositing to draw strokes on local background image
 * Tracks last applied drawing to avoid re-applying the same drawing
 */
export async function applyReceivedDrawing(pairingId: string, forceApply: boolean = false): Promise<boolean> {
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

    // Check if this drawing was already applied (unless forced)
    if (!forceApply) {
      const lastAppliedTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_APPLIED_DRAWING_TIME);
      // Handle Firestore timestamp - it might be an object with seconds/nanoseconds
      let drawingTime = 0;
      if (drawingData.timestamp) {
        if (typeof drawingData.timestamp.toMillis === 'function') {
          drawingTime = drawingData.timestamp.toMillis();
        } else if ((drawingData.timestamp as any).seconds) {
          drawingTime = (drawingData.timestamp as any).seconds * 1000;
        }
      }

      console.log('Timestamp check:', { lastAppliedTime, drawingTime, forceApply });

      if (lastAppliedTime && drawingTime > 0 && parseInt(lastAppliedTime) >= drawingTime) {
        console.log('Drawing already applied, skipping');
        return false;
      }
    }

    // Get my local background image
    const backgroundUri = await getBackgroundImageUri();
    if (!backgroundUri) {
      console.log('No background image saved locally');
      return false;
    }

    // Check if we have strokes to draw
    if (!drawingData.strokes || drawingData.strokes.length === 0) {
      console.log('No strokes in drawing data');
      return false;
    }

    console.log(`Compositing ${drawingData.strokes.length} strokes onto local background`);

    // Use native compositing to draw strokes on background and set lockscreen
    const success = await compositeAndSetLockscreen(
      backgroundUri,
      drawingData.strokes,
      drawingData.canvasWidth,
      drawingData.canvasHeight
    );

    if (success) {
      // Save the timestamp of this drawing so we don't re-apply it
      const drawingTime = drawingData.timestamp?.toMillis?.() || Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_APPLIED_DRAWING_TIME, drawingTime.toString());

      console.log('Drawing applied to lockscreen successfully via native compositing');
      return true;
    }

    console.log('Failed to apply drawing via native compositing');
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
