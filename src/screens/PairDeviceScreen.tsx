import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRCodeStyled from 'react-native-qrcode-styled';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { MaterialIcons } from '@expo/vector-icons';
import { Header, Button } from '../components/common';
import { colors, typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePairingStore, useSettingsStore } from '../store';

type PairDeviceScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PairDevice'
>;

interface PairDeviceScreenProps {
  navigation: PairDeviceScreenNavigationProp;
}

export const PairDeviceScreen: React.FC<PairDeviceScreenProps> = ({
  navigation,
}) => {
  const { isPaired, partnerName, disconnect } = usePairingStore();
  const { hasCompletedOnboarding, setOnboardingComplete } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const viewShotRef = useRef<ViewShot>(null);

  // Generate a unique pairing code (in real app, this would come from backend)
  const pairingCode = useMemo(() => {
    const code = `loklok://pair/${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
    return code;
  }, []);

  const handleScanCode = () => {
    navigation.navigate('QRScanner');
  };

  const handleSkip = () => {
    setOnboardingComplete();
    navigation.navigate('SharedCanvas');
  };

  const handleShareQR = async () => {
    if (!viewShotRef.current) return;

    try {
      // Capture the styled QR view
      const uri = await viewShotRef.current.capture?.();

      if (!uri) {
        Alert.alert('Error', 'Failed to capture QR code');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your LokLok pairing code',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      `Are you sure you want to disconnect from ${partnerName || 'your partner'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => disconnect(),
        },
      ]
    );
  };

  const handleSaveToGallery = async () => {
    if (!viewShotRef.current) return;

    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to save images to your gallery.'
        );
        return;
      }

      // Capture the styled QR view
      const uri = await viewShotRef.current.capture?.();

      if (!uri) {
        Alert.alert('Error', 'Failed to capture QR code');
        return;
      }

      // Save to gallery
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'QR code saved to your gallery.');
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />

      <View style={{ paddingTop: insets.top }}>
        <Header title="Pair Device" onBack={() => navigation.goBack()} />
      </View>

      <View style={styles.content}>
        {/* Heading */}
        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Connect with your{'\n'}partner</Text>
          <Text style={styles.subheading}>
            Have your partner scan this QR code{'\n'}
            to connect your devices instantly.
          </Text>
        </View>

        {/* QR Code Card */}
        {!isPaired && (
          <View style={styles.qrContainer}>
            <View style={styles.qrCard}>
              <QRCodeStyled
                data={pairingCode}
                style={{ backgroundColor: 'white' }}
                padding={16}
                pieceSize={6}
                pieceBorderRadius={3}
                pieceCornerType="rounded"
                isPiecesGlued={true}
                color={colors.backgroundDark}
              />
              {/* Rounded logo overlay */}
              <View style={styles.logoOverlay}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logoImage}
                />
              </View>
            </View>
            <Text style={styles.qrHint}>Your pairing code</Text>

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleSaveToGallery}>
                <MaterialIcons name="save-alt" size={20} color={colors.primary} />
                <Text style={styles.actionButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleShareQR}>
                <MaterialIcons name="share" size={20} color={colors.primary} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Paired Status */}
        {isPaired && (
          <View style={styles.pairedContainer}>
            <View style={styles.pairedHeader}>
              <MaterialIcons name="link" size={24} color={colors.primary} />
              <Text style={styles.pairedTitle}>Connected</Text>
            </View>
            <Text style={styles.pairedText}>
              You're paired with {partnerName || 'Partner'}
            </Text>
            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <MaterialIcons name="link-off" size={18} color={colors.error || '#FF4444'} />
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Buttons */}
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + spacing.xxxl }]}>
          <Button
            title={isPaired ? "Start Drawing" : "Scan Partner's Code"}
            onPress={isPaired ? () => navigation.navigate('SharedCanvas') : handleScanCode}
            variant="primary"
            icon={isPaired ? "brush" : "qr-code-scanner"}
            iconPosition="left"
          />
          {!hasCompletedOnboarding && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Hidden shareable QR view */}
      <View style={styles.hiddenContainer}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
        >
          <View style={styles.shareableCard}>
            {/* Header with logo and branding */}
            <View style={styles.shareableHeader}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.shareableLogo}
              />
              <Text style={styles.shareableBrand}>LokLok</Text>
            </View>

            {/* QR Code */}
            <View style={styles.shareableQrWrapper}>
              <QRCodeStyled
                data={pairingCode}
                style={{ backgroundColor: 'white' }}
                padding={12}
                pieceSize={5}
                pieceBorderRadius={2.5}
                pieceCornerType="rounded"
                isPiecesGlued={true}
                color={colors.backgroundDark}
              />
              <View style={styles.shareableLogoOverlay}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.shareableLogoSmall}
                />
              </View>
            </View>

            {/* Instructions */}
            <Text style={styles.shareableTitle}>Scan to connect with me</Text>
            <Text style={styles.shareableSubtitle}>
              Open LokLok app and scan this code{'\n'}to start drawing together
            </Text>
          </View>
        </ViewShot>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  headingContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  heading: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subheading: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCard: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    width: 200 + spacing.xl * 2,
    height: 200 + spacing.xl * 2,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOverlay: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  qrHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.lg,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
  pairedContainer: {
    backgroundColor: colors.cardDark,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  pairedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pairedTitle: {
    ...typography.h4,
    color: colors.primary,
  },
  pairedText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.error || '#FF4444',
  },
  disconnectButtonText: {
    ...typography.buttonSmall,
    color: colors.error || '#FF4444',
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {},
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  skipText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  // Shareable card styles
  hiddenContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  shareableCard: {
    backgroundColor: colors.white,
    paddingVertical: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    width: 320,
  },
  shareableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  shareableLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: spacing.sm,
  },
  shareableBrand: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.backgroundDark,
  },
  shareableQrWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.backgroundDark,
  },
  shareableLogoOverlay: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareableLogoSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  shareableTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.backgroundDark,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  shareableSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
