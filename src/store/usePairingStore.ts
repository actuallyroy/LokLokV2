import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PairingState {
  // Connection state
  isPaired: boolean;
  pairingId: string | null; // Shared ID between both devices
  myDeviceId: string | null; // This device's ID
  partnerName: string | null;
  partnerId: string | null;
  partnerFcmToken: string | null;
  isPartnerDrawing: boolean;

  // E2E Encryption state
  isE2EEnabled: boolean;
  partnerPublicKey: string | null;

  // Actions
  setPaired: (
    pairingId: string,
    partnerName: string,
    partnerId: string,
    partnerFcmToken?: string,
    myDeviceId?: string
  ) => void;
  setMyDeviceId: (deviceId: string) => void;
  setPartnerDrawing: (isDrawing: boolean) => void;
  setPartnerFcmToken: (token: string) => void;
  setE2EEnabled: (enabled: boolean, partnerPublicKey?: string) => void;
  disconnect: () => void;
}

export const usePairingStore = create<PairingState>()(
  persist(
    (set) => ({
      // Initial state
      isPaired: false,
      pairingId: null,
      myDeviceId: null,
      partnerName: null,
      partnerId: null,
      partnerFcmToken: null,
      isPartnerDrawing: false,
      isE2EEnabled: false,
      partnerPublicKey: null,

      // Actions
      setPaired: (pairingId, partnerName, partnerId, partnerFcmToken, myDeviceId) =>
        set((state) => ({
          isPaired: true,
          pairingId,
          partnerName,
          partnerId,
          partnerFcmToken: partnerFcmToken || null,
          myDeviceId: myDeviceId || state.myDeviceId,
        })),

      setMyDeviceId: (deviceId) => set({ myDeviceId: deviceId }),

      setPartnerDrawing: (isDrawing) => set({ isPartnerDrawing: isDrawing }),

      setPartnerFcmToken: (token) => set({ partnerFcmToken: token }),

      setE2EEnabled: (enabled, partnerPublicKey) =>
        set({
          isE2EEnabled: enabled,
          partnerPublicKey: partnerPublicKey || null,
        }),

      disconnect: () =>
        set((state) => ({
          isPaired: false,
          pairingId: null,
          partnerName: null,
          partnerId: null,
          partnerFcmToken: null,
          isPartnerDrawing: false,
          isE2EEnabled: false,
          partnerPublicKey: null,
          // Keep myDeviceId - it shouldn't change on disconnect
          myDeviceId: state.myDeviceId,
        })),
    }),
    {
      name: 'loklok-pairing',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
