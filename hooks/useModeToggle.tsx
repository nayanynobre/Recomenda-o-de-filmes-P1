import { useColorScheme } from '@/hooks/useColorScheme';
import { useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Mode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'reelai:color_mode';

interface UseModeToggleReturn {
  isDark: boolean;
  mode: Mode;
  setMode: (mode: Mode) => void;
  currentMode: ColorSchemeName;
  toggleMode: () => void;
}

let restoredFromStorage = false;
let cachedMode: Mode = 'system';

export function useModeToggle(): UseModeToggleReturn {
  const [mode, setModeState] = useState<Mode>(cachedMode);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Restore persisted mode on first mount
  useEffect(() => {
    if (restoredFromStorage) return;
    restoredFromStorage = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          cachedMode = stored;
          setModeState(stored);
          if (stored === 'system') {
            Appearance.setColorScheme(null);
          } else {
            Appearance.setColorScheme(stored);
          }
        }
      })
      .catch(() => {
        // silent
      });
  }, []);

  const setMode = (newMode: Mode) => {
    cachedMode = newMode;
    setModeState(newMode);

    if (newMode === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(newMode);
    }

    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {
      // silent
    });
  };

  const toggleMode = () => {
    switch (mode) {
      case 'light':
        setMode('dark');
        break;
      case 'dark':
        setMode('system');
        break;
      case 'system':
        setMode('light');
        break;
    }
  };

  return {
    isDark,
    mode,
    setMode,
    currentMode: colorScheme,
    toggleMode,
  };
}
