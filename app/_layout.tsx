import { ThemeProvider } from '@/theme/theme-provider';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState, useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
}

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    // Restore persisted color mode as early as possible
    AsyncStorage.getItem('reelai:color_mode')
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') {
          Appearance.setColorScheme(stored);
        } else {
          Appearance.setColorScheme(null);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return null; // ou um loading screen
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
        <ThemeProvider>
          <ClerkLoaded>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'ios_from_right',
                animationMatchesGesture: true,
                fullScreenGestureEnabled: true,
                gestureEnabled: true,
                freezeOnBlur: true,
                contentStyle: { backgroundColor: isDark ? '#000' : '#FFFFFF' },
              }}
            >
              <Stack.Screen name='index' options={{ headerShown: false }} />
              <Stack.Screen name='(auth)' options={{ headerShown: false }} />
              <Stack.Screen
                name='(tabs)'
                options={{ headerShown: false, animation: 'fade' }}
              />
              <Stack.Screen name='onboarding' options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen
                name='search'
                options={{ headerShown: false, animation: 'ios_from_right' }}
              />
              <Stack.Screen
                name='category/[slug]'
                options={{ headerShown: false, animation: 'ios_from_right' }}
              />
              <Stack.Screen
                name='+not-found'
                options={{ headerShown: true, animation: 'ios_from_right' }}
              />
            </Stack>
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </ClerkLoaded>
        </ThemeProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
