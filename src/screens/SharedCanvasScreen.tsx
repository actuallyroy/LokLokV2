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
  Modal,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getWallpaper, setLockscreenWallpaper, startSyncService, stopSyncService } from '../../modules/wallpaper';
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
  DraggableText,
} from '../components/canvas';
import { colors, typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useCanvasStore, usePairingStore, useSettingsStore } from '../store';
import { sendDrawingToPartner, getPartnerFcmToken, subscribeToDrawings, markDrawingAsSeen } from '../services/strokeSync';
import { sendPushToPartner, sendSeenNotification } from '../services/notifications';
import { saveBackgroundImageUri, getBackgroundImageUri, getDeviceId, applyReceivedDrawing } from '../services/backgroundTask';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const { width: PIXEL_WIDTH, height: PIXEL_HEIGHT } = Dimensions.get('screen');

// Get actual pixel dimensions for high-quality capture
const CAPTURE_WIDTH = Math.round(PIXEL_WIDTH);
const CAPTURE_HEIGHT = Math.round(PIXEL_HEIGHT);

// Extended color palette for the color picker modal
const COLOR_PALETTE = [
  // Row 1 - Reds/Pinks
  '#FF0000', '#FF4444', '#FF6B6B', '#FF8A8A', '#FFB3B3',
  '#E91E63', '#F06292', '#F48FB1', '#F8BBD9', '#FCE4EC',
  // Row 2 - Oranges/Yellows
  '#FF5722', '#FF7043', '#FF8A65', '#FFAB91', '#FFCCBC',
  '#FF9800', '#FFB74D', '#FFCC80', '#FFE0B2', '#FFF3E0',
  // Row 3 - Yellows/Greens
  '#FFC107', '#FFD54F', '#FFE082', '#FFECB3', '#FFF8E1',
  '#FFEB3B', '#FFF176', '#FFF59D', '#FFF9C4', '#FFFDE7',
  // Row 4 - Greens
  '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9',
  '#8BC34A', '#AED581', '#C5E1A5', '#DCEDC8', '#F1F8E9',
  // Row 5 - Teals/Cyans
  '#009688', '#26A69A', '#4DB6AC', '#80CBC4', '#B2DFDB',
  '#00BCD4', '#26C6DA', '#4DD0E1', '#80DEEA', '#B2EBF2',
  // Row 6 - Blues
  '#2196F3', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB',
  '#3F51B5', '#5C6BC0', '#7986CB', '#9FA8DA', '#C5CAE9',
  // Row 7 - Purples
  '#9C27B0', '#AB47BC', '#BA68C8', '#CE93D8', '#E1BEE7',
  '#673AB7', '#7E57C2', '#9575CD', '#B39DDB', '#D1C4E9',
  // Row 8 - Neutrals
  '#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E',
  '#757575', '#616161', '#424242', '#212121', '#000000',
];

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

  // Store hooks - must be declared before useEffects that depend on them
  const {
    strokes,
    currentColor,
    brushSize,
    selectedTool,
    customColors,
    isDraft,
    setStrokes,
    setCurrentColor,
    setBrushSize,
    setSelectedTool,
    undoLastStroke,
    clearCanvas,
    markAsSent,
    mergeStrokes,
    addCustomColor,
    removeCustomColor,
  } = useCanvasStore();

  const { isPartnerDrawing, isPaired, pairingId, partnerName, partnerFcmToken } = usePairingStore();

  const { userName, autoApplyDrawings, skipSendConfirmation, setSkipSendConfirmation } = useSettingsStore();

  // Local state
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const canvasRef = useRef<View>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  // Seen status state
  const [drawingSeenAt, setDrawingSeenAt] = useState<string | null>(null);
  const [isSeenByPartner, setIsSeenByPartner] = useState(false);
  const lastNotifiedSeenAt = useRef<string | null>(null);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [pendingAction, setPendingAction] = useState<'send' | 'save' | null>(null);

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Color picker modal state
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);

  // Text input modal state (for new text)
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [pendingTextPosition, setPendingTextPosition] = useState<{ x: number; y: number } | null>(null);

  // Text edit modal state (for existing text)
  const [showTextEditModal, setShowTextEditModal] = useState(false);
  const [editingTextStroke, setEditingTextStroke] = useState<Stroke | null>(null);
  const [editTextValue, setEditTextValue] = useState('');
  const [editTextColor, setEditTextColor] = useState('#ffffff');
  const [editTextSize, setEditTextSize] = useState(20);

  // Text selection state
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const showToastNotification = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  }, []);

  // Format seen timestamp for display
  const formatSeenTime = useCallback((seenAt: string | null): string => {
    if (!seenAt) return '';
    const seenTime = new Date(seenAt);
    const now = new Date();
    const diffMs = now.getTime() - seenTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 10) return 'just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return seenTime.toLocaleDateString();
  }, []);

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
            width: CAPTURE_WIDTH,
            height: CAPTURE_HEIGHT,
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

      // Start foreground service to prevent Samsung from freezing the app
      console.log(`[${Date.now()}] Starting sync service to prevent app freeze...`);
      const serviceStarted = await startSyncService();
      console.log(`[${Date.now()}] Sync service started: ${serviceStarted}`);

      const unsubscribe = subscribeToDrawings(pairingId, async (drawing) => {
        const callbackTime = Date.now();
        try {
          console.log(`[${callbackTime}] SharedCanvasScreen callback START - senderId: ${drawing.senderId}, myDeviceId: ${myDeviceId}`);

          // Check if this is OUR drawing that the partner marked as seen
          if (drawing.senderId === myDeviceId && drawing.seenAt) {
            const seenTime = drawing.seenAt.toMillis?.() || 0;
            const seenAtISO = new Date(seenTime).toISOString();
            // Only update if this is a new seen time (prevent duplicate processing)
            if (lastNotifiedSeenAt.current !== seenAtISO) {
              setDrawingSeenAt(seenAtISO);
              setIsSeenByPartner(true);
              lastNotifiedSeenAt.current = seenAtISO;
              console.log(`[${Date.now()}] Our drawing was seen by partner at ${seenTime}`);
            }
          }

          // Only load if it's from partner, not from me
          if (drawing.senderId !== myDeviceId && drawing.strokes.length > 0) {
            console.log(`[${Date.now()}] Received drawing from partner: ${drawing.strokes.length} strokes`);
            // Note: Don't merge to canvas - just apply to lockscreen
            // Canvas is for user's local drawing, lockscreen is the shared drawing

            // Auto-apply if setting is enabled
            if (autoApplyDrawings) {
              console.log(`[${Date.now()}] autoApplyDrawings=true, calling applyReceivedDrawing...`);
              // Don't force apply - let timestamp check prevent re-applying same drawing
              const success = await applyReceivedDrawing(pairingId, false);
              console.log(`[${Date.now()}] applyReceivedDrawing returned: ${success}`);
              // Seen notification is sent in applyReceivedDrawing
            } else {
              // Just apply without popup when auto-apply is disabled
              await applyReceivedDrawing(pairingId, false);
              // Seen notification is sent in applyReceivedDrawing
            }
          } else {
            console.log(`[${Date.now()}] Skipping drawing - either own drawing (${drawing.senderId === myDeviceId}) or no strokes (${drawing.strokes.length})`);
          }
          console.log(`[${Date.now()}] SharedCanvasScreen callback END`);
        } catch (error) {
          console.error(`[${Date.now()}] Error in subscription callback:`, error);
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
      // Stop the sync service when leaving the screen
      stopSyncService().then(() => {
        console.log(`[${Date.now()}] Sync service stopped on cleanup`);
      });
    };
  }, [isPaired, pairingId, mergeStrokes, autoApplyDrawings]);

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

  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
    },
    [setStrokes]
  );

  const handleToolSelect = useCallback(
    (tool: Tool) => {
      // Deselect any selected text when switching tools
      setSelectedTextId(null);
      if (tool === 'delete') {
        clearCanvas();
      } else {
        setSelectedTool(tool);
      }
    },
    [setSelectedTool, clearCanvas]
  );

  const handleAddColor = useCallback(() => {
    setShowColorPickerModal(true);
  }, []);

  const handleSelectPaletteColor = useCallback((color: string) => {
    addCustomColor(color);
    setCurrentColor(color);
    setShowColorPickerModal(false);
  }, [addCustomColor, setCurrentColor]);

  const handleTextTap = useCallback((x: number, y: number) => {
    setPendingTextPosition({ x, y });
    setTextInputValue('');
    setShowTextInput(true);
  }, []);

  const handleTextConfirm = useCallback(() => {
    if (!pendingTextPosition || !textInputValue.trim()) {
      setShowTextInput(false);
      setPendingTextPosition(null);
      return;
    }
    const fontSize = Math.max(brushSize * 1.5, 16);
    const textStroke: import('../components/canvas').Stroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      path: '',
      color: currentColor,
      strokeWidth: brushSize,
      type: 'text',
      text: textInputValue.trim(),
      x: pendingTextPosition.x,
      y: pendingTextPosition.y,
      fontSize,
    };
    setStrokes([...strokes, textStroke]);
    setShowTextInput(false);
    setPendingTextPosition(null);
  }, [pendingTextPosition, textInputValue, brushSize, currentColor, strokes, setStrokes]);

  // Handlers for DraggableText
  const handleTextSelect = useCallback((id: string) => {
    setSelectedTextId(id);
  }, []);

  const handleTextDeselect = useCallback(() => {
    setSelectedTextId(null);
  }, []);

  const handleDraggableTextChange = useCallback((id: string, newText: string) => {
    const updatedStrokes = strokes.map((s) =>
      s.id === id ? { ...s, text: newText } : s
    );
    setStrokes(updatedStrokes);
  }, [strokes, setStrokes]);

  const handleTextPositionChange = useCallback((id: string, x: number, y: number) => {
    const updatedStrokes = strokes.map((s) =>
      s.id === id ? { ...s, x, y } : s
    );
    setStrokes(updatedStrokes);
  }, [strokes, setStrokes]);

  const handleTextTransformChange = useCallback((id: string, rotation: number, scale: number) => {
    const updatedStrokes = strokes.map((s) =>
      s.id === id ? { ...s, rotation, scale } : s
    );
    setStrokes(updatedStrokes);
  }, [strokes, setStrokes]);

  const handleTextDeleteFromDraggable = useCallback((id: string) => {
    const updatedStrokes = strokes.filter((s) => s.id !== id);
    setStrokes(updatedStrokes);
    setSelectedTextId(null);
  }, [strokes, setStrokes]);

  const handleTextEditConfirm = useCallback(() => {
    if (!editingTextStroke || !editTextValue.trim()) {
      setShowTextEditModal(false);
      setEditingTextStroke(null);
      return;
    }

    // Update the stroke in the strokes array
    const updatedStrokes = strokes.map((s) =>
      s.id === editingTextStroke.id
        ? {
            ...s,
            text: editTextValue.trim(),
            color: editTextColor,
            fontSize: editTextSize,
          }
        : s
    );
    setStrokes(updatedStrokes);
    setShowTextEditModal(false);
    setEditingTextStroke(null);
  }, [editingTextStroke, editTextValue, editTextColor, editTextSize, strokes, setStrokes]);

  const handleTextDelete = useCallback(() => {
    if (!editingTextStroke) return;

    const updatedStrokes = strokes.filter((s) => s.id !== editingTextStroke.id);
    setStrokes(updatedStrokes);
    setShowTextEditModal(false);
    setEditingTextStroke(null);
    // Also clear selection if deleted text was selected
    if (selectedTextId === editingTextStroke.id) {
      setSelectedTextId(null);
    }
  }, [editingTextStroke, strokes, setStrokes, selectedTextId]);

  // Get the selected text stroke for formatting
  const selectedTextStroke = selectedTextId
    ? strokes.find((s) => s.id === selectedTextId && s.type === 'text')
    : null;

  // Handler for changing selected text color (from toolbar)
  const handleSelectedTextColorChange = useCallback((color: string) => {
    if (!selectedTextId) return;
    const updatedStrokes = strokes.map((s) =>
      s.id === selectedTextId ? { ...s, color } : s
    );
    setStrokes(updatedStrokes);
    setCurrentColor(color);
  }, [selectedTextId, strokes, setStrokes, setCurrentColor]);

  // Handler for changing selected text size (from toolbar)
  const handleSelectedTextSizeChange = useCallback((size: number) => {
    if (!selectedTextId) return;
    const updatedStrokes = strokes.map((s) =>
      s.id === selectedTextId ? { ...s, fontSize: size } : s
    );
    setStrokes(updatedStrokes);
    setBrushSize(size);
  }, [selectedTextId, strokes, setStrokes, setBrushSize]);

  const handleConfirmAction = useCallback(() => {
    if (dontShowAgain) {
      setSkipSendConfirmation(true);
    }
    setShowConfirmModal(false);

    if (pendingAction === 'send') {
      sendToPartner();
    } else if (pendingAction === 'save') {
      saveToLockscreen();
    }
    setPendingAction(null);
    setDontShowAgain(false);
  }, [dontShowAgain, pendingAction, setSkipSendConfirmation]);

  const handleCancelAction = useCallback(() => {
    setShowConfirmModal(false);
    setPendingAction(null);
    setDontShowAgain(false);
  }, []);

  const handleDone = useCallback(async () => {
    if (strokes.length === 0) return;

    // If paired, send to partner; otherwise save to own lockscreen
    const action = isPaired && pairingId ? 'send' : 'save';

    if (skipSendConfirmation) {
      // Skip confirmation modal
      if (action === 'send') {
        sendToPartner();
      } else {
        saveToLockscreen();
      }
    } else {
      // Show confirmation modal
      setPendingAction(action);
      setShowConfirmModal(true);
    }
  }, [strokes, navigation, isPaired, pairingId, skipSendConfirmation]);

  const sendToPartner = async () => {
    if (!pairingId || !canvasRef.current) {
      Alert.alert('Error', 'No partner connected');
      return;
    }

    setIsSending(true);
    try {
      // Get my device ID
      const myDeviceId = await getDeviceId() || 'unknown';

      // Send strokes to Firestore (no image needed - receiver composites locally)
      // Use actual canvas dimensions so native compositing scales correctly
      const success = await sendDrawingToPartner(
        pairingId,
        strokes,
        myDeviceId,
        userName,
        canvasDimensions.width,
        canvasDimensions.height
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

      // Also apply to own lockscreen
      try {
        const uri = await captureRef(canvasRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
          width: CAPTURE_WIDTH,
          height: CAPTURE_HEIGHT,
        });
        await setLockscreenWallpaper(uri);
      } catch (e) {
        console.error('Error applying to own lockscreen:', e);
      }

      markAsSent();
      // Reset seen status for new drawing
      setDrawingSeenAt(null);
      setIsSeenByPartner(false);
      lastNotifiedSeenAt.current = null;
      showToastNotification(`Sent to ${partnerName || 'your partner'}!`);
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
      // Capture the canvas with wallpaper + drawing at full resolution
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
      });
      console.log('Saved lockscreen at', CAPTURE_WIDTH, 'x', CAPTURE_HEIGHT);

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

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelAction}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Lockscreen</Text>
            <Text style={styles.modalMessage}>
              {pendingAction === 'send'
                ? "This will update your lockscreen and your partner's lockscreen."
                : "This will update your lockscreen."}
            </Text>

            {/* Checkbox */}
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setDontShowAgain(!dontShowAgain)}
            >
              <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                {dontShowAgain && (
                  <MaterialIcons name="check" size={16} color={colors.white} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Don't show this again</Text>
            </Pressable>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleCancelAction}>
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonConfirm} onPress={handleConfirmAction}>
                <Text style={styles.modalButtonConfirmText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {showToast && (
        <View style={[styles.toast, { top: insets.top + spacing.md }]}>
          <MaterialIcons name="check-circle" size={24} color={colors.white} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowColorPickerModal(false)}
      >
        <View style={styles.colorModalOverlay}>
          <View style={styles.colorModalContent}>
            {/* Header */}
            <View style={styles.colorModalHeader}>
              <Text style={styles.colorModalTitle}>Choose a Color</Text>
              <TouchableOpacity
                onPress={() => setShowColorPickerModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Color Grid */}
            <ScrollView
              style={styles.colorGridScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.colorGrid}>
                {COLOR_PALETTE.map((color, index) => (
                  <TouchableOpacity
                    key={`${color}-${index}`}
                    style={[
                      styles.colorGridItem,
                      { backgroundColor: color },
                      color === '#FFFFFF' && styles.colorGridItemWhite,
                    ]}
                    onPress={() => handleSelectPaletteColor(color)}
                    activeOpacity={0.7}
                  />
                ))}
              </View>
            </ScrollView>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.colorModalCancelButton}
              onPress={() => setShowColorPickerModal(false)}
            >
              <Text style={styles.colorModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Text Input Modal */}
      <Modal
        visible={showTextInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTextInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Text</Text>
            <TextInput
              style={styles.textInput}
              value={textInputValue}
              onChangeText={setTextInputValue}
              placeholder="Type your text..."
              placeholderTextColor={colors.textTertiary}
              autoFocus
              multiline
              maxLength={200}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowTextInput(false);
                  setPendingTextPosition(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButtonConfirm, !textInputValue.trim() && styles.disabledButton]}
                onPress={handleTextConfirm}
                disabled={!textInputValue.trim()}
              >
                <Text style={styles.modalButtonConfirmText}>Place</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Text Edit Modal */}
      <Modal
        visible={showTextEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTextEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.textEditModalContent]}>
            <Text style={styles.modalTitle}>Edit Text</Text>

            {/* Text Input */}
            <TextInput
              style={styles.textInput}
              value={editTextValue}
              onChangeText={setEditTextValue}
              placeholder="Type your text..."
              placeholderTextColor={colors.textTertiary}
              autoFocus
              multiline
              maxLength={200}
            />

            {/* Color Selection */}
            <Text style={styles.editSectionLabel}>Color</Text>
            <View style={styles.editColorRow}>
              {['#ff6b6b', '#ffa502', '#ffdd59', '#26de81', '#4bcffa', '#a55eea', '#ffffff'].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.editColorOption,
                    { backgroundColor: color },
                    editTextColor === color && styles.editColorSelected,
                  ]}
                  onPress={() => setEditTextColor(color)}
                />
              ))}
            </View>

            {/* Size Slider */}
            <Text style={styles.editSectionLabel}>Size: {editTextSize}px</Text>
            <View style={styles.editSizeRow}>
              <TouchableOpacity
                style={styles.editSizeButton}
                onPress={() => setEditTextSize(Math.max(12, editTextSize - 4))}
              >
                <MaterialIcons name="remove" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.editSizePreview}>
                <Text style={[styles.editSizePreviewText, { fontSize: Math.min(editTextSize, 32) }]}>
                  Aa
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editSizeButton}
                onPress={() => setEditTextSize(Math.min(72, editTextSize + 4))}
              >
                <MaterialIcons name="add" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Delete Button */}
            <Pressable
              style={styles.editDeleteButton}
              onPress={handleTextDelete}
            >
              <MaterialIcons name="delete" size={20} color="#ff6b6b" />
              <Text style={styles.editDeleteText}>Delete Text</Text>
            </Pressable>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowTextEditModal(false);
                  setEditingTextStroke(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButtonConfirm, !editTextValue.trim() && styles.disabledButton]}
                onPress={handleTextEditConfirm}
                disabled={!editTextValue.trim()}
              >
                <Text style={styles.modalButtonConfirmText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <Header
          title="Shared Canvas"
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
        {/* Canvas position wrapper - for button positioning */}
        <View style={styles.canvasPositioner}>
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
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setCanvasDimensions({ width, height });
            }}
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

            {/* Drawing Canvas - only renders brush strokes */}
            {wallpaperUri && (
              <View style={styles.drawingLayer}>
                <DrawingCanvas
                  strokes={strokes.filter(s => s.type !== 'text')}
                  onStrokesChange={(newStrokes) => {
                    // Merge brush strokes with existing text strokes
                    const textStrokes = strokes.filter(s => s.type === 'text');
                    handleStrokesChange([...textStrokes, ...newStrokes]);
                  }}
                  currentColor={currentColor}
                  brushSize={brushSize}
                  isEraser={selectedTool === 'eraser'}
                  isTextTool={selectedTool === 'text'}
                  onTextTap={handleTextTap}
                />

                {/* Draggable Text Elements */}
                {strokes
                  .filter((s) => s.type === 'text')
                  .map((textStroke) => (
                    <DraggableText
                      key={textStroke.id}
                      id={textStroke.id}
                      initialText={textStroke.text || ''}
                      initialX={textStroke.x || 0}
                      initialY={textStroke.y || 0}
                      initialFontSize={textStroke.fontSize || 20}
                      initialColor={textStroke.color}
                      initialRotation={textStroke.rotation || 0}
                      initialScale={textStroke.scale || 1}
                      isSelected={selectedTextId === textStroke.id}
                      onSelect={handleTextSelect}
                      onDeselect={handleTextDeselect}
                      onTextChange={handleDraggableTextChange}
                      onPositionChange={handleTextPositionChange}
                      onTransformChange={handleTextTransformChange}
                      onDelete={handleTextDeleteFromDraggable}
                      onFontSizeChange={(id, size) => {
                        const updated = strokes.map(s => s.id === id ? { ...s, fontSize: size } : s);
                        setStrokes(updated);
                      }}
                      onColorChange={(id, color) => {
                        const updated = strokes.map(s => s.id === id ? { ...s, color } : s);
                        setStrokes(updated);
                      }}
                    />
                  ))}
              </View>
            )}
          </View>

          {/* Change Background Button - OUTSIDE canvas ref so it's not captured */}
          {wallpaperUri && (
            <TouchableOpacity
              style={styles.changeBackgroundButton}
              onPress={pickWallpaperFromGallery}
            >
              <MaterialIcons name="image" size={20} color={colors.white} />
            </TouchableOpacity>
          )}

          {/* Draft Badge - OUTSIDE canvas ref so it's not captured */}
          {isDraft && strokes.length > 0 && (
            <View style={styles.draftBadge}>
              <MaterialIcons name="edit" size={12} color={colors.white} />
              <Text style={styles.draftBadgeText}>Draft</Text>
            </View>
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

      {/* Seen Status Indicator */}
      {isPaired && isSeenByPartner && drawingSeenAt && (
        <View style={styles.seenStatusContainer}>
          <MaterialIcons name="check" size={16} color={colors.success} />
          <Text style={styles.seenStatusText}>Seen {formatSeenTime(drawingSeenAt)}</Text>
        </View>
      )}

      {/* Bottom Glass Panel */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + spacing.sm }]}>
        {selectedTextStroke ? (
          // Text formatting mode
          <>
            {/* Text Size Slider - use same layout as brush slider */}
            <BrushSizeSlider
              value={selectedTextStroke.fontSize || 20}
              onValueChange={handleSelectedTextSizeChange}
              minValue={12}
              maxValue={72}
            />

            {/* Color Picker for text */}
            <View style={styles.colorPickerContainer}>
              <ColorPicker
                selectedColor={selectedTextStroke.color}
                onColorSelect={handleSelectedTextColorChange}
                onAddPress={handleAddColor}
                onDeleteColor={removeCustomColor}
                customColors={customColors}
              />
            </View>

            {/* Text Toolbar - matches ToolBar height */}
            <View style={styles.textToolbar}>
              <View style={styles.textToolsRow}>
                <TouchableOpacity
                  style={styles.textToolButton}
                  onPress={() => handleTextDeleteFromDraggable(selectedTextId!)}
                >
                  <View style={[styles.textToolIconContainer, styles.textDeleteIcon]}>
                    <MaterialIcons name="delete" size={22} color="#ff6b6b" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.textToolButton}
                  onPress={() => setSelectedTextId(null)}
                >
                  <View style={styles.textToolIconContainer}>
                    <MaterialIcons name="close" size={22} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.textDoneButton}
                onPress={() => setSelectedTextId(null)}
              >
                <Text style={styles.textDoneLabel}>Done</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Regular drawing mode
          <>
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
                onAddPress={handleAddColor}
                onDeleteColor={removeCustomColor}
                customColors={customColors}
              />
            </View>

            {/* Tool Bar */}
            <ToolBar
              selectedTool={selectedTool}
              onToolSelect={handleToolSelect}
              onUndo={undoLastStroke}
              onDone={handleDone}
              canUndo={strokes.length > 0}
              doneLabel={isPaired ? 'Send' : 'Save'}
            />
          </>
        )}
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
  canvasPositioner: {
    position: 'relative',
    width: '100%',
    maxHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  draftBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 152, 0, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    zIndex: 10,
  },
  draftBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
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
    minHeight: 200, // Fixed height to prevent layout shift when toolbar changes
  },
  seenStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: borderRadius.default,
    paddingHorizontal: spacing.md,
  },
  seenStatusText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '500',
  },
  colorPickerContainer: {
    paddingVertical: spacing.xs,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    ...typography.buttonText,
    color: colors.textSecondary,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    ...typography.buttonText,
    color: colors.white,
  },
  // Toast styles
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toastText: {
    ...typography.body,
    color: colors.white,
    flex: 1,
  },
  // Color Picker Modal styles
  colorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  colorModalContent: {
    backgroundColor: colors.cardDark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    maxHeight: '80%',
  },
  colorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  colorModalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  colorGridScroll: {
    maxHeight: 300,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
  },
  colorGridItem: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  colorGridItemWhite: {
    borderWidth: 1,
    borderColor: colors.textTertiary,
  },
  colorModalCancelButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  colorModalCancelText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  textInput: {
    backgroundColor: colors.cardDarker,
    borderRadius: borderRadius.default,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: spacing.lg,
    minHeight: 48,
    maxHeight: 120,
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Text Edit Modal styles
  textEditModalContent: {
    width: '90%',
    maxWidth: 360,
  },
  editSectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  editColorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  editColorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  editColorSelected: {
    borderColor: colors.white,
    borderWidth: 3,
  },
  editSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  editSizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardDarker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSizePreview: {
    width: 60,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSizePreviewText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  editButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: borderRadius.default,
  },
  editDeleteText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
  },
  // Text formatting toolbar styles - matches ToolBar component
  textToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  textToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textToolButton: {
    padding: spacing.xs,
  },
  textToolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textDeleteIcon: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  textDoneButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    height: 44,
    justifyContent: 'center',
  },
  textDoneLabel: {
    ...typography.buttonText,
    color: colors.white,
  },
});
