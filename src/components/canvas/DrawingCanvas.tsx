import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Svg, { Path, G, Defs, Mask, Rect } from 'react-native-svg';
import { colors } from '../../theme';

export interface Stroke {
  id: string;
  path: string;
  color: string;
  strokeWidth: number;
  isEraser?: boolean;
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
          color: isEraser ? '#000000' : currentColor,
          strokeWidth: isEraser ? brushSize * 2 : brushSize,
          isEraser: isEraser,
        };
        onStrokesChange([...strokes, newStroke]);
        pathRef.current = '';
        setCurrentPath('');
      }
    })
    .minDistance(1)
    .runOnJS(true);

  // Separate drawing strokes and eraser strokes
  const { drawingStrokes, eraserStrokes } = useMemo(() => {
    const drawing: Stroke[] = [];
    const eraser: Stroke[] = [];
    strokes.forEach((stroke) => {
      if (stroke.isEraser) {
        eraser.push(stroke);
      } else {
        drawing.push(stroke);
      }
    });
    return { drawingStrokes: drawing, eraserStrokes: eraser };
  }, [strokes]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.canvasContainer}>
          <Svg style={styles.svg}>
            <Defs>
              {/* Mask for eraser effect - white is visible, black is erased */}
              <Mask id="eraserMask">
                {/* Start with everything visible (white) */}
                <Rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Eraser strokes cut holes (black) */}
                {eraserStrokes.map((stroke) => (
                  <Path
                    key={stroke.id}
                    d={stroke.path}
                    stroke="black"
                    strokeWidth={stroke.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}
                {/* Current eraser stroke preview */}
                {currentPath && isEraser && (
                  <Path
                    d={currentPath}
                    stroke="black"
                    strokeWidth={brushSize * 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
              </Mask>
            </Defs>

            {/* Drawing strokes with eraser mask applied */}
            <G mask="url(#eraserMask)">
              {drawingStrokes.map((stroke) => (
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
              {/* Current drawing stroke preview */}
              {currentPath && !isEraser && (
                <Path
                  d={currentPath}
                  stroke={currentColor}
                  strokeWidth={brushSize}
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
