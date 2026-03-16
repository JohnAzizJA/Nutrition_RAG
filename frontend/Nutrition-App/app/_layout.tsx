import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { SpotifyProvider } from '@/src/contexts/SpotifyContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <SpotifyProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              {/* Prevent swipe-back to pre-auth screens after login/logout */}
              <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
              <Stack.Screen name="register" options={{ gestureEnabled: false }} />
              <Stack.Screen name="login" options={{ gestureEnabled: false }} />
              <Stack.Screen name="profile" />
              <Stack.Screen name="log-food" />
              <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
          </SpotifyProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
