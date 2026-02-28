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

export default {
  getWallpaper,
  setLockscreenWallpaper,
  getScreenDimensions,
};
