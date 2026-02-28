import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import QRCodeStyled from 'react-native-qrcode-styled';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
  const { isPaired, partnerName } = usePairingStore();
  const { hasCompletedOnboarding, setOnboardingComplete } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const qrRef = useRef<any>(null);

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
    if (!qrRef.current) return;

    try {
      // Get base64 data from QR code
      qrRef.current.toDataURL(async (dataURL: string) => {
        // Save to temp file
        const filename = `${FileSystem.cacheDirectory}loklok-pairing-qr.png`;
        await FileSystem.writeAsStringAsync(filename, dataURL, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(filename, {
            mimeType: 'image/png',
            dialogTitle: 'Share your LokLok pairing code',
          });
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert('Error', 'Failed to share QR code');
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
              {/* Hidden QR for sharing */}
              <View style={{ position: 'absolute', opacity: 0 }}>
                <QRCode
                  value={pairingCode}
                  size={200}
                  getRef={(ref) => (qrRef.current = ref)}
                  ecl="H"
                />
              </View>
            </View>
            <Text style={styles.qrHint}>Your pairing code</Text>

            {/* Share Button */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShareQR}>
              <MaterialIcons name="share" size={20} color={colors.primary} />
              <Text style={styles.shareButtonText}>Share QR Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Paired Status */}
        {isPaired && (
          <View style={styles.pairedContainer}>
            <Text style={styles.pairedText}>
              Connected with {partnerName || 'Partner'}
            </Text>
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Buttons */}
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + spacing.xxxl }]}>
          <Button
            title="Scan Partner's Code"
            onPress={handleScanCode}
            variant="primary"
            icon="qr-code-scanner"
            iconPosition="left"
          />
          {!hasCompletedOnboarding && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  shareButtonText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
  pairedContainer: {
    backgroundColor: colors.cardDark,
    padding: spacing.xl,
    borderRadius: borderRadius.default,
    alignItems: 'center',
  },
  pairedText: {
    ...typography.body,
    color: colors.primary,
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
});
