import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Svg, { Path, G } from 'react-native-svg';
import { colors } from '../../theme';

export interface Stroke {
  id: string;
  path: string;
  color: string;
  strokeWidth: number;
}

interface DrawingCanvasProps {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  currentColor: string;
  brushSize: number;
  isEraser: boolean;
  backgroundImage?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  strokes,
  onStrokesChange,
  currentColor,
  brushSize,
  isEraser,
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const pathRef = useRef<string>('');

  const generateId = () => `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      const { x, y } = event;
      pathRef.current = `M ${x} ${y}`;
      setCurrentPath(pathRef.current);
    })
    .onUpdate((event) => {
      const { x, y } = event;
      pathRef.current += ` L ${x} ${y}`;
      setCurrentPath(pathRef.current);
    })
    .onEnd(() => {
      if (pathRef.current) {
        const newStroke: Stroke = {
          id: generateId(),
          path: pathRef.current,
          color: isEraser ? colors.backgroundDark : currentColor,
          strokeWidth: isEraser ? brushSize * 2 : brushSize,
        };
        onStrokesChange([...strokes, newStroke]);
        pathRef.current = '';
        setCurrentPath('');
      }
    })
    .minDistance(1)
    .runOnJS(true);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.canvasContainer}>
          <Svg style={styles.svg}>
            <G>
              {/* Render completed strokes */}
              {strokes.map((stroke) => (
                <Path
                  key={stroke.id}
                  d={stroke.path}
                  stroke={stroke.color}
                  strokeWidth={stroke.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {/* Render current stroke being drawn */}
              {currentPath && (
                <Path
                  d={currentPath}
                  stroke={isEraser ? colors.backgroundDark : currentColor}
                  strokeWidth={isEraser ? brushSize * 2 : brushSize}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </G>
          </Svg>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  canvasContainer: {
    flex: 1,
  },
  svg: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
