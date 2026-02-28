import { requireNativeModule } from 'expo-modules-core';

let WallpaperNativeModule: any = null;

try {
  WallpaperNativeModule = requireNativeModule('Wallpaper');
} catch (error) {
  console.error('Failed to load Wallpaper native module:', error);
}

export async function hasAllFilesAccess(): Promise<boolean> {
  if (!WallpaperNativeModule) return false;
  try {
    return await WallpaperNativeModule.hasAllFilesAccess();
  } catch (error) {
    console.error('Error checking all files access:', error);
    return false;
  }
}

export async function requestAllFilesAccess(): Promise<boolean> {
  if (!WallpaperNativeModule) return false;
  try {
    return await WallpaperNativeModule.requestAllFilesAccess();
  } catch (error) {
    console.error('Error requesting all files access:', error);
    return false;
  }
}

export async function getWallpaper(): Promise<string | null> {
  if (!WallpaperNativeModule) return null;
  try {
    return await WallpaperNativeModule.getWallpaper();
  } catch (error) {
    console.error('Error getting wallpaper:', error);
    return null;
  }
}

export default {
  hasAllFilesAccess,
  requestAllFilesAccess,
  getWallpaper,
};
