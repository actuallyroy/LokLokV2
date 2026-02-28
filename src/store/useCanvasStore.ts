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

  // Actions
  setStrokes: (strokes: Stroke[]) => void;
  addStroke: (stroke: Stroke) => void;
  undoLastStroke: () => void;
  clearCanvas: () => void;
  setCurrentColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setSelectedTool: (tool: Tool) => void;
  addCustomColor: (color: string) => void;
  removeCustomColor: (color: string) => void;
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

      // Actions
      setStrokes: (strokes) => set({ strokes }),

      addStroke: (stroke) =>
        set((state) => ({ strokes: [...state.strokes, stroke] })),

      undoLastStroke: () =>
        set((state) => ({
          strokes: state.strokes.slice(0, -1),
        })),

      clearCanvas: () => set({ strokes: [] }),

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
    }),
    {
      name: 'loklok-canvas-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
