import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '../../theme';

export interface DraggableTextProps {
  id: string;
  initialText: string;
  initialX: number;
  initialY: number;
  initialFontSize: number;
  initialColor: string;
  initialRotation?: number;
  initialScale?: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onTextChange: (id: string, text: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onTransformChange: (id: string, rotation: number, scale: number) => void;
  onDelete: (id: string) => void;
  onFontSizeChange: (id: string, fontSize: number) => void;
  onColorChange: (id: string, color: string) => void;
}

export const DraggableText: React.FC<DraggableTextProps> = ({
  id,
  initialText,
  initialX,
  initialY,
  initialFontSize,
  initialColor,
  initialRotation = 0,
  initialScale = 1,
  isSelected,
  onSelect,
  onDeselect,
  onTextChange,
  onPositionChange,
  onTransformChange,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const inputRef = useRef<TextInput>(null);

  // Animated values
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const scale = useSharedValue(initialScale);
  const rotation = useSharedValue(initialRotation);
  const savedTranslateX = useSharedValue(initialX);
  const savedTranslateY = useSharedValue(initialY);
  const savedScale = useSharedValue(initialScale);
  const savedRotation = useSharedValue(initialRotation);

  // Update position when props change
  useEffect(() => {
    translateX.value = initialX;
    translateY.value = initialY;
    savedTranslateX.value = initialX;
    savedTranslateY.value = initialY;
  }, [initialX, initialY]);

  // Update scale/rotation when props change
  useEffect(() => {
    scale.value = initialScale;
    savedScale.value = initialScale;
  }, [initialScale]);

  useEffect(() => {
    rotation.value = initialRotation;
    savedRotation.value = initialRotation;
  }, [initialRotation]);

  const handleSelect = useCallback(() => {
    if (!isSelected) {
      onSelect(id);
    }
  }, [isSelected, onSelect, id]);

  const handleDoubleTap = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    onTextChange(id, text);
  }, [id, text, onTextChange]);

  const commitPosition = useCallback((x: number, y: number) => {
    onPositionChange(id, x, y);
  }, [id, onPositionChange]);

  const commitTransform = useCallback((rot: number, sc: number) => {
    onTransformChange(id, rot, sc);
  }, [id, onTransformChange]);

  // Memoize the gesture to prevent recreation on every render
  const gesture = useMemo(() => {
    // Pan gesture for dragging - simple version
    const panGesture = Gesture.Pan()
      .onBegin(() => {
        'worklet';
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        'worklet';
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      })
      .onEnd(() => {
        'worklet';
        runOnJS(commitPosition)(translateX.value, translateY.value);
      })
      .minDistance(5);

    // Long press for editing
    const longPressGesture = Gesture.LongPress()
      .minDuration(400)
      .onEnd((_, success) => {
        'worklet';
        if (success) {
          runOnJS(handleDoubleTap)();
        }
      });

    // Tap gesture for selection
    const tapGesture = Gesture.Tap()
      .onEnd(() => {
        'worklet';
        runOnJS(handleSelect)();
      });

    // Simple composition: tap to select, long press to edit, pan to drag
    return Gesture.Exclusive(longPressGesture, tapGesture, panGesture);
  }, [handleSelect, handleDoubleTap, commitPosition]);

  // @ts-expect-error - react-native-reanimated transform types are overly strict
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation.value}rad` },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View
          style={[
            styles.textContainer,
            isSelected && styles.selectedContainer,
          ]}
        >
          {isEditing ? (
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  fontSize: initialFontSize,
                  color: initialColor,
                },
              ]}
              value={text}
              onChangeText={setText}
              onBlur={handleBlur}
              multiline
              autoFocus
            />
          ) : (
            <Animated.Text
              style={[
                styles.text,
                {
                  fontSize: initialFontSize,
                  color: initialColor,
                },
              ]}
            >
              {text || 'Tap to edit'}
            </Animated.Text>
          )}

          {/* Delete button when selected */}
          {isSelected && !isEditing && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    minWidth: 50,
  },
  textContainer: {
    padding: spacing.sm,
    borderRadius: borderRadius.default,
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  text: {
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  textInput: {
    fontWeight: 'bold',
    padding: 0,
    margin: 0,
    minWidth: 100,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  deleteButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DraggableText;
