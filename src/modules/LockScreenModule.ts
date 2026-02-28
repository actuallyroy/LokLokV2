import { NativeModules, Platform } from 'react-native';

const { LockScreenModule: NativeLockScreenModule } = NativeModules;

interface LockScreenModuleInterface {
  startService(): Promise<boolean>;
  stopService(): Promise<boolean>;
  isServiceRunning(): Promise<boolean>;
  setLockScreenEnabled(enabled: boolean): Promise<boolean>;
  checkOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<boolean>;
  saveDrawing(base64Image: string): Promise<boolean>;
  setPartnerDrawing(base64Image: string): Promise<boolean>;
  showLockScreen(): Promise<boolean>;
}

class LockScreenModuleWrapper implements LockScreenModuleInterface {
  private isAndroid = Platform.OS === 'android';

  async startService(): Promise<boolean> {
    if (!this.isAndroid) {
      console.warn('LockScreenModule is only available on Android');
      return false;
    }
    return NativeLockScreenModule.startService();
  }

  async stopService(): Promise<boolean> {
    if (!this.isAndroid) return false;
    return NativeLockScreenModule.stopService();
  }

  async isServiceRunning(): Promise<boolean> {
    if (!this.isAndroid) return false;
    return NativeLockScreenModule.isServiceRunning();
  }

  async setLockScreenEnabled(enabled: boolean): Promise<boolean> {
    if (!this.isAndroid) return false;
    return NativeLockScreenModule.setLockScreenEnabled(enabled);
  }

  async checkOverlayPermission(): Promise<boolean> {
    if (!this.isAndroid) return false;
    return NativeLockScreenModule.checkOverlayPermission();
  }

  async requestOverlayPermission(): Promise<boolean> {
    if (!this.isAndroid) return false;
    return NativeLockScreenModule.requestOverlayPermission();
  }

  async saveDrawing(base64Image: string): Promise<boolean> {
    if (!this.isAndroid) return false;
    return NativeLockScreenModule.saveDrawing(base64Image);
  }

  async setPartnerDrawing(base64Image: string): Promise<boolean> {
    if (!this.isAndroid) return false;
    return NativeLockScreenModule.setPartnerDrawing(base64Image);
  }

  async showLockScreen(): Promise<boolean> {
    if (!this.isAndroid) return false;
    return NativeLockScreenModule.showLockScreen();
  }
}

export const LockScreen = new LockScreenModuleWrapper();
