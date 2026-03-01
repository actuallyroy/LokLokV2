import { requireNativeModule } from 'expo-modules-core';

let WallpaperNativeModule: any = null;

try {
  WallpaperNativeModule = requireNativeModule('Wallpaper');
} catch (error) {
  console.error('Failed to load Wallpaper native module:', error);
}

export interface ScreenDimensions {
  width: number;
  height: number;
  density: number;
}

// StrokeData matches the app's Stroke interface from DrawingCanvas
export interface StrokeData {
  id: string;
  path: string;  // SVG path string like "M 10 20 L 30 40"
  color: string;
  strokeWidth: number;
}

/**
 * Get the current wallpaper as a file URI
 * No special permissions required
 */
export async function getWallpaper(): Promise<string | null> {
  if (!WallpaperNativeModule) return null;
  try {
    return await WallpaperNativeModule.getWallpaper();
  } catch (error) {
    console.error('Error getting wallpaper:', error);
    return null;
  }
}

/**
 * Set an image as the lockscreen wallpaper
 * Requires SET_WALLPAPER permission
 */
export async function setLockscreenWallpaper(imagePath: string): Promise<boolean> {
  if (!WallpaperNativeModule) return false;
  try {
    return await WallpaperNativeModule.setLockscreenWallpaper(imagePath);
  } catch (error) {
    console.error('Error setting lockscreen wallpaper:', error);
    return false;
  }
}

/**
 * Get screen dimensions for proper aspect ratio matching
 */
export async function getScreenDimensions(): Promise<ScreenDimensions | null> {
  if (!WallpaperNativeModule) return null;
  try {
    return await WallpaperNativeModule.getScreenDimensions();
  } catch (error) {
    console.error('Error getting screen dimensions:', error);
    return null;
  }
}

/**
 * Composite strokes onto a background image and set as lockscreen
 * This is used for background drawing updates - renders strokes natively
 */
export async function compositeAndSetLockscreen(
  backgroundPath: string,
  strokes: StrokeData[],
  originalWidth: number,
  originalHeight: number
): Promise<boolean> {
  if (!WallpaperNativeModule) return false;
  try {
    return await WallpaperNativeModule.compositeAndSetLockscreen(
      backgroundPath,
      strokes,
      originalWidth,
      originalHeight
    );
  } catch (error) {
    console.error('Error compositing and setting lockscreen:', error);
    return false;
  }
}

/**
 * Start the foreground sync service to prevent app from being frozen
 * This is needed on Samsung devices with aggressive battery optimization
 */
export async function startSyncService(): Promise<boolean> {
  if (!WallpaperNativeModule) return false;
  try {
    return await WallpaperNativeModule.startSyncService();
  } catch (error) {
    console.error('Error starting sync service:', error);
    return false;
  }
}

/**
 * Stop the foreground sync service
 */
export async function stopSyncService(): Promise<boolean> {
  if (!WallpaperNativeModule) return false;
  try {
    return await WallpaperNativeModule.stopSyncService();
  } catch (error) {
    console.error('Error stopping sync service:', error);
    return false;
  }
}

/**
 * Check if battery optimization is disabled for this app
 * Returns true if the app can run unrestricted in the background
 */
export async function isBatteryOptimizationIgnored(): Promise<boolean> {
  if (!WallpaperNativeModule) return false;
  try {
    return await WallpaperNativeModule.isBatteryOptimizationIgnored();
  } catch (error) {
    console.error('Error checking battery optimization:', error);
    return false;
  }
}

/**
 * Request the user to disable battery optimization for this app
 * Opens the system dialog for battery optimization exemption
 */
export async function requestBatteryOptimizationBypass(): Promise<boolean> {
  if (!WallpaperNativeModule) return false;
  try {
    return await WallpaperNativeModule.requestBatteryOptimizationBypass();
  } catch (error) {
    console.error('Error requesting battery optimization bypass:', error);
    return false;
  }
}

export default {
  getWallpaper,
  setLockscreenWallpaper,
  getScreenDimensions,
  compositeAndSetLockscreen,
  startSyncService,
  stopSyncService,
  isBatteryOptimizationIgnored,
  requestBatteryOptimizationBypass,
};
