import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/common';
import { colors, typography, spacing, borderRadius } from '../theme';
import { RootStackParamList } from '../navigation/AppNavigator';

// Import carousel images
const drawTogetherImage = require('../../assets/draw_together.png');
const stayConnectedImage = require('../../assets/stay_connected.png');
const expressYourselfImage = require('../../assets/express_yourself.png');

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

interface CarouselSlide {
  id: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
}

const slides: CarouselSlide[] = [
  {
    id: '1',
    title: 'Draw Together',
    description:
      'Draw on your lock screen, see it on theirs.\nStay connected with friends and loved\nones in the most creative way.',
    image: drawTogetherImage,
  },
  {
    id: '2',
    title: 'Stay Connected',
    description:
      'Send doodles, notes, and little messages\nto your partner anytime. They\'ll see it\nthe moment they wake their phone.',
    image: stayConnectedImage,
  },
  {
    id: '3',
    title: 'Express Yourself',
    description:
      'Choose from vibrant colors and brush styles.\nMake every drawing unique and personal.\nYour creativity, their smile.',
    image: expressYourselfImage,
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    navigation.navigate('PairDevice');
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentPage && page >= 0 && page < slides.length) {
      setCurrentPage(page);
    }
  };

  const handleDotPress = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentPage(index);
  };

  const renderSlide = ({ item }: { item: CarouselSlide }) => (
    <View style={styles.slideContainer}>
      {/* Hero Image */}
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />

      {/* Logo Header - with safe area padding */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerSpacer} />
        <View style={styles.logoContainer}>
          <MaterialIcons name="brush" size={24} color={colors.primary} />
          <Text style={styles.logoText}>LokLok</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <MaterialIcons name="settings" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.carousel}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleDotPress(index)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View
              style={[
                styles.dot,
                currentPage === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Button */}
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + spacing.xxxl }]}>
        <Button
          title={currentPage === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={
            currentPage === slides.length - 1
              ? handleGetStarted
              : () => handleDotPress(currentPage + 1)
          }
          icon="arrow-forward"
          iconPosition="right"
        />
      </View>
    </View>
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
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  headerSpacer: {
    width: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carousel: {
    flex: 1,
  },
  slideContainer: {
    width: SCREEN_WIDTH,
  },
  imageContainer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  heroImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: borderRadius.default,
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
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
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
  },
});
