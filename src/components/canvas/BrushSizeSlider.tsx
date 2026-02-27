import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, typography, spacing } from '../../theme';

interface BrushSizeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
}

export const BrushSizeSlider: React.FC<BrushSizeSliderProps> = ({
  value,
  onValueChange,
  minValue = 1,
  maxValue = 50,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>BRUSH SIZE</Text>
      <View style={styles.sliderRow}>
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            value={value}
            onValueChange={onValueChange}
            minimumValue={minValue}
            maximumValue={maxValue}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
            thumbTintColor={colors.white}
          />
        </View>
        <Text style={styles.valueText}>{Math.round(value)}px</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  valueText: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    width: 50,
    textAlign: 'right',
  },
});
