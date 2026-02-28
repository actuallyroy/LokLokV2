import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePairingStore, useSettingsStore } from '../store';
import { createPairing } from '../services/strokeSync';
import { registerForPushNotifications } from '../services/notifications';
import { getDeviceId, saveDeviceId } from '../services/backgroundTask';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

type QRScannerScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'QRScanner'
>;

interface QRScannerScreenProps {
  navigation: QRScannerScreenNavigationProp;
}

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({
  navigation,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const insets = useSafeAreaInsets();
  const { setPaired } = usePairingStore();
  const { setOnboardingComplete, userName } = useSettingsStore();

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const processScannedData = async (data: string) => {
    setIsProcessing(true);

    try {
      // Try to parse as JSON (new format)
      const parsed = JSON.parse(data);

      if (parsed.type === 'loklok_pair' && parsed.deviceId) {
        // Get my device info
        let myDeviceId = await getDeviceId();
        if (!myDeviceId) {
          myDeviceId = `device_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
          await saveDeviceId(myDeviceId);
        }
        const myFcmToken = await registerForPushNotifications();

        // Create pairing in Firebase
        const pairingId = await createPairing(
          myDeviceId,
          myFcmToken || '',
          userName || 'Partner',
          parsed.deviceId,
          parsed.fcmToken || '',
          parsed.userName || 'Partner'
        );

        if (pairingId) {
          // Store pairing locally
          setPaired(
            pairingId,
            parsed.userName || 'Partner',
            parsed.deviceId,
            parsed.fcmToken
          );
          setOnboardingComplete();

          Alert.alert(
            'Pairing Successful!',
            `You are now connected with ${parsed.userName || 'your partner'}.`,
            [
              {
                text: 'Start Drawing',
                onPress: () => navigation.replace('SharedCanvas'),
              },
            ]
          );
        } else {
          throw new Error('Failed to create pairing');
        }
      } else {
        throw new Error('Invalid QR format');
      }
    } catch (error) {
      console.error('Error processing QR code:', error);

      // Check for old format (backwards compatibility)
      if (data.startsWith('loklok://pair/')) {
        Alert.alert(
          'Outdated QR Code',
          'This QR code is from an older version. Please ask your partner to update their app and generate a new QR code.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      } else {
        Alert.alert(
          'Invalid QR Code',
          'This doesn\'t appear to be a LokLok pairing code. Please scan your partner\'s QR code.',
          [{ text: 'Try Again', onPress: () => setScanned(false) }]
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarCodeScanned = ({ data }: BarCodeScannerResult) => {
    if (scanned) return;
    setScanned(true);
    processScannedData(data);
  };

  const handleScanFromGallery = async () => {
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to scan QR codes from images.'
        );
        return;
      }

      // Pick an image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Scan the image for barcodes
        const scannedResults = await BarCodeScanner.scanFromURLAsync(imageUri, [
          BarCodeScanner.Constants.BarCodeType.qr,
        ]);

        if (scannedResults && scannedResults.length > 0) {
          setScanned(true);
          processScannedData(scannedResults[0].data);
        } else {
          Alert.alert(
            'No QR Code Found',
            'Could not find a QR code in the selected image. Please try another image.'
          );
        }
      }
    } catch (error) {
      console.error('Error scanning from gallery:', error);
      Alert.alert('Error', 'Failed to scan the image. Please try again.');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />
        <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
          <MaterialIcons name="camera-alt" size={64} color={colors.textTertiary} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan your partner's QR code
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              const { status } = await BarCodeScanner.requestPermissionsAsync();
              setHasPermission(status === 'granted');
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryButtonAlt}
            onPress={handleScanFromGallery}
          >
            <MaterialIcons name="photo-library" size={20} color={colors.primary} />
            <Text style={styles.galleryButtonAltText}>Scan from Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButtonAlt}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonAltText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top overlay */}
        <View style={[styles.overlaySection, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Scan Partner's Code</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Middle section with scan area */}
        <View style={styles.middleSection}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanArea}>
            {/* Corner indicators */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>

        {/* Bottom overlay */}
        <View style={[styles.overlaySection, styles.bottomOverlay, { paddingBottom: insets.bottom }]}>
          <Text style={styles.hint}>
            {isProcessing ? 'Setting up connection...' : 'Point your camera at your partner\'s QR code'}
          </Text>

          {/* Gallery Button */}
          {!isProcessing && (
            <TouchableOpacity style={styles.galleryButton} onPress={handleScanFromGallery}>
              <MaterialIcons name="photo-library" size={24} color={colors.white} />
              <Text style={styles.galleryButtonText}>Scan from Gallery</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>Connecting with partner...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  middleSection: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  bottomOverlay: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.xxl,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
  },
  title: {
    ...typography.h4,
    color: colors.white,
  },
  hint: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.8,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  galleryButtonText: {
    ...typography.button,
    color: colors.white,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  permissionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  permissionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  permissionButtonText: {
    ...typography.button,
    color: colors.white,
  },
  galleryButtonAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  galleryButtonAltText: {
    ...typography.body,
    color: colors.primary,
  },
  backButtonAlt: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButtonAltText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  processingText: {
    ...typography.h4,
    color: colors.white,
  },
});
