import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../../theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const translateX = React.useRef(new Animated.Value(value ? 22 : 2)).current;

  React.useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 22 : 2,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [value, translateX]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => !disabled && onValueChange(!value)}
      style={[
        styles.container,
        value ? styles.containerActive : styles.containerInactive,
        disabled && styles.disabled,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          { transform: [{ translateX }] },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 51,
    height: 31,
    borderRadius: 16,
    justifyContent: 'center',
    padding: 2,
  },
  containerActive: {
    backgroundColor: colors.primary,
  },
  containerInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
