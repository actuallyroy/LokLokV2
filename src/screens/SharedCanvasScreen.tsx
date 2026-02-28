import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hasAllFilesAccess, requestAllFilesAccess, getWallpaper } from '../../modules/wallpaper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Use device screen aspect ratio (how lockscreen actually appears)
  const screenAspectRatio = SCREEN_WIDTH / SCREEN_HEIGHT;
  const [fadeAnim] = useState(new Animated.Value(0));
  const appState = useRef(AppState.currentState);
  const hasRequestedPermission = useRef(false);

  const showModal = () => {
    setShowPermissionModal(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPermissionModal(false);
    });
  };

  const handleGrantPermission = async () => {
    hideModal();
    hasRequestedPermission.current = true;
    await requestAllFilesAccess();
  };

  const loadWallpaper = useCallback(async () => {
    // Check if we have permission
    const hasAccess = await hasAllFilesAccess();

    if (!hasAccess) {
      // Show custom permission modal (only if we haven't already requested)
      if (!hasRequestedPermission.current) {
        showModal();
      }
      return;
    }

    // Get wallpaper
    const uri = await getWallpaper();
    if (uri) {
      setWallpaperUri(uri);
    }
  }, []);

  // Load wallpaper on mount
  useEffect(() => {
    loadWallpaper();
  }, [loadWallpaper]);

  // Re-check permission when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        hasRequestedPermission.current
      ) {
        // User returned from settings, check if permission was granted
        loadWallpaper();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [loadWallpaper]);

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
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />

      {/* Permission Request Modal */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="none"
        onRequestClose={hideModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Icon Header */}
            <View style={styles.modalIconContainer}>
              <LinearGradient
                colors={[colors.primary, '#ff8a65']}
                style={styles.modalIconGradient}
              >
                <MaterialIcons name="wallpaper" size={32} color={colors.white} />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>Show Your Wallpaper</Text>

            {/* Description */}
            <Text style={styles.modalDescription}>
              To display your lockscreen wallpaper as the canvas background, LokLok needs access to your files.
            </Text>

            {/* Privacy Notice */}
            <View style={styles.privacyNotice}>
              <MaterialIcons name="security" size={20} color={colors.success} />
              <Text style={styles.privacyText}>
                We only use this permission to read your wallpaper. Your files stay private and are never uploaded.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={hideModal}
              >
                <Text style={styles.modalButtonSecondaryText}>Maybe Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleGrantPermission}
              >
                <LinearGradient
                  colors={[colors.primary, '#ff6b3d']}
                  style={styles.modalButtonGradient}
                >
                  <MaterialIcons name="settings" size={18} color={colors.white} />
                  <Text style={styles.modalButtonPrimaryText}>Open Settings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <Header
          title="Shared Canvas"
          onBack={() => navigation.goBack()}
          rightElement={
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          }
        />
      </View>

        {/* Partner Status */}
        {isPartnerDrawing && (
          <View style={styles.partnerStatus}>
            <View style={styles.partnerDot} />
            <Text style={styles.partnerText}>Partner is drawing...</Text>
          </View>
        )}

        {/* Canvas Area */}
        <View style={styles.canvasWrapper}>
          <View
            style={[
              styles.canvasContainer,
              {
                aspectRatio: screenAspectRatio,
                flex: undefined,
                maxHeight: '100%',
              },
            ]}
          >
            {/* Wallpaper Background */}
            {wallpaperUri && (
              <Image
                source={{ uri: wallpaperUri }}
                style={styles.wallpaperBackground}
                resizeMode="cover"
              />
            )}

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
        </View>

        {/* Bottom Glass Panel */}
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + spacing.sm }]}>
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
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
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
  canvasWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  canvasContainer: {
    flex: 1,
    width: '100%',
    borderRadius: borderRadius.default,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a1a2e',
  },
  wallpaperBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  drawingLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomPanel: {
    backgroundColor: colors.glassBackground,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  colorPickerContainer: {
    paddingVertical: spacing.xs,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalIconContainer: {
    marginBottom: spacing.lg,
  },
  modalIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: borderRadius.default,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  privacyText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondaryText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  modalButtonPrimary: {
    flex: 1,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  modalButtonPrimaryText: {
    ...typography.button,
    color: colors.white,
  },
});
