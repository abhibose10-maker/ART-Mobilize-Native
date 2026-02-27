import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import messaging from '@react-native-firebase/messaging';

import '@/firebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const setupMessaging = async () => {
      try {
        await messaging().requestPermission();
        const token = await messaging().getToken();
        console.log('FCM registration token:', token);
      } catch (error) {
        console.warn('Error setting up FCM messaging', error);
      }
    };

    setupMessaging();

    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('FCM message received in foreground:', remoteMessage);
    });

    return () => {
      unsubscribeOnMessage();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
