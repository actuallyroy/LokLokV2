import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/common';
import { colors, typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - spacing.xxl * 2;
const IMAGE_HEIGHT = IMAGE_WIDTH * (5 / 4); // 4:5 aspect ratio

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavigationProp;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [currentPage, setCurrentPage] = useState(0);

  const handleGetStarted = () => {
    navigation.navigate('PairDevice');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo Header */}
      <View style={styles.header}>
        <MaterialIcons name="brush" size={24} color={colors.primary} />
        <Text style={styles.logoText}>LokLok</Text>
      </View>

      {/* Hero Image Placeholder */}
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <MaterialIcons name="image" size={64} color={colors.textTertiary} />
          <Text style={styles.placeholderText}>Hero Image</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Draw Together</Text>
        <Text style={styles.description}>
          Draw on your lock screen, see it on theirs.{'\n'}
          Stay connected with friends and loved{'\n'}
          ones in the most creative way.
        </Text>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentPage === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <Button
          title="Get Started"
          onPress={handleGetStarted}
          icon="arrow-forward"
          iconPosition="right"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  logoText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  imageContainer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  imagePlaceholder: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotInactive: {
    backgroundColor: colors.textTertiary,
  },
  buttonContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
});
