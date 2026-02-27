import { TextStyle, Platform } from 'react-native';

// Plus Jakarta Sans font family - will use system fonts as fallback
// To use custom fonts, add the .ttf files to src/assets/fonts/ and load them in App.tsx
export const fontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  semiBold: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
};

// Font weights to use with system fonts
const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

export const typography: Record<string, TextStyle> = {
  // Headings
  h1: {
    fontWeight: fontWeights.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontWeight: fontWeights.bold,
    fontSize: 28,
    lineHeight: 36,
  },
  h3: {
    fontWeight: fontWeights.semiBold,
    fontSize: 24,
    lineHeight: 32,
  },
  h4: {
    fontWeight: fontWeights.semiBold,
    fontSize: 20,
    lineHeight: 28,
  },

  // Body
  bodyLarge: {
    fontWeight: fontWeights.regular,
    fontSize: 18,
    lineHeight: 26,
  },
  body: {
    fontWeight: fontWeights.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontWeight: fontWeights.regular,
    fontSize: 14,
    lineHeight: 20,
  },

  // Labels
  label: {
    fontWeight: fontWeights.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  labelSmall: {
    fontWeight: fontWeights.medium,
    fontSize: 14,
    lineHeight: 20,
  },

  // Caption
  caption: {
    fontWeight: fontWeights.regular,
    fontSize: 12,
    lineHeight: 16,
  },

  // Button
  button: {
    fontWeight: fontWeights.semiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  buttonSmall: {
    fontWeight: fontWeights.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
};
