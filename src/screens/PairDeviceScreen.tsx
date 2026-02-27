import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header, Button } from '../components/common';
import { StatusCard } from '../components/pairing';
import { colors, typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePairingStore } from '../store';

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

  const handleShowQRCode = () => {
    // Navigate to QR code display or show modal
    console.log('Show QR Code');
  };

  const handleScanCode = () => {
    // Navigate to QR scanner
    console.log('Scan Partner Code');
    // For demo, navigate to canvas
    navigation.navigate('SharedCanvas');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Pair Device" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* Heading */}
        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Connect with your{'\n'}partner</Text>
          <Text style={styles.subheading}>
            Draw on each other's lock screens{'\n'}
            instantly. Pair your devices to start sharing{'\n'}
            doodles.
          </Text>
        </View>

        {/* Status Card */}
        <View style={styles.cardContainer}>
          <StatusCard isPaired={isPaired} partnerName={partnerName || undefined} />
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Show My QR Code"
            onPress={handleShowQRCode}
            variant="primary"
            icon="qr-code"
            iconPosition="left"
          />
          <View style={styles.buttonSpacer} />
          <Button
            title="Scan Partner's Code"
            onPress={handleScanCode}
            variant="secondary"
            icon="qr-code-scanner"
            iconPosition="left"
          />
        </View>
      </View>
    </SafeAreaView>
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
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
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
  cardContainer: {
    marginBottom: spacing.xxl,
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    paddingBottom: spacing.xxxl,
  },
  buttonSpacer: {
    height: spacing.md,
  },
});
