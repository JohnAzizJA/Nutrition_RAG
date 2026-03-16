import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { SpotifyProvider } from '@/src/contexts/SpotifyContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SpotifyProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false}}>
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="register" />
            <Stack.Screen name="login" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="log-food" />
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
        </SpotifyProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
