import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function prepareNotifications() {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  let granted = (current as unknown as { status?: string }).status === 'granted';
  if (!granted) {
    granted = (await Notifications.requestPermissionsAsync() as unknown as { status?: string }).status === 'granted';
  }
  if (!granted) return false;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  return true;
}

export async function notifyRecommendationReady(count: number) {
  if (Platform.OS === 'web') return;
  try {
    if (await prepareNotifications()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'ReelAI', body: `${count} recomendação(ões) prontas para você.` },
        trigger: null,
      });
    }
  } catch { /* permissão negada ou recurso indisponível não interrompe o fluxo */ }
}
