import { TabBar } from '@/components/navigation/TabBar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@clerk/clerk-expo';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/(auth)/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <Tabs
      detachInactiveScreens={false}
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        freezeOnBlur: true,
        animation: 'fade',
        sceneStyle: {
          backgroundColor: colorScheme === 'dark' ? '#000' : '#FFFFFF',
        },
        tabBarStyle: {
          position: 'absolute',
          height: 124,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Home',
        }}
      />

      <Tabs.Screen
        name='explore'
        options={{
          title: 'Chat',
        }}
      />

      <Tabs.Screen
        name='profile'
        options={{
          title: 'Perfil',
        }}
      />
    </Tabs>
  );
}
