import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface StatusCardProps {
  isPaired: boolean;
  partnerName?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  isPaired,
  partnerName,
}) => {
  return (
    <View style={styles.container}>
      {/* Icon container with glow effect */}
      <View style={styles.iconOuterGlow}>
        <View style={styles.iconInnerGlow}>
          <View style={styles.iconContainer}>
            <MaterialIcons
              name={isPaired ? 'link' : 'link-off'}
              size={48}
              color={colors.primary}
            />
          </View>
        </View>
      </View>

      {/* Status badge */}
      <View
        style={[
          styles.badge,
          isPaired ? styles.badgePaired : styles.badgeNotPaired,
        ]}
      >
        <View
          style={[
            styles.statusDot,
            isPaired ? styles.dotPaired : styles.dotNotPaired,
          ]}
        />
        <Text
          style={[
            styles.badgeText,
            isPaired ? styles.textPaired : styles.textNotPaired,
          ]}
        >
          {isPaired ? 'Paired' : 'Not Paired'}
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        {isPaired
          ? `Connected with ${partnerName || 'Partner'}`
          : 'Scan a code to link devices'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.default,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  iconOuterGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(244, 71, 37, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconInnerGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(244, 71, 37, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244, 71, 37, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  badgePaired: {
    backgroundColor: colors.badgeGreen,
  },
  badgeNotPaired: {
    backgroundColor: colors.badgeRed,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  dotPaired: {
    backgroundColor: colors.success,
  },
  dotNotPaired: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    ...typography.labelSmall,
  },
  textPaired: {
    color: colors.success,
  },
  textNotPaired: {
    color: colors.primary,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
});
