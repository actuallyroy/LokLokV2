import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../components/common';
import {
  DrawingCanvas,
  ColorPicker,
  BrushSizeSlider,
  ToolBar,
  Stroke,
  Tool,
} from '../components/canvas';
import { colors, typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useCanvasStore, usePairingStore } from '../store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type SharedCanvasScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SharedCanvas'
>;

interface SharedCanvasScreenProps {
  navigation: SharedCanvasScreenNavigationProp;
}

export const SharedCanvasScreen: React.FC<SharedCanvasScreenProps> = ({
  navigation,
}) => {
  const {
    strokes,
    currentColor,
    brushSize,
    selectedTool,
    setStrokes,
    setCurrentColor,
    setBrushSize,
    setSelectedTool,
    undoLastStroke,
    clearCanvas,
  } = useCanvasStore();

  const { isPartnerDrawing } = usePairingStore();

  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
    },
    [setStrokes]
  );

  const handleToolSelect = useCallback(
    (tool: Tool) => {
      if (tool === 'delete') {
        clearCanvas();
      } else {
        setSelectedTool(tool);
      }
    },
    [setSelectedTool, clearCanvas]
  );

  const handleDone = useCallback(() => {
    console.log('Canvas saved');
    navigation.goBack();
  }, [navigation]);

  const handleSave = useCallback(() => {
    console.log('Saving canvas...');
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Header
          title="Shared Canvas"
          onBack={() => navigation.goBack()}
          rightText="Save"
          onRightPress={handleSave}
        />

        {/* Partner Status */}
        {isPartnerDrawing && (
          <View style={styles.partnerStatus}>
            <View style={styles.partnerDot} />
            <Text style={styles.partnerText}>Partner is drawing...</Text>
          </View>
        )}

        {/* Canvas Area */}
        <View style={styles.canvasContainer}>
          {/* Background Image (placeholder) */}
          <View style={styles.backgroundPlaceholder}>
            <View style={styles.abstractPattern} />
          </View>

          {/* Drawing Canvas */}
          <View style={styles.drawingLayer}>
            <DrawingCanvas
              strokes={strokes}
              onStrokesChange={handleStrokesChange}
              currentColor={currentColor}
              brushSize={brushSize}
              isEraser={selectedTool === 'eraser'}
            />
          </View>
        </View>

        {/* Bottom Glass Panel */}
        <View style={styles.bottomPanel}>
          {/* Brush Size Slider */}
          <BrushSizeSlider
            value={brushSize}
            onValueChange={setBrushSize}
            minValue={1}
            maxValue={50}
          />

          {/* Color Picker */}
          <View style={styles.colorPickerContainer}>
            <ColorPicker
              selectedColor={currentColor}
              onColorSelect={setCurrentColor}
            />
          </View>

          {/* Tool Bar */}
          <ToolBar
            selectedTool={selectedTool}
            onToolSelect={handleToolSelect}
            onUndo={undoLastStroke}
            onDone={handleDone}
            canUndo={strokes.length > 0}
          />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  safeArea: {
    flex: 1,
  },
  partnerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  partnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  partnerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  canvasContainer: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: borderRadius.default,
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
  },
  abstractPattern: {
    flex: 1,
    backgroundColor: '#16213e',
    opacity: 0.8,
  },
  drawingLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomPanel: {
    backgroundColor: colors.glassBackground,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  colorPickerContainer: {
    paddingVertical: spacing.sm,
  },
});
