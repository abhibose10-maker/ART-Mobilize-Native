import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { C, S, R } from '../theme';

type RejectedRouteParams = {
  Rejected: {
    name?: string;
    role?: string;
    rejectionReason?: string;
  };
};

const RejectedScreen: React.FC = () => {
  const route = useRoute<RouteProp<RejectedRouteParams, 'Rejected'>>();

  const name = route.params?.name ?? 'User';
  const role = route.params?.role ?? 'staff';
  const rejectionReason = route.params?.rejectionReason;

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Text style={styles.title}>Your account has been rejected</Text>
      <Text style={styles.subtitle}>
        Hi {name} ({role})
      </Text>
      <Text style={styles.body}>
        Unfortunately, your account request could not be approved at this time.
      </Text>
      {rejectionReason ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>Reason provided:</Text>
          <Text style={styles.reasonText}>{rejectionReason}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.xxl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FEE2E2',
    textAlign: 'center',
    marginBottom: S.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    color: '#FCA5A5',
    marginBottom: S.lg,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: C.text,
    textAlign: 'center',
    marginBottom: S.xxl,
  },
  reasonBox: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.xxl,
    borderWidth: 1,
    borderColor: C.border,
  },
  reasonLabel: {
    fontSize: 13,
    color: C.textSec,
    marginBottom: S.xs,
  },
  reasonText: {
    fontSize: 14,
    color: C.text,
  },
  button: {
    paddingHorizontal: S.xxxl,
    paddingVertical: S.md,
    borderRadius: R.pill,
    backgroundColor: C.danger,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default RejectedScreen;

