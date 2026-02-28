import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  WelcomeScreen,
  PairDeviceScreen,
  SettingsScreen,
  SharedCanvasScreen,
  QRScannerScreen,
} from '../screens';
import { colors } from '../theme';

export type RootStackParamList = {
  Welcome: undefined;
  PairDevice: undefined;
  Settings: undefined;
  SharedCanvas: undefined;
  QRScanner: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.backgroundDark },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="PairDevice" component={PairDeviceScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SharedCanvas" component={SharedCanvasScreen} />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
