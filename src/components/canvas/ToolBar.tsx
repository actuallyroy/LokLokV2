import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';

export type Tool = 'brush' | 'eraser' | 'delete';

interface ToolBarProps {
  selectedTool: Tool;
  onToolSelect: (tool: Tool) => void;
  onUndo: () => void;
  onDone: () => void;
  canUndo: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  selectedTool,
  onToolSelect,
  onUndo,
  onDone,
  canUndo,
}) => {
  const tools: { id: Tool; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { id: 'brush', icon: 'brush' },
    { id: 'eraser', icon: 'auto-fix-high' },
    { id: 'delete', icon: 'delete-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.toolsContainer}>
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[
              styles.toolButton,
              selectedTool === tool.id && styles.selectedTool,
            ]}
            onPress={() => onToolSelect(tool.id)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={tool.icon}
              size={20}
              color={
                selectedTool === tool.id
                  ? colors.primary
                  : colors.textSecondary
              }
            />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.undoButton, !canUndo && styles.disabledButton]}
        onPress={onUndo}
        disabled={!canUndo}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="undo"
          size={20}
          color={canUndo ? colors.textPrimary : colors.textTertiary}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.doneButton} onPress={onDone} activeOpacity={0.7}>
        <MaterialIcons name="check" size={18} color={colors.white} />
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardDarker,
    borderRadius: borderRadius.full,
    padding: 4,
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTool: {
    backgroundColor: colors.cardDark,
  },
  undoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardDarker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  doneText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
});
