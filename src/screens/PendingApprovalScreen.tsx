import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { C, S, R } from '../theme';

type PendingRouteParams = {
  PendingApproval: {
    uid?: string;
    name?: string;
    role?: string;
    artType?: string;
    artLocation?: string;
  };
};

const PendingApprovalScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<PendingRouteParams, 'PendingApproval'>>();

  const [checking, setChecking] = useState(false);
  const uid = route.params?.uid ?? auth.currentUser?.uid ?? '';
  const name = route.params?.name ?? 'User';
  const role = route.params?.role ?? 'staff';
  const artType = route.params?.artType ?? '';
  const artLocation = route.params?.artLocation ?? '';

  useEffect(() => {
    if (!uid) return;
    
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'approved' || data.status === 'rejected') {
          setChecking(true);
        }
      }
    });

    return () => unsub();
  }, [uid]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {checking && (
        <View style={styles.checkingBanner}>
          <ActivityIndicator color="#3b82f6" size="small" />
          <Text style={styles.checkingText}>Status updated, refreshing...</Text>
        </View>
      )}
      <Text style={styles.title}>Your account is pending approval</Text>
      <Text style={styles.subtitle}>
        Hi {name} ({role})
      </Text>
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role:</Text>
          <Text style={styles.detailValue}>{role}</Text>
        </View>
        {artType ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ART Type:</Text>
            <Text style={styles.detailValue}>{artType}</Text>
          </View>
        ) : null}
        {artLocation ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ART Location:</Text>
            <Text style={styles.detailValue}>{artLocation}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.body}>
        An administrator is reviewing your details. You&apos;ll be notified once your account is
        approved.
      </Text>
      <Text style={[styles.body, { fontSize: 12, marginTop: 8 }]}>
        Auto-refreshing every 30 seconds...
      </Text>

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
    color: C.text,
    textAlign: 'center',
    marginBottom: S.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    color: C.textSec,
    marginBottom: S.lg,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: C.textSec,
    textAlign: 'center',
    marginBottom: S.xxxl,
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
  checkingBanner: {
    position: 'absolute',
    top: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.pill,
    gap: S.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  checkingText: {
    color: C.accentLight,
    fontSize: 13,
    fontWeight: '600',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.xxl,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: S.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailLabel: {
    color: C.textSec,
    fontSize: 14,
  },
  detailValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PendingApprovalScreen;

