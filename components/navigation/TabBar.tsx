import { Icon } from '@/components/ui/icon';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Home, MessageCircle, User } from 'lucide-react-native';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabRouteName = 'index' | 'explore' | 'profile';

const TAB_ICONS: Record<TabRouteName, typeof Home> = {
  index: Home,
  explore: MessageCircle,
  profile: User,
};

const TAB_LABELS: Record<TabRouteName, string> = {
  index: 'Home',
  explore: 'Chat',
  profile: 'Perfil',
};

function triggerHaptic() {
  if (Platform.OS === 'ios') {
    Haptics.selectionAsync();
  }
}

export function TabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bottomPadding = Math.max(insets.bottom + 10, 18);

  const routes = state.routes.filter(
    (route): route is typeof route & { name: TabRouteName } =>
      route.name in TAB_ICONS
  );

  const currentRouteName = state.routes[state.index].name;
  if (currentRouteName === 'explore') {
    return null;
  }

  // Theme-adaptive colors
  const pillBg = isDark
    ? Platform.OS === 'ios' ? 'rgba(20,20,22,0.58)' : 'rgba(20,20,22,0.96)'
    : Platform.OS === 'ios' ? 'rgba(240,240,242,0.72)' : 'rgba(240,240,242,0.96)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.10)';
  const activeColor = isDark ? '#FFFFFF' : '#000000';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.40)';
  const activeBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)';
  const activeBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)';
  const blurTint = isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';

  return (
    <View pointerEvents='box-none' style={styles.root}>
      <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
        <View style={[styles.tabPill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
          {Platform.OS === 'ios' ? (
            <BlurView
              tint={blurTint}
              intensity={94}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {routes.map((route) => {
            const isFocused = state.index === state.routes.indexOf(route);
            const icon = TAB_ICONS[route.name];
            const label = TAB_LABELS[route.name];
            const options = descriptors[route.key].options;

            const onPress = () => {
              triggerHaptic();
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole='tab'
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [
                  styles.tabItem,
                  isFocused && {
                    backgroundColor: activeBg,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: activeBorder,
                  },
                  pressed && styles.tabItemPressed,
                ]}
              >
                <Icon
                  name={icon}
                  size={17}
                  color={isFocused ? activeColor : inactiveColor}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? activeColor : inactiveColor },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 90,
  },
  wrapper: {
    paddingHorizontal: 64,
    alignItems: 'center',
  },
  tabPill: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabItemPressed: {
    opacity: 0.76,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
