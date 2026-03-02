import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  Modal,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Header, Toggle, Avatar, SettingsItem } from '../components/common';
import { colors, typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettingsStore, usePairingStore } from '../store';
import { notifyPartnerOfDisconnect } from '../services/strokeSync';
import { clearEncryptionKeys } from '../services/crypto';

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const {
    autoApplyDrawings,
    notificationAlerts,
    userName,
    userAvatar,
    setAutoApplyDrawings,
    setNotificationAlerts,
    setUserName,
    setUserProfile,
  } = useSettingsStore();

  const { isPaired, partnerName, pairingId, myDeviceId, isE2EEnabled, disconnect } = usePairingStore();

  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [newName, setNewName] = useState(userName);
  const [showAutoApplyModal, setShowAutoApplyModal] = useState(false);

  const handleChangeName = useCallback(() => {
    setNewName(userName);
    setIsNameModalVisible(true);
  }, [userName]);

  const handleSaveName = useCallback(() => {
    if (newName.trim()) {
      setUserName(newName.trim());
      setIsNameModalVisible(false);
    } else {
      Alert.alert('Invalid Name', 'Please enter a valid name.');
    }
  }, [newName, setUserName]);

  const handleAutoApplyToggle = useCallback((enabled: boolean) => {
    setAutoApplyDrawings(enabled);
    if (enabled) {
      setShowAutoApplyModal(true);
    }
  }, [setAutoApplyDrawings]);

  const handleDisconnect = useCallback(async () => {
    Alert.alert(
      'Disconnect Partner',
      `Are you sure you want to disconnect from ${partnerName || 'your partner'}? You'll need to pair again to share drawings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            // Notify partner via Firebase first
            if (pairingId && myDeviceId) {
              await notifyPartnerOfDisconnect(pairingId, myDeviceId);
            }
            // Clear E2E encryption keys
            await clearEncryptionKeys();
            // Then clear local state
            disconnect();
            Alert.alert('Disconnected', 'You have been disconnected from your partner.');
          },
        },
      ]
    );
  }, [partnerName, pairingId, myDeviceId, disconnect]);

  const handleEditAvatar = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to change your avatar.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUserProfile(userName, '', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking avatar:', error);
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    }
  }, [userName, setUserProfile]);

  const handleSupport = useCallback(() => {
    Linking.openURL('mailto:support@loklok.app?subject=LokLok Support Request');
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />
      <View style={{ paddingTop: insets.top }}>
        <Header title="Settings" onBack={() => navigation.goBack()} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Avatar
            source={userAvatar || undefined}
            size={100}
            showEditBadge
            onEditPress={handleEditAvatar}
          />
          <TouchableOpacity onPress={handleChangeName} style={styles.nameContainer}>
            <Text style={styles.userName}>{userName}</Text>
            <MaterialIcons name="edit" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Partner Status */}
          {isPaired && (
            <View style={styles.partnerBadge}>
              <MaterialIcons name="favorite" size={14} color={colors.primary} />
              <Text style={styles.partnerBadgeText}>
                Paired with {partnerName || 'Partner'}
              </Text>
            </View>
          )}

          {/* E2E Encryption Status */}
          {isPaired && isE2EEnabled && (
            <View style={styles.e2eBadge}>
              <MaterialIcons name="lock" size={12} color={colors.success} />
              <Text style={styles.e2eBadgeText}>End-to-End Encrypted</Text>
            </View>
          )}

          {/* Profile Action Buttons */}
          <View style={styles.profileActions}>
            {!isPaired ? (
              <TouchableOpacity
                style={styles.profileActionButton}
                onPress={() => navigation.navigate('PairDevice')}
              >
                <MaterialIcons name="person-add" size={18} color={colors.primary} />
                <Text style={styles.profileActionText}>Pair with Partner</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.profileActionButtonDark}
                onPress={handleDisconnect}
              >
                <MaterialIcons name="link-off" size={18} color={colors.textPrimary} />
                <Text style={styles.profileActionTextDark}>Disconnect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Lockscreen Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOCKSCREEN</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="lock"
              iconColor={colors.primary}
              iconBackgroundColor="rgba(244, 71, 37, 0.15)"
              title="Auto-Apply Drawings"
              subtitle="Automatically set partner's drawings as your lockscreen"
              rightElement={
                <Toggle
                  value={autoApplyDrawings}
                  onValueChange={handleAutoApplyToggle}
                />
              }
            />
            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={16} color={colors.textTertiary} />
              <Text style={styles.infoText}>
                When enabled, drawings from your partner will automatically update your lockscreen wallpaper. You can always undo this from the canvas screen.
              </Text>
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="notifications"
              iconColor="#9C27B0"
              iconBackgroundColor="rgba(156, 39, 176, 0.15)"
              title="Drawing Alerts"
              subtitle="Get notified when your partner sends a drawing"
              rightElement={
                <Toggle
                  value={notificationAlerts}
                  onValueChange={setNotificationAlerts}
                />
              }
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="privacy-tip"
              iconColor="#FF9800"
              iconBackgroundColor="rgba(255, 152, 0, 0.15)"
              title="Privacy Policy"
              subtitle="How we handle your data"
              showChevron
              onPress={() => Linking.openURL('https://loklok.app/privacy')}
            />
            <SettingsItem
              icon="help-outline"
              iconColor="#9E9E9E"
              iconBackgroundColor="rgba(158, 158, 158, 0.15)"
              title="Support & FAQ"
              subtitle="Get help or report an issue"
              showChevron
              onPress={handleSupport}
            />
          </View>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>LokLok v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        <Text style={styles.copyrightText}>Made with love for couples</Text>
      </ScrollView>

      {/* Name Edit Modal */}
      <Modal
        visible={isNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Name</Text>
            <TextInput
              style={styles.nameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setIsNameModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSaveName}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Auto-Apply Info Modal */}
      <Modal
        visible={showAutoApplyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAutoApplyModal(false)}
      >
        <View style={styles.autoApplyModalOverlay}>
          <View style={styles.autoApplyModalContent}>
            {/* Icon */}
            <View style={styles.autoApplyIconContainer}>
              <MaterialIcons name="auto-awesome" size={32} color={colors.primary} />
            </View>

            {/* Title */}
            <Text style={styles.autoApplyTitle}>Auto-Apply Enabled</Text>

            {/* Description */}
            <Text style={styles.autoApplyDescription}>
              Your lockscreen will now automatically update whenever your partner sends you a new drawing.
            </Text>

            {/* Hint */}
            <View style={styles.autoApplyHintContainer}>
              <MaterialIcons name="info-outline" size={16} color={colors.textTertiary} />
              <Text style={styles.autoApplyHint}>
                You can disable this anytime from settings
              </Text>
            </View>

            {/* Button */}
            <TouchableOpacity
              style={styles.autoApplyButton}
              onPress={() => setShowAutoApplyModal(false)}
            >
              <Text style={styles.autoApplyButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  userName: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(244, 71, 37, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  partnerBadgeText: {
    ...typography.caption,
    color: colors.primary,
  },
  e2eBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  e2eBadgeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  profileActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  profileActionText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
  profileActionButtonDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardDark,
  },
  profileActionTextDark: {
    ...typography.buttonSmall,
    color: colors.textPrimary,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  sectionContent: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.default,
    padding: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.textTertiary,
    flex: 1,
    lineHeight: 18,
  },
  versionText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  copyrightText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
    opacity: 0.6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  modalContent: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.default,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  nameInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.cardDarker,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardDarker,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    ...typography.buttonSmall,
    color: colors.textSecondary,
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalButtonSaveText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  // Auto-Apply Modal Styles
  autoApplyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  autoApplyModalContent: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 71, 37, 0.3)',
  },
  autoApplyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244, 71, 37, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  autoApplyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  autoApplyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  autoApplyHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xl,
  },
  autoApplyHint: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  autoApplyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.full,
    width: '100%',
    alignItems: 'center',
  },
  autoApplyButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
