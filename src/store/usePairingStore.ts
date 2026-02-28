import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PairingState {
  // Connection state
  isPaired: boolean;
  pairingId: string | null; // Shared ID between both devices
  partnerName: string | null;
  partnerId: string | null;
  partnerFcmToken: string | null;
  isPartnerDrawing: boolean;

  // Actions
  setPaired: (
    pairingId: string,
    partnerName: string,
    partnerId: string,
    partnerFcmToken?: string
  ) => void;
  setPartnerDrawing: (isDrawing: boolean) => void;
  setPartnerFcmToken: (token: string) => void;
  disconnect: () => void;
}

export const usePairingStore = create<PairingState>()(
  persist(
    (set) => ({
      // Initial state
      isPaired: false,
      pairingId: null,
      partnerName: null,
      partnerId: null,
      partnerFcmToken: null,
      isPartnerDrawing: false,

      // Actions
      setPaired: (pairingId, partnerName, partnerId, partnerFcmToken) =>
        set({
          isPaired: true,
          pairingId,
          partnerName,
          partnerId,
          partnerFcmToken: partnerFcmToken || null,
        }),

      setPartnerDrawing: (isDrawing) => set({ isPartnerDrawing: isDrawing }),

      setPartnerFcmToken: (token) => set({ partnerFcmToken: token }),

      disconnect: () =>
        set({
          isPaired: false,
          pairingId: null,
          partnerName: null,
          partnerId: null,
          partnerFcmToken: null,
          isPartnerDrawing: false,
        }),
    }),
    {
      name: 'loklok-pairing',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
