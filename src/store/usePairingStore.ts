import { create } from 'zustand';

interface PairingState {
  // Connection state
  isPaired: boolean;
  partnerName: string | null;
  partnerId: string | null;
  isPartnerDrawing: boolean;

  // Actions
  setPaired: (isPaired: boolean, partnerName?: string, partnerId?: string) => void;
  setPartnerDrawing: (isDrawing: boolean) => void;
  disconnect: () => void;
}

export const usePairingStore = create<PairingState>()((set) => ({
  // Initial state
  isPaired: false,
  partnerName: null,
  partnerId: null,
  isPartnerDrawing: false,

  // Actions
  setPaired: (isPaired, partnerName, partnerId) =>
    set({
      isPaired,
      partnerName: partnerName || null,
      partnerId: partnerId || null,
    }),

  setPartnerDrawing: (isDrawing) => set({ isPartnerDrawing: isDrawing }),

  disconnect: () =>
    set({
      isPaired: false,
      partnerName: null,
      partnerId: null,
      isPartnerDrawing: false,
    }),
}));
