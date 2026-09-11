import * as React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { UserProfile } from '@/components/auth/UserProfile';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#0A0A0A', '#1F1F1F'] : ['#FFFFFF', '#F4F4F5']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text variant='heading'>Profile</Text>
              <Text variant='caption' style={styles.subtitle}>
                Conta e preferências
              </Text>
            </View>
            <ModeToggle />
          </View>

          <UserProfile />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
});
