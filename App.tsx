import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { AppNavigator } from './src/navigation';
import { colors } from './src/theme';

// Font assets - uncomment when font files are added to assets/fonts
// const customFonts = {
//   'PlusJakartaSans-Regular': require('./src/assets/fonts/PlusJakartaSans-Regular.ttf'),
//   'PlusJakartaSans-Medium': require('./src/assets/fonts/PlusJakartaSans-Medium.ttf'),
//   'PlusJakartaSans-SemiBold': require('./src/assets/fonts/PlusJakartaSans-SemiBold.ttf'),
//   'PlusJakartaSans-Bold': require('./src/assets/fonts/PlusJakartaSans-Bold.ttf'),
// };

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        // Uncomment when font files are available
        // await Font.loadAsync(customFonts);
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Error loading fonts:', error);
        setFontsLoaded(true); // Continue without custom fonts
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
