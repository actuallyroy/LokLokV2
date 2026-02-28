import { create } from 'zustand';
import { colors } from '../theme';

export type BrushStyle = 'neon' | 'solid' | 'pencil';

interface SettingsState {
  // General settings
  lockScreenOverlay: boolean;
  notificationAlerts: boolean;

  // Drawing tools defaults
  defaultBrushStyle: BrushStyle;
  defaultInkColor: string;

  // User profile
  userName: string;
  userEmail: string;
  userAvatar: string | null;

  // Onboarding
  hasCompletedOnboarding: boolean;

  // Actions
  setLockScreenOverlay: (value: boolean) => void;
  setNotificationAlerts: (value: boolean) => void;
  setDefaultBrushStyle: (style: BrushStyle) => void;
  setDefaultInkColor: (color: string) => void;
  setUserProfile: (name: string, email: string, avatar?: string) => void;
  setOnboardingComplete: () => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  // Initial state
  lockScreenOverlay: true,
  notificationAlerts: false,
  defaultBrushStyle: 'neon',
  defaultInkColor: colors.primary,
  userName: 'Sarah Jenkins',
  userEmail: 'sarah.j@example.com',
  userAvatar: null,
  hasCompletedOnboarding: false,

  // Actions
  setLockScreenOverlay: (value) => set({ lockScreenOverlay: value }),

  setNotificationAlerts: (value) => set({ notificationAlerts: value }),

  setDefaultBrushStyle: (style) => set({ defaultBrushStyle: style }),

  setDefaultInkColor: (color) => set({ defaultInkColor: color }),

  setUserProfile: (name, email, avatar) =>
    set({ userName: name, userEmail: email, userAvatar: avatar || null }),

  setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),
}));
