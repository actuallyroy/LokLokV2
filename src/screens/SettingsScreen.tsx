import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header, Toggle, Avatar, SettingsItem } from '../components/common';
import { colors, typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettingsStore, BrushStyle } from '../store';
import { LockScreen } from '../modules';

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

const brushStyles: { id: BrushStyle; label: string; icon: 'neon' | 'solid' | 'dotted' }[] = [
  { id: 'neon', label: 'Neon Glow', icon: 'neon' },
  { id: 'solid', label: 'Solid', icon: 'solid' },
  { id: 'pencil', label: 'Pencil', icon: 'dotted' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  navigation,
}) => {
  const {
    lockScreenOverlay,
    notificationAlerts,
    defaultBrushStyle,
    defaultInkColor,
    userName,
    userEmail,
    userAvatar,
    setLockScreenOverlay,
    setNotificationAlerts,
    setDefaultBrushStyle,
  } = useSettingsStore();

  const [isServiceRunning, setIsServiceRunning] = useState(false);

  // Check service status on mount
  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = useCallback(async () => {
    if (Platform.OS === 'android') {
      const running = await LockScreen.isServiceRunning();
      setIsServiceRunning(running);
    }
  }, []);

  const handleLockScreenToggle = useCallback(async (enabled: boolean) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Lock screen overlay is only available on Android');
      return;
    }

    try {
      if (enabled) {
        // Check permission first
        const hasPermission = await LockScreen.checkOverlayPermission();

        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'LokLok needs permission to display over other apps to show drawings on your lock screen.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Grant Permission',
                onPress: async () => {
                  await LockScreen.requestOverlayPermission();
                  // User will need to manually enable and come back
                  Alert.alert(
                    'Enable Permission',
                    'Please enable "Display over other apps" for LokLok, then come back and try again.'
                  );
                },
              },
            ]
          );
          return;
        }

        // Start the service
        await LockScreen.startService();
        setIsServiceRunning(true);
        setLockScreenOverlay(true);
      } else {
        // Stop the service
        await LockScreen.stopService();
        setIsServiceRunning(false);
        setLockScreenOverlay(false);
      }
    } catch (error) {
      console.error('Error toggling lock screen:', error);
      Alert.alert('Error', 'Failed to toggle lock screen overlay');
    }
  }, [setLockScreenOverlay]);

  const handleTestLockScreen = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      await LockScreen.showLockScreen();
    } catch (error) {
      console.error('Error showing lock screen:', error);
    }
  }, []);

  const renderBrushStylePreview = (style: BrushStyle, isSelected: boolean) => {
    return (
      <View
        style={[
          styles.brushStyleItem,
          isSelected && styles.brushStyleItemSelected,
        ]}
      >
        <View style={styles.brushPreviewContainer}>
          {style === 'neon' && (
            <View style={styles.neonBrushPreview}>
              <View style={styles.neonBrushLine} />
            </View>
          )}
          {style === 'solid' && (
            <View style={styles.solidBrushPreview}>
              <View style={styles.solidBrushLine} />
            </View>
          )}
          {style === 'pencil' && (
            <View style={styles.pencilBrushPreview}>
              {[...Array(7)].map((_, i) => (
                <View key={i} style={styles.pencilDot} />
              ))}
            </View>
          )}
        </View>
        <Text style={[styles.brushStyleLabel, isSelected && styles.brushStyleLabelSelected]}>
          {brushStyles.find((b) => b.id === style)?.label}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Settings" onBack={() => navigation.goBack()} />

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
            onEditPress={() => console.log('Edit avatar')}
          />
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>

          {/* Profile Action Buttons */}
          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.profileActionButton}>
              <MaterialIcons name="person-add" size={18} color={colors.primary} />
              <Text style={styles.profileActionText}>Invite Partner</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileActionButtonDark}>
              <MaterialIcons name="share" size={18} color={colors.textPrimary} />
              <Text style={styles.profileActionTextDark}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GENERAL</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="fit-screen"
              title="Lock Screen Overlay"
              subtitle={isServiceRunning ? "Service running" : "Show drawings on wake"}
              rightElement={
                <Toggle
                  value={lockScreenOverlay}
                  onValueChange={handleLockScreenToggle}
                />
              }
            />
            {Platform.OS === 'android' && lockScreenOverlay && (
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleTestLockScreen}
              >
                <Text style={styles.testButtonText}>Test Lock Screen</Text>
              </TouchableOpacity>
            )}
            <SettingsItem
              icon="notifications"
              iconColor="#9C27B0"
              iconBackgroundColor="rgba(156, 39, 176, 0.15)"
              title="Notification Alerts"
              subtitle="Notify when partner draws"
              rightElement={
                <Toggle
                  value={notificationAlerts}
                  onValueChange={setNotificationAlerts}
                />
              }
            />
          </View>
        </View>

        {/* Drawing Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DRAWING TOOLS</Text>
          <View style={styles.sectionContent}>
            <View style={styles.brushStyleHeader}>
              <View style={styles.brushStyleIconContainer}>
                <MaterialIcons name="brush" size={20} color={colors.primary} />
              </View>
              <Text style={styles.brushStyleTitle}>Default Brush Style</Text>
              <TouchableOpacity>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Brush Style Options */}
            <View style={styles.brushStyleOptions}>
              {brushStyles.map((style) => (
                <TouchableOpacity
                  key={style.id}
                  onPress={() => setDefaultBrushStyle(style.id)}
                  activeOpacity={0.7}
                >
                  {renderBrushStylePreview(style.id, defaultBrushStyle === style.id)}
                </TouchableOpacity>
              ))}
            </View>

            <SettingsItem
              icon="palette"
              iconColor="#4CAF50"
              iconBackgroundColor="rgba(76, 175, 80, 0.15)"
              title="Default Ink Color"
              rightElement={
                <View style={styles.colorPreviewRow}>
                  <View
                    style={[
                      styles.colorPreview,
                      { backgroundColor: defaultInkColor },
                    ]}
                  />
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={colors.textTertiary}
                  />
                </View>
              }
              onPress={() => console.log('Select default color')}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="manage-accounts"
              iconColor="#2196F3"
              iconBackgroundColor="rgba(33, 150, 243, 0.15)"
              title="Account Management"
              showChevron
              onPress={() => console.log('Account management')}
            />
            <SettingsItem
              icon="help-outline"
              iconColor="#9E9E9E"
              iconBackgroundColor="rgba(158, 158, 158, 0.15)"
              title="Support & FAQ"
              showChevron
              onPress={() => console.log('Support')}
            />
            <SettingsItem
              icon="logout"
              iconColor={colors.primary}
              iconBackgroundColor="rgba(244, 71, 37, 0.15)"
              title="Log Out"
              onPress={() => console.log('Log out')}
            />
          </View>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Version 2.4.0 (Build 302)</Text>
      </ScrollView>
    </SafeAreaView>
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
    marginTop: spacing.lg,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
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
  testButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    marginLeft: 52,
  },
  testButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  brushStyleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brushStyleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(244, 71, 37, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  brushStyleTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  editText: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  brushStyleOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  brushStyleItem: {
    flex: 1,
    backgroundColor: colors.cardDarker,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  brushStyleItemSelected: {
    borderColor: colors.primary,
  },
  brushPreviewContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  neonBrushPreview: {
    width: '100%',
    height: 20,
    justifyContent: 'center',
  },
  neonBrushLine: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  solidBrushPreview: {
    width: '100%',
    height: 20,
    justifyContent: 'center',
  },
  solidBrushLine: {
    height: 6,
    backgroundColor: colors.textSecondary,
    borderRadius: 3,
  },
  pencilBrushPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pencilDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
  },
  brushStyleLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  brushStyleLabelSelected: {
    color: colors.primary,
  },
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  versionText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
