import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface AvatarProps {
  source?: string;
  size?: number;
  showEditBadge?: boolean;
  onEditPress?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  size = 100,
  showEditBadge = false,
  onEditPress,
}) => {
  const borderWidth = 3;
  const innerSize = size - borderWidth * 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Gradient border simulation using primary color */}
      <View
        style={[
          styles.gradientBorder,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <View
          style={[
            styles.innerContainer,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          {source ? (
            <Image
              source={{ uri: source }}
              style={[
                styles.image,
                {
                  width: innerSize,
                  height: innerSize,
                  borderRadius: innerSize / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.placeholder,
                {
                  width: innerSize,
                  height: innerSize,
                  borderRadius: innerSize / 2,
                },
              ]}
            >
              <MaterialIcons
                name="person"
                size={innerSize * 0.5}
                color={colors.textTertiary}
              />
            </View>
          )}
        </View>
      </View>

      {showEditBadge && (
        <TouchableOpacity
          style={styles.editBadge}
          onPress={onEditPress}
          activeOpacity={0.7}
        >
          <MaterialIcons name="edit" size={14} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  gradientBorder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.backgroundDark,
  },
});
