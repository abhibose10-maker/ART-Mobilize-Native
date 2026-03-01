import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { createRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { db } from '../config/firebase';

// ── Navigation ref ─────────────────────────────────────────
export const navigationRef = createRef<NavigationContainerRef<any>>();

// ── Background task ────────────────────────────────────────
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('Background notification error:', error);
    return;
  }
  console.log('Background notification received:', data);
});

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(err =>
  console.error('Failed to register background notification task', err),
);

// ── Foreground handler ─────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Siren player ───────────────────────────────────────────
async function playSiren() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
    });
    const { sound } = await Audio.loadAsync(
      require('../../assets/siren.mp3'),
    );
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate(status => {
      if ('didJustFinish' in status && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e) {
    console.warn('Could not play siren:', e);
  }
}

// ── Navigate to full screen alert ─────────────────────────
function navigateToAlert(data: Record<string, any>) {
  if (!navigationRef.current) return;
  if (!data?.alertId && !data?.type) return;

  navigationRef.current.navigate('FullScreenAlert', {
    alertId:     data.alertId     ?? '',
    message:     data.message     ?? '',
    artType:     data.artType     ?? '',
    artLocation: data.artLocation ?? '',
    createdAt:   data.createdAt   ?? new Date().toISOString(),
    userName:    data.userName    ?? '',
  });
}

// ── Register device + save token ──────────────────────────
export async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on a physical device');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('art_alerts', {
      name: 'ART Mobilize Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'siren.mp3',
      enableVibrate: true,
      showBadge: true,
      bypassDnd: true,
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  // SDK 54 requires projectId explicitly
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.error('No EAS projectId found in app.json');
    return;
  }

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  await updateDoc(doc(db, 'users', userId), {
    fcmToken:      expoPushToken,
    expoPushToken: expoPushToken,
  });

  console.log('Push token saved:', expoPushToken);
  return expoPushToken;
}

// ── Notification listeners ─────────────────────────────────
export function setupNotificationListeners() {
  const foregroundSub = Notifications.addNotificationReceivedListener(
    async notification => {
      const data = notification.request.content.data as Record<string, any>;
      await playSiren();
      navigateToAlert(data);
    },
  );

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    response => {
      const data =
        response.notification.request.content.data as Record<string, any>;
      navigateToAlert(data);
    },
  );

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
}
``