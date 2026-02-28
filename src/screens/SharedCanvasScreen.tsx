import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getWallpaper, setLockscreenWallpaper } from '../../modules/wallpaper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { captureRef } from 'react-native-view-shot';
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
import { useCanvasStore, usePairingStore, useSettingsStore } from '../store';
import { sendDrawingToPartner, getPartnerFcmToken, subscribeToDrawings } from '../services/strokeSync';
import { sendPushToPartner } from '../services/notifications';
import { saveBackgroundImageUri, getBackgroundImageUri, getDeviceId, applyReceivedDrawing } from '../services/backgroundTask';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const canvasRef = useRef<View>(null);

  const { userName, autoApplyDrawings } = useSettingsStore();

  // Use device screen aspect ratio (how lockscreen actually appears)
  const screenAspectRatio = SCREEN_WIDTH / SCREEN_HEIGHT;

  // Load wallpaper on mount
  useEffect(() => {
    const loadWallpaper = async () => {
      // First try to load previously saved background image
      const savedUri = await getBackgroundImageUri();
      if (savedUri) {
        setWallpaperUri(savedUri);
        return;
      }

      // Try to get wallpaper automatically (may fail on Android 13+)
      const uri = await getWallpaper();
      if (uri) {
        setWallpaperUri(uri);
        // Save for future sessions
        await saveBackgroundImageUri(uri);
      }
      // If null, user can select manually via the button
    };
    loadWallpaper();
  }, []);

  // Track if we should apply to lockscreen after render
  const [pendingLockscreenApply, setPendingLockscreenApply] = useState(false);

  // Apply to lockscreen when strokes are loaded and pending
  useEffect(() => {
    if (pendingLockscreenApply && strokes.length > 0 && wallpaperUri && canvasRef.current) {
      // Small delay to ensure canvas has rendered
      const timer = setTimeout(async () => {
        try {
          const uri = await captureRef(canvasRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });
          const success = await setLockscreenWallpaper(uri);
          if (success) {
            Alert.alert('Applied!', 'Drawing has been set as your lockscreen.');
          }
        } catch (error) {
          console.error('Error applying to lockscreen:', error);
        }
        setPendingLockscreenApply(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingLockscreenApply, strokes, wallpaperUri]);

  // Subscribe to incoming drawings from partner
  useEffect(() => {
    if (!isPaired || !pairingId) return;

    let myDeviceId: string | null = null;

    const setupSubscription = async () => {
      myDeviceId = await getDeviceId();

      const unsubscribe = subscribeToDrawings(pairingId, async (drawing) => {
        // Only load if it's from partner, not from me
        if (drawing.senderId !== myDeviceId && (drawing.strokes.length > 0 || drawing.imageBase64)) {
          console.log('Received drawing from partner:', drawing.strokes.length, 'strokes', drawing.imageBase64 ? 'with image' : 'no image');
          setStrokes(drawing.strokes);

          // Auto-apply if setting is enabled
          if (autoApplyDrawings) {
            // If we have a pre-rendered image, use it directly (faster & works in background)
            if (drawing.imageBase64) {
              const success = await applyReceivedDrawing(pairingId);
              Alert.alert(
                'New Drawing!',
                success
                  ? `${drawing.senderName} sent you a drawing! Applied to lockscreen.`
                  : `${drawing.senderName} sent you a drawing! (Could not apply to lockscreen)`
              );
            } else {
              // Fall back to canvas capture
              setPendingLockscreenApply(true);
              Alert.alert(
                'New Drawing!',
                `${drawing.senderName} sent you a drawing! Applying to lockscreen...`
              );
            }
          } else {
            // Show alert with option to apply to lockscreen
            Alert.alert(
              'New Drawing!',
              `${drawing.senderName} sent you a drawing!`,
              [
                { text: 'View Only', style: 'cancel' },
                {
                  text: 'Apply to Lockscreen',
                  onPress: async () => {
                    if (drawing.imageBase64) {
                      await applyReceivedDrawing(pairingId);
                    } else {
                      setPendingLockscreenApply(true);
                    }
                  },
                },
              ]
            );
          }
        }
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    setupSubscription().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isPaired, pairingId, setStrokes, autoApplyDrawings]);

  // Pick wallpaper from gallery
  const pickWallpaperFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setWallpaperUri(uri);
        // Save for future sessions
        await saveBackgroundImageUri(uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

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

  const { isPartnerDrawing, isPaired, pairingId, partnerName, partnerFcmToken } = usePairingStore();

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

  const handleDone = useCallback(async () => {
    if (strokes.length === 0) {
      navigation.goBack();
      return;
    }

    // Build options based on pairing status
    const options: any[] = [
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => navigation.goBack(),
      },
      {
        text: 'Save to My Lockscreen',
        onPress: () => saveToLockscreen(),
      },
    ];

    // Add send to partner option if paired
    if (isPaired && pairingId) {
      options.push({
        text: `Send to ${partnerName || 'Partner'}`,
        onPress: () => sendToPartner(),
      });
    }

    Alert.alert(
      'Save Drawing',
      isPaired
        ? 'What would you like to do with your drawing?'
        : 'Would you like to set this as your lockscreen?',
      options
    );
  }, [strokes, navigation, isPaired, pairingId, partnerName]);

  const sendToPartner = async () => {
    if (!pairingId || !canvasRef.current) {
      Alert.alert('Error', 'No partner connected');
      return;
    }

    setIsSending(true);
    try {
      // Get my device ID
      const myDeviceId = await getDeviceId() || 'unknown';

      // Capture canvas as base64 for background updates
      let imageBase64: string | undefined;
      try {
        const uri = await captureRef(canvasRef, {
          format: 'jpg',
          quality: 0.7, // Compress to stay under Firestore limits
          result: 'base64',
        });
        imageBase64 = uri;
      } catch (captureError) {
        console.warn('Could not capture canvas image:', captureError);
      }

      // Send strokes and image to Firestore
      const success = await sendDrawingToPartner(
        pairingId,
        strokes,
        myDeviceId,
        userName,
        SCREEN_WIDTH,
        SCREEN_HEIGHT,
        imageBase64
      );

      if (!success) {
        throw new Error('Failed to send drawing');
      }

      // Get partner's FCM token and send push notification
      // First try from local store, then from Firestore
      let partnerToken = partnerFcmToken;
      if (!partnerToken) {
        partnerToken = await getPartnerFcmToken(pairingId, myDeviceId);
      }

      if (partnerToken) {
        await sendPushToPartner(partnerToken, userName, pairingId);
      }

      // Save background image URI for when partner sends back
      if (wallpaperUri) {
        await saveBackgroundImageUri(wallpaperUri);
      }

      Alert.alert(
        'Sent!',
        `Your drawing has been sent to ${partnerName || 'your partner'}. They'll see it on their lockscreen!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error sending to partner:', error);
      Alert.alert('Error', 'Failed to send drawing. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const saveToLockscreen = async () => {
    if (!canvasRef.current) return;

    setIsSaving(true);
    try {
      // Capture the canvas with wallpaper + drawing
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Set as lockscreen wallpaper
      const success = await setLockscreenWallpaper(uri);

      if (success) {
        Alert.alert(
          'Success!',
          'Your drawing has been set as your lockscreen wallpaper.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to set lockscreen wallpaper. Please try again.');
      }
    } catch (error) {
      console.error('Error saving to lockscreen:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />

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
          ref={canvasRef}
          style={[
            styles.canvasContainer,
            {
              aspectRatio: screenAspectRatio,
              flex: undefined,
              maxHeight: '100%',
            },
          ]}
          collapsable={false}
        >
          {/* Wallpaper Background */}
          {wallpaperUri ? (
            <Image
              source={{ uri: wallpaperUri }}
              style={styles.wallpaperBackground}
              resizeMode="cover"
            />
          ) : (
            <TouchableOpacity
              style={styles.selectBackgroundButton}
              onPress={pickWallpaperFromGallery}
            >
              <MaterialIcons name="add-photo-alternate" size={48} color={colors.textSecondary} />
              <Text style={styles.selectBackgroundText}>Tap to select your lockscreen image</Text>
            </TouchableOpacity>
          )}

          {/* Drawing Canvas - only active when wallpaper is selected */}
          {wallpaperUri && (
            <View style={styles.drawingLayer}>
              <DrawingCanvas
                strokes={strokes}
                onStrokesChange={handleStrokesChange}
                currentColor={currentColor}
                brushSize={brushSize}
                isEraser={selectedTool === 'eraser'}
              />
            </View>
          )}

          {/* Change Background Button */}
          {wallpaperUri && (
            <TouchableOpacity
              style={styles.changeBackgroundButton}
              onPress={pickWallpaperFromGallery}
            >
              <MaterialIcons name="image" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Saving/Sending Overlay - outside canvas ref so it's not captured */}
        {(isSaving || isSending) && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.savingText}>
              {isSending ? 'Sending to partner...' : 'Saving...'}
            </Text>
          </View>
        )}
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
  selectBackgroundButton: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectBackgroundText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  drawingLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  changeBackgroundButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  savingText: {
    ...typography.h3,
    color: colors.white,
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
});
