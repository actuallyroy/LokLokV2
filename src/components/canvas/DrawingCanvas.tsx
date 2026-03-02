import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme';

export interface Stroke {
  id: string;
  path: string;
  color: string;
  strokeWidth: number;
  type?: 'brush' | 'text';
  text?: string;
  x?: number;
  y?: number;
  fontSize?: number;
}

// Parse SVG path string to extract points
const parsePathToPoints = (path: string): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = [];
  const commands = path.match(/[ML]\s*[\d.]+\s+[\d.]+/g) || [];

  for (const cmd of commands) {
    const nums = cmd.match(/[\d.]+/g);
    if (nums && nums.length >= 2) {
      points.push({ x: parseFloat(nums[0]), y: parseFloat(nums[1]) });
    }
  }
  return points;
};

// Check if a point is close to any point in a stroke
const isPointNearStroke = (
  point: { x: number; y: number },
  strokePoints: { x: number; y: number }[],
  threshold: number
): boolean => {
  for (const sp of strokePoints) {
    const dx = point.x - sp.x;
    const dy = point.y - sp.y;
    if (dx * dx + dy * dy < threshold * threshold) {
      return true;
    }
  }
  return false;
};

interface DrawingCanvasProps {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  currentColor: string;
  brushSize: number;
  isEraser: boolean;
  isTextTool?: boolean;
  onTextTap?: (x: number, y: number) => void;
  backgroundImage?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  strokes,
  onStrokesChange,
  currentColor,
  brushSize,
  isEraser,
  isTextTool,
  onTextTap,
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const pathRef = useRef<string>('');
  const strokesRef = useRef<Stroke[]>(strokes);

  // Keep strokesRef in sync
  strokesRef.current = strokes;

  const generateId = () => `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Erase strokes that the eraser touches
  const eraseAtPoint = useCallback((x: number, y: number) => {
    const eraserRadius = brushSize * 2;
    const point = { x, y };

    const remainingStrokes = strokesRef.current.filter((stroke) => {
      if (stroke.type === 'text') {
        // For text strokes, check if eraser is near the text position
        if (stroke.x !== undefined && stroke.y !== undefined) {
          const dx = point.x - stroke.x;
          const dy = point.y - stroke.y;
          const textRadius = (stroke.fontSize || 20) * 0.6;
          return dx * dx + dy * dy >= (eraserRadius + textRadius) * (eraserRadius + textRadius);
        }
        return true;
      }
      const strokePoints = parsePathToPoints(stroke.path);
      // Keep the stroke if the eraser is NOT near it
      return !isPointNearStroke(point, strokePoints, eraserRadius + stroke.strokeWidth / 2);
    });

    if (remainingStrokes.length !== strokesRef.current.length) {
      onStrokesChange(remainingStrokes);
    }
  }, [brushSize, onStrokesChange]);

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (isTextTool && onTextTap) {
        onTextTap(event.x, event.y);
      }
    })
    .runOnJS(true);

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      if (isTextTool) return;
      const { x, y } = event;
      if (isEraser) {
        eraseAtPoint(x, y);
      } else {
        pathRef.current = `M ${x} ${y}`;
        setCurrentPath(pathRef.current);
      }
    })
    .onUpdate((event) => {
      if (isTextTool) return;
      const { x, y } = event;
      if (isEraser) {
        eraseAtPoint(x, y);
        // Show eraser cursor path
        if (!pathRef.current) {
          pathRef.current = `M ${x} ${y}`;
        } else {
          pathRef.current += ` L ${x} ${y}`;
        }
        setCurrentPath(pathRef.current);
      } else {
        pathRef.current += ` L ${x} ${y}`;
        setCurrentPath(pathRef.current);
      }
    })
    .onEnd(() => {
      if (isTextTool) return;
      if (!isEraser && pathRef.current) {
        const newStroke: Stroke = {
          id: generateId(),
          path: pathRef.current,
          color: currentColor,
          strokeWidth: brushSize,
        };
        onStrokesChange([...strokes, newStroke]);
      }
      pathRef.current = '';
      setCurrentPath('');
    })
    .minDistance(1)
    .runOnJS(true);

  const composedGesture = Gesture.Race(tapGesture, panGesture);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.canvasContainer}>
          <Svg style={styles.svg}>
            {/* Render all strokes */}
            {strokes.map((stroke) =>
              stroke.type === 'text' ? (
                <SvgText
                  key={stroke.id}
                  x={stroke.x}
                  y={stroke.y}
                  fill={stroke.color}
                  fontSize={stroke.fontSize || 20}
                  fontWeight="bold"
                >
                  {stroke.text}
                </SvgText>
              ) : (
                <Path
                  key={stroke.id}
                  d={stroke.path}
                  stroke={stroke.color}
                  strokeWidth={stroke.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )
            )}
            {/* Current stroke/eraser preview */}
            {currentPath && (
              <Path
                d={currentPath}
                stroke={isEraser ? 'rgba(255,100,100,0.4)' : currentColor}
                strokeWidth={isEraser ? brushSize * 4 : brushSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
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
