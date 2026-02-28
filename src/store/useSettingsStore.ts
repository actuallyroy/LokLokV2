import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

export type BrushStyle = 'neon' | 'solid' | 'pencil';

interface SettingsState {
  // Lockscreen settings
  autoApplyDrawings: boolean;
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
  setAutoApplyDrawings: (value: boolean) => void;
  setNotificationAlerts: (value: boolean) => void;
  setDefaultBrushStyle: (style: BrushStyle) => void;
  setDefaultInkColor: (color: string) => void;
  setUserName: (name: string) => void;
  setUserProfile: (name: string, email: string, avatar?: string) => void;
  setOnboardingComplete: () => void;
  resetOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      autoApplyDrawings: true,
      notificationAlerts: true,
      defaultBrushStyle: 'neon',
      defaultInkColor: colors.primary,
      userName: 'Sarah Jenkins',
      userEmail: 'sarah.j@example.com',
      userAvatar: null,
      hasCompletedOnboarding: false,

      // Actions
      setAutoApplyDrawings: (value) => set({ autoApplyDrawings: value }),

      setNotificationAlerts: (value) => set({ notificationAlerts: value }),

      setDefaultBrushStyle: (style) => set({ defaultBrushStyle: style }),

      setDefaultInkColor: (color) => set({ defaultInkColor: color }),

      setUserName: (name) => set({ userName: name }),

      setUserProfile: (name, email, avatar) =>
        set({ userName: name, userEmail: email, userAvatar: avatar || null }),

      setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),

      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: 'loklok-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
