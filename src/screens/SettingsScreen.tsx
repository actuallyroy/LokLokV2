import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header, Toggle, Avatar, SettingsItem } from '../components/common';
import { colors, typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettingsStore, usePairingStore, BrushStyle } from '../store';

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

const brushStyles: { id: BrushStyle; label: string }[] = [
  { id: 'neon', label: 'Neon Glow' },
  { id: 'solid', label: 'Solid' },
  { id: 'pencil', label: 'Pencil' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  navigation,
}) => {
  const {
    autoApplyDrawings,
    notificationAlerts,
    defaultBrushStyle,
    defaultInkColor,
    userName,
    userEmail,
    userAvatar,
    setAutoApplyDrawings,
    setNotificationAlerts,
    setDefaultBrushStyle,
  } = useSettingsStore();

  const { isPaired, partnerName, disconnect } = usePairingStore();

  const handleAutoApplyToggle = useCallback((enabled: boolean) => {
    setAutoApplyDrawings(enabled);
    if (enabled) {
      Alert.alert(
        'Auto-Apply Enabled',
        'When your partner sends a drawing, it will automatically be set as your lockscreen wallpaper.',
        [{ text: 'OK' }]
      );
    }
  }, [setAutoApplyDrawings]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect Partner',
      `Are you sure you want to disconnect from ${partnerName || 'your partner'}? You'll need to pair again to share drawings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            disconnect();
            Alert.alert('Disconnected', 'You have been disconnected from your partner.');
          },
        },
      ]
    );
  }, [partnerName, disconnect]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            console.log('Logging out...');
            // TODO: Implement logout
          },
        },
      ]
    );
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

          {/* Partner Status */}
          {isPaired && (
            <View style={styles.partnerBadge}>
              <MaterialIcons name="favorite" size={14} color={colors.primary} />
              <Text style={styles.partnerBadgeText}>
                Paired with {partnerName || 'Partner'}
              </Text>
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
            <TouchableOpacity style={styles.profileActionButtonDark}>
              <MaterialIcons name="share" size={18} color={colors.textPrimary} />
              <Text style={styles.profileActionTextDark}>Share Profile</Text>
            </TouchableOpacity>
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

        {/* Drawing Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DRAWING TOOLS</Text>
          <View style={styles.sectionContent}>
            <View style={styles.brushStyleHeader}>
              <View style={styles.brushStyleIconContainer}>
                <MaterialIcons name="brush" size={20} color={colors.primary} />
              </View>
              <Text style={styles.brushStyleTitle}>Default Brush Style</Text>
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
              subtitle="Manage your account settings"
              showChevron
              onPress={() => console.log('Account management')}
            />
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
              onPress={() => console.log('Support')}
            />
            <SettingsItem
              icon="logout"
              iconColor={colors.primary}
              iconBackgroundColor="rgba(244, 71, 37, 0.15)"
              title="Log Out"
              onPress={handleLogout}
            />
          </View>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>LokLok v1.0.0</Text>
        <Text style={styles.copyrightText}>Made with love for couples</Text>
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
  copyrightText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
    opacity: 0.6,
  },
});
