import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PendingApprovalScreen from './src/screens/PendingApprovalScreen';
import RejectedScreen from './src/screens/RejectedScreen';
import StaffDashboard from './src/screens/StaffDashboard';
import AdminDashboard from './src/screens/AdminDashboard';
import SuperadminDashboard from './src/screens/SuperadminDashboard';
import FullScreenAlertScreen from './src/screens/FullScreenAlertScreen';
import { auth, db } from './src/config/firebase';
import {
  navigationRef,
  registerForPushNotifications,
  setupNotificationListeners,
} from './src/services/notifications';

type UserProfile = {
  uid: string;
  name: string;
  email: string;
  role: 'staff' | 'admin' | 'superadmin';
  artType?: string;
  artLocation?: string;
  division?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
};

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  PendingApproval: { name?: string; role?: string } | undefined;
  Rejected: { name?: string; role?: string; rejectionReason?: string } | undefined;
  StaffDashboard: {
    uid: string;
    name: string;
    role: string;
    artType: string;
    artLocation: string;
    division: string;
  };
  AdminDashboard: {
    uid: string;
    name: string;
    role: string;
    artType: string;
    artLocation: string;
    division: string;
  };
  SuperadminDashboard: {
    uid: string;
    name: string;
    role: string;
    division: string;
  };
  FullScreenAlert: {
    alertId: string;
    message: string;
    artType: string;
    artLocation: string;
    createdAt?: string;
    userName?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const DIVISION = 'Central Railways Mumbai';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const removeListeners = setupNotificationListeners();
    return () => removeListeners();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      setFirebaseUser(user);
      setProfile(null);

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(
          userRef,
          snapshot => {
            if (snapshot.exists()) {
              const data = snapshot.data() as any;
              setProfile({
                uid:             user.uid,
                name:            data.name ?? '',
                email:           data.email ?? user.email ?? '',
                role:            data.role ?? 'staff',
                artType:         data.artType,
                artLocation:     data.artLocation,
                division:        data.division ?? DIVISION,
                status:          data.status ?? 'pending',
                rejectionReason: data.rejectionReason,
              });
            } else {
              setProfile(null);
            }
            setInitializing(false);
          },
          () => setInitializing(false),
        );
        return () => unsubscribeProfile();
      } else {
        setInitializing(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (profile && profile.status === 'approved') {
      registerForPushNotifications(profile.uid).catch(err =>
        console.warn('Error registering for push notifications', err),
      );
    }
  }, [profile?.uid, profile?.status]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}>

        {/* Auth screens — always available */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Status screens */}
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        <Stack.Screen name="Rejected" component={RejectedScreen} />

        {/* Role dashboards */}
        <Stack.Screen name="StaffDashboard" component={StaffDashboard} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="SuperadminDashboard" component={SuperadminDashboard} />

        {/* Full screen alert */}
        <Stack.Screen
          name="FullScreenAlert"
          component={FullScreenAlertScreen}
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}