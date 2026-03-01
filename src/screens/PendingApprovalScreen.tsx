// src/screens/PendingApprovalScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { C, S, R } from '../theme';

const PendingApprovalScreen: React.FC = () => {
  const [statusUpdated, setStatusUpdated] = useState(false);

  const uid = auth.currentUser?.uid ?? '';
  const email = auth.currentUser?.email ?? '';

  useEffect(() => {
    if (!uid) return;

    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        // ✅ Correct field names matching your Firestore schema
        if (data.approved === true || data.rejected === true) {
          setStatusUpdated(true);
          // AppNavigator's own onSnapshot will handle the actual navigation
          // No need to navigate manually here
        }
      }
    });

    return () => unsub();
  }, [uid]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Navigation handled automatically by AppNavigator onAuthStateChanged
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Status update banner — shows when admin has acted */}
      {statusUpdated && (
        <View style={styles.checkingBanner}>
          <ActivityIndicator color="#3b82f6" size="small" />
          <Text style={styles.checkingText}>Status updated, redirecting...</Text>
        </View>
      )}

      <Text style={styles.title}>Your account is pending approval</Text>

      <Text style={styles.subtitle}>Hi {email}</Text>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{email}</Text>
        </View>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, { color: '#f59e0b' }]}>Pending</Text>
        </View>
      </View>

      <Text style={styles.body}>
        An administrator is reviewing your details.{'\n'}
        You'll be notified once your account is approved.
      </Text>

      {/* Removed fake "auto-refreshing" text — real-time listener handles this */}
      <Text style={[styles.body, { fontSize: 12, marginTop: 4, opacity: 0.5 }]}>
        Listening for updates in real-time...
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
    marginBottom: S.lg,
    lineHeight: 20,
  },
  button: {
    marginTop: S.lg,
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