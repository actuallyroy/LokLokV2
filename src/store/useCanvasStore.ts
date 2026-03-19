import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { Stroke, Tool } from '../components/canvas';

interface CanvasState {
  // Drawing state
  strokes: Stroke[];
  currentColor: string;
  brushSize: number;
  selectedTool: Tool;
  customColors: string[];
  isDraft: boolean;

  // Partner drawing state
  partnerStrokes: Stroke[];

  // Seen status
  lastSentAt: string | null;
  isSeenByPartner: boolean;
  seenAt: string | null;

  // Actions
  setStrokes: (strokes: Stroke[]) => void;
  addStroke: (stroke: Stroke) => void;
  mergeStrokes: (incomingStrokes: Stroke[]) => void;
  undoLastStroke: () => void;
  clearCanvas: () => void;
  setPartnerStrokes: (strokes: Stroke[]) => void;
  markAsSent: () => void;
  setCurrentColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setSelectedTool: (tool: Tool) => void;
  addCustomColor: (color: string) => void;
  removeCustomColor: (color: string) => void;
  setLastSentAt: (timestamp: string | null) => void;
  setSeenStatus: (seenAt: string | null) => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set) => ({
      // Initial state
      strokes: [],
      currentColor: colors.canvasColors[0],
      brushSize: 15,
      selectedTool: 'brush',
      customColors: [],
      isDraft: false,
      partnerStrokes: [],
      lastSentAt: null,
      isSeenByPartner: false,
      seenAt: null,

      // Actions
      setStrokes: (strokes) => set({ strokes, isDraft: true }),

      addStroke: (stroke) =>
        set((state) => ({ strokes: [...state.strokes, stroke], isDraft: true })),

      mergeStrokes: (incomingStrokes) =>
        set((state) => {
          const existingIds = new Set(state.strokes.map((s) => s.id));
          const newStrokes = incomingStrokes.filter((s) => !existingIds.has(s.id));
          return { strokes: [...state.strokes, ...newStrokes] };
        }),

      undoLastStroke: () =>
        set((state) => ({
          strokes: state.strokes.slice(0, -1),
          isDraft: state.strokes.length > 1,
        })),

      clearCanvas: () => set({ strokes: [], isDraft: false }),

      setPartnerStrokes: (strokes) => set({ partnerStrokes: strokes }),

      markAsSent: () =>
        set({
          isDraft: false,
          lastSentAt: new Date().toISOString(),
          isSeenByPartner: false,
          seenAt: null,
          partnerStrokes: [],
        }),

      setCurrentColor: (color) => set({ currentColor: color }),

      setBrushSize: (size) => set({ brushSize: size }),

      setSelectedTool: (tool) => set({ selectedTool: tool }),

      addCustomColor: (color) =>
        set((state) => {
          // Avoid duplicates and limit to 10 custom colors
          if (state.customColors.includes(color)) return state;
          const newColors = [...state.customColors, color].slice(-10);
          return { customColors: newColors };
        }),

      removeCustomColor: (color) =>
        set((state) => ({
          customColors: state.customColors.filter((c) => c !== color),
        })),

      setLastSentAt: (timestamp) => set({ lastSentAt: timestamp }),

      setSeenStatus: (seenAt) =>
        set({
          seenAt,
          isSeenByPartner: !!seenAt,
        }),
    }),
    {
      name: 'loklok-canvas-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
