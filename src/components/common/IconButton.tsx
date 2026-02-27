import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../theme';

interface IconButtonProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  disabled?: boolean;
  variant?: 'default' | 'filled' | 'outline';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 24,
  color = colors.textPrimary,
  backgroundColor,
  style,
  disabled = false,
  variant = 'default',
}) => {
  const getContainerStyle = (): ViewStyle => {
    const baseSize = size + 16;
    const base: ViewStyle = {
      width: baseSize,
      height: baseSize,
      borderRadius: baseSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
    };

    switch (variant) {
      case 'filled':
        return {
          ...base,
          backgroundColor: backgroundColor || colors.cardDark,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: backgroundColor || colors.cardDark,
        };
      default:
        return {
          ...base,
          backgroundColor: backgroundColor || 'transparent',
        };
    }
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <MaterialIcons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
