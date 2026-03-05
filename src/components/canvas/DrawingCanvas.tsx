import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Svg, { Path, Text as SvgText, Rect } from 'react-native-svg';
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
  onTextEdit?: (stroke: Stroke) => void;
  selectedTextId?: string | null;
  onTextSelect?: (stroke: Stroke | null) => void;
  onTextMove?: (strokeId: string, x: number, y: number) => void;
  backgroundImage?: string;
}

// Check if a tap is on a text stroke
const findTextAtPoint = (
  point: { x: number; y: number },
  strokes: Stroke[],
  threshold: number = 40
): Stroke | null => {
  // Check in reverse order (top-most first)
  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i];
    if (stroke.type === 'text' && stroke.x !== undefined && stroke.y !== undefined) {
      const textWidth = (stroke.text?.length || 0) * (stroke.fontSize || 20) * 0.6;
      const textHeight = (stroke.fontSize || 20);

      // Check if point is within text bounding box (roughly)
      if (
        point.x >= stroke.x - 10 &&
        point.x <= stroke.x + textWidth + 10 &&
        point.y >= stroke.y - textHeight &&
        point.y <= stroke.y + 10
      ) {
        return stroke;
      }
    }
  }
  return null;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  strokes,
  onStrokesChange,
  currentColor,
  brushSize,
  isEraser,
  isTextTool,
  onTextTap,
  onTextEdit,
  selectedTextId,
  onTextSelect,
  onTextMove,
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const pathRef = useRef<string>('');
  const strokesRef = useRef<Stroke[]>(strokes);
  const isDraggingTextRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const originalTextPosRef = useRef<{ x: number; y: number } | null>(null);

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
    .maxDuration(250)
    .onEnd((event) => {
      const { x, y } = event;

      // First, check if tapping on existing text
      const tappedText = findTextAtPoint({ x, y }, strokesRef.current);
      if (tappedText) {
        // If text is already selected, double-tap to edit
        if (selectedTextId === tappedText.id && onTextEdit) {
          onTextEdit(tappedText);
          return;
        }
        // Select the text
        if (onTextSelect) {
          onTextSelect(tappedText);
        }
        return;
      }

      // Tapped on empty area - deselect any selected text
      if (selectedTextId && onTextSelect) {
        onTextSelect(null);
        return;
      }

      // If text tool is active, create new text at this position
      if (isTextTool && onTextTap) {
        onTextTap(x, y);
      }
    })
    .runOnJS(true);

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      const { x, y } = event;

      // Check if starting drag on selected text
      if (selectedTextId) {
        const selectedText = strokesRef.current.find(s => s.id === selectedTextId);
        if (selectedText && selectedText.type === 'text') {
          const tappedText = findTextAtPoint({ x, y }, [selectedText], 50);
          if (tappedText) {
            // Start dragging the selected text
            isDraggingTextRef.current = true;
            dragStartPosRef.current = { x, y };
            originalTextPosRef.current = { x: selectedText.x || 0, y: selectedText.y || 0 };
            return;
          }
        }
      }

      if (isTextTool) return;
      if (isEraser) {
        eraseAtPoint(x, y);
      } else {
        pathRef.current = `M ${x} ${y}`;
        setCurrentPath(pathRef.current);
      }
    })
    .onUpdate((event) => {
      const { x, y } = event;

      // Handle text dragging - use local offset for smooth dragging
      if (isDraggingTextRef.current && selectedTextId && dragStartPosRef.current) {
        const deltaX = x - dragStartPosRef.current.x;
        const deltaY = y - dragStartPosRef.current.y;
        setDragOffset({ x: deltaX, y: deltaY });
        return;
      }

      if (isTextTool) return;
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
      // Commit text position on drag end
      if (isDraggingTextRef.current && selectedTextId && originalTextPosRef.current && dragOffset) {
        const newX = originalTextPosRef.current.x + dragOffset.x;
        const newY = originalTextPosRef.current.y + dragOffset.y;
        if (onTextMove) {
          onTextMove(selectedTextId, newX, newY);
        }
      }
      // Reset text dragging state
      if (isDraggingTextRef.current) {
        isDraggingTextRef.current = false;
        dragStartPosRef.current = null;
        originalTextPosRef.current = null;
        setDragOffset(null);
        return;
      }

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

  // Use Exclusive to prioritize tap over pan for faster tap response
  const composedGesture = Gesture.Exclusive(tapGesture, panGesture);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.canvasContainer}>
          <Svg style={styles.svg}>
            {/* Render all strokes */}
            {strokes.map((stroke) => {
              if (stroke.type === 'text') {
                const isSelected = stroke.id === selectedTextId;
                const textWidth = (stroke.text?.length || 0) * (stroke.fontSize || 20) * 0.6;
                const textHeight = (stroke.fontSize || 20);
                // Apply drag offset for smooth dragging
                const offsetX = isSelected && dragOffset ? dragOffset.x : 0;
                const offsetY = isSelected && dragOffset ? dragOffset.y : 0;
                const displayX = (stroke.x || 0) + offsetX;
                const displayY = (stroke.y || 0) + offsetY;
                return (
                  <React.Fragment key={stroke.id}>
                    {/* Selection indicator */}
                    {isSelected && (
                      <Rect
                        x={displayX - 8}
                        y={displayY - textHeight - 4}
                        width={textWidth + 16}
                        height={textHeight + 16}
                        fill="transparent"
                        stroke={colors.primary}
                        strokeWidth={2}
                        strokeDasharray="6,3"
                        rx={4}
                      />
                    )}
                    <SvgText
                      x={displayX}
                      y={displayY}
                      fill={stroke.color}
                      fontSize={stroke.fontSize || 20}
                      fontWeight="bold"
                    >
                      {stroke.text}
                    </SvgText>
                  </React.Fragment>
                );
              }
              return (
                <Path
                  key={stroke.id}
                  d={stroke.path}
                  stroke={stroke.color}
                  strokeWidth={stroke.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              );
            })}
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
