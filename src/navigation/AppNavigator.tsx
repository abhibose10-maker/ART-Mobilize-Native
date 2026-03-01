// src/navigation/AppNavigator.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// ── Auth Screens ──────────────────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import RejectedScreen from '../screens/RejectedScreen';

// ── Role Dashboards ───────────────────────────────────────────
import SuperadminDashboard from '../screens/SuperadminDashboard';
import AdminDashboard from '../screens/AdminDashboard';
import StaffDashboard from '../screens/StaffDashboard';

// ── Admin Screens ─────────────────────────────────────────────
import CreateAlertScreen from '../screens/admin/CreateAlertScreen';
import LiveMapScreen from '../screens/admin/LiveMapScreen';
import AcknowledgementsScreen from '../screens/admin/AcknowledgementsScreen';

// ── Staff Screens ─────────────────────────────────────────────
import AlertAcknowledgementScreen from '../screens/staff/AlertAcknowledgementScreen';
import LiveGPSScreen from '../screens/staff/LiveGPSScreen';

// ── SuperAdmin Screens ────────────────────────────────────────
import DivisionOverviewScreen from '../screens/super_admin/DivisionOverviewScreen';

// ── Shared ────────────────────────────────────────────────────
import FullScreenAlertScreen from '../screens/FullScreenAlertScreen';
import { useAuthStore } from '../store/authstore';

// ─────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
    <ActivityIndicator size="large" color="#ef4444" />
  </View>
);

const AppNavigator = () => {
  const { firebaseUser, setFirebaseUser, userData, setUserData } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Step 1: Listen to Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      if (user) {
        // Step 2: Listen to Firestore user doc in real-time
        const unsubscribeFirestore = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              setUserData(snap.data() as any);
            } else {
              setUserData(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Firestore listener error:', error);
            setLoading(false);
          }
        );

        return () => unsubscribeFirestore();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {/* NOT LOGGED IN */}
        {!firebaseUser ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>

        /* LOGGED IN, DOC NOT READY YET */
        ) : !userData ? (
          <Stack.Screen name="Pending" component={PendingApprovalScreen} />

        /* REJECTED */
        ) : userData.rejected ? (
          <Stack.Screen name="Rejected" component={RejectedScreen} />

        /* PENDING APPROVAL */
        ) : !userData.approved ? (
          <Stack.Screen name="Pending" component={PendingApprovalScreen} />

        /* SUPERADMIN */
        ) : userData.role === 'SuperAdmin' ? (
          <>
            <Stack.Screen name="SuperAdminDashboard" component={SuperadminDashboard} />
            <Stack.Screen name="DivisionOverview" component={DivisionOverviewScreen} />
            <Stack.Screen name="FullScreenAlert" component={FullScreenAlertScreen} />
          </>

        /* ADMIN */
        ) : userData.role === 'Admin' ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="CreateAlert" component={CreateAlertScreen} />
            <Stack.Screen name="LiveMap" component={LiveMapScreen} />
            <Stack.Screen name="Acknowledgements" component={AcknowledgementsScreen} />
            <Stack.Screen name="FullScreenAlert" component={FullScreenAlertScreen} />
          </>

        /* STAFF */
        ) : userData.role === 'Staff' ? (
          <>
            <Stack.Screen name="StaffDashboard" component={StaffDashboard} />
            <Stack.Screen name="AlertAcknowledgement" component={AlertAcknowledgementScreen} />
            <Stack.Screen name="LiveGPS" component={LiveGPSScreen} />
            <Stack.Screen name="FullScreenAlert" component={FullScreenAlertScreen} />
          </>

        /* UNKNOWN ROLE FALLBACK */
        ) : (
          <Stack.Screen name="Pending" component={PendingApprovalScreen} />
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;