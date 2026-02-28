import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onAddPress?: () => void;
  onDeleteColor?: (color: string) => void;
  availableColors?: string[];
  customColors?: string[];
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  onAddPress,
  onDeleteColor,
  availableColors = colors.canvasColors,
  customColors = [],
}) => {
  const handleLongPress = (color: string, isCustom: boolean) => {
    if (!isCustom || !onDeleteColor) return;

    Alert.alert(
      'Remove Color',
      'Do you want to remove this color from your palette?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDeleteColor(color),
        },
      ]
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Default colors */}
      {availableColors.map((color, index) => (
        <TouchableOpacity
          key={`default-${color}-${index}`}
          style={[
            styles.colorButton,
            { backgroundColor: color },
            selectedColor === color && styles.selectedColor,
          ]}
          onPress={() => onColorSelect(color)}
          activeOpacity={0.7}
        >
          {selectedColor === color && (
            <View style={styles.checkmark}>
              <MaterialIcons name="check" size={16} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>
      ))}

      {/* Custom colors with long press to delete */}
      {customColors.map((color, index) => (
        <TouchableOpacity
          key={`custom-${color}-${index}`}
          style={[
            styles.colorButton,
            styles.customColorButton,
            { backgroundColor: color },
            selectedColor === color && styles.selectedColor,
          ]}
          onPress={() => onColorSelect(color)}
          onLongPress={() => handleLongPress(color, true)}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          {selectedColor === color && (
            <View style={styles.checkmark}>
              <MaterialIcons name="check" size={16} color={colors.white} />
            </View>
          )}
          {/* Small dot indicator for custom colors */}
          <View style={styles.customIndicator} />
        </TouchableOpacity>
      ))}

      {/* Add color button */}
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={onAddPress}
      >
        <MaterialIcons name="add" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: colors.white,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customColorButton: {
    position: 'relative',
  },
  customIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.cardDark,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
