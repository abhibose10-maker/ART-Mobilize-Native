import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { createRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';
import { auth, db } from '../config/firebase';
import * as TaskManager from 'expo-task-manager';

// Shared navigation ref — set in App.tsx via ref={navigationRef}
export const navigationRef = createRef<NavigationContainerRef<any>>();

// FCM token refresh — keeps Firestore token up to date after app reinstall/token rotation
messaging().onTokenRefresh(async (newToken: string) => {
  const user = auth.currentUser;
  if (user) {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fcmToken: newToken,
      });
      console.log('FCM token refreshed and saved to Firestore');
    } catch (e) {
      console.error('Failed to update refreshed FCM token', e);
    }
  }
});

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  ({ data, error }) => {
    if (error) {
      console.error('Background notification error:', error);
      return;
    }
    console.log('Background notification received:', data);
  },
);

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(err =>
  console.error('Failed to register background notification task', err),
);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function navigateToAlert(data: Record<string, any>) {
  if (data?.type === 'alert' && navigationRef.current) {
    navigationRef.current.navigate('FullScreenAlert', {
      alertId: data.alertId ?? '',
      message: data.message ?? '',
      artType: data.artType ?? '',
      artLocation: data.artLocation ?? '',
      createdAt: data.createdAt ?? new Date().toISOString(),
    });
  }
}

export async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await updateDoc(doc(db, 'users', userId), {
    fcmToken: token,
    expoPushToken: token,
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('art_alerts', {
      name: 'ART Mobilize Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'siren.mp3',
      enableVibrate: true,
      showBadge: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  return token;
}

export function setupNotificationListeners() {
  // Foreground: notification arrives while app is open
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Foreground notification:', notification);
    const data = notification.request.content.data as Record<string, any>;
    navigateToAlert(data);
  });

  // Background/closed: user taps notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    const data = response.notification.request.content.data as Record<string, any>;
    navigateToAlert(data);
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

