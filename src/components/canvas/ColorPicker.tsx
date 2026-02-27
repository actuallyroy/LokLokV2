import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  availableColors?: string[];
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  availableColors = colors.canvasColors,
}) => {
  return (
    <View style={styles.container}>
      {availableColors.map((color) => (
        <TouchableOpacity
          key={color}
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

      {/* Add color button */}
      <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
        <MaterialIcons name="add" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
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
