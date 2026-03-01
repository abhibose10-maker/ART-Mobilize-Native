// src/screens/StaffDashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, StatusBar,
} from 'react-native';
import { signOut, updatePassword } from 'firebase/auth';
import {
  collection, onSnapshot, query, where, orderBy,
  Timestamp, DocumentData, getDocs, updateDoc, doc,
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebase';
import { useAuthStore } from '../store/authstore';
import { C, S, R, T } from '../theme';

// ── Types ─────────────────────────────────────────────────────
type AlertItem = {
  id: string;
  message: string;
  status: string;
  timestamp?: Timestamp | null;        // ✅ correct field name
  artType?: string;
  artLocation?: string;
};

type AttendedLog = {
  alertId: string;
  message: string;
  timestamp?: Timestamp | null;        // ✅ correct field name
  acknowledgedAt?: Timestamp | null;
};

// ── Component ─────────────────────────────────────────────────
const StaffDashboard: React.FC = () => {
  // ✅ Use authStore instead of route.params
  const { userData } = useAuthStore();
  const navigation = useNavigation<any>();  // ✅ use hook instead of prop

  const division    = userData?.division    ?? '';
  const artType     = userData?.artType     ?? '';
  const artLocation = userData?.artLocation ?? '';
  const uid         = userData?.uid         ?? '';

  const [activeTab, setActiveTab] = useState<'alerts' | 'log'>('alerts');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const [attendedLog, setAttendedLog] = useState<AttendedLog[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  // Edit Profile
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfilePassword, setEditProfilePassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const seenAlertIds = useRef<Set<string>>(new Set());

  // ── Active Alerts — own unit only, correct fields ────────────
  useEffect(() => {
    if (!division || !artType || !artLocation) return;

    const unsub = onSnapshot(
      query(
        collection(db, 'alerts'),
        where('division', '==', division),       // ✅ division filter
        where('artType', '==', artType),
        where('artLocation', '==', artLocation),
        orderBy('timestamp', 'desc'),            // ✅ correct field
      ),
      snapshot => {
        const list: AlertItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as DocumentData;
          list.push({
            id: docSnap.id,
            message: data.message ?? '',
            status: data.status ?? 'active',
            timestamp: data.timestamp ?? null,   // ✅ correct field
            artType: data.artType,
            artLocation: data.artLocation,
          });
        });

        // Auto-navigate to FullScreenAlert for new active unacknowledged alerts
        list.forEach(alert => {
          if (
            alert.status === 'active' &&          // ✅ 'active' not 'open'
            !seenAlertIds.current.has(alert.id) &&
            !acknowledgedIds.has(alert.id)
          ) {
            seenAlertIds.current.add(alert.id);
            navigation.navigate('FullScreenAlert', {
              alertId: alert.id,
              message: alert.message,
              artType: alert.artType ?? artType,
              artLocation: alert.artLocation ?? artLocation,
              timestamp: alert.timestamp
                ? (alert.timestamp as Timestamp).toDate().toISOString()
                : new Date().toISOString(),
            });
          }
        });

        setAlerts(list);
        setLoading(false);
      },
      err => {
        console.error('Alerts listener error', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [division, artType, artLocation]);

  // ── Attended Log — reads from acknowledgements collection ────
  useEffect(() => {
    if (activeTab !== 'log' || !uid) return;
    setLoadingLog(true);

    // ✅ Query acknowledgements collection directly by userId
    // Per schema: acknowledgements/{ackId} has userId, alertId, timestamp etc.
    const unsub = onSnapshot(
      query(
        collection(db, 'acknowledgements'),
        where('userId', '==', uid),              // ✅ staff sees only their own
        where('division', '==', division),
        orderBy('timestamp', 'desc'),
      ),
      async snapshot => {
        const log: AttendedLog[] = [];
        for (const ackDoc of snapshot.docs) {
          const ackData = ackDoc.data() as DocumentData;
          // Fetch alert message for display
          try {
            const alertRef = doc(db, 'alerts', ackData.alertId);
            // We'll show what we have — message can be fetched separately if needed
            log.push({
              alertId: ackData.alertId,
              message: ackData.message ?? '',    // store message in ack if available
              timestamp: ackData.timestamp ?? null,
              acknowledgedAt: ackData.timestamp ?? null,
            });
          } catch (_) {}
        }
        setAttendedLog(log);
        setLoadingLog(false);
      }
    );

    return () => unsub();
  }, [activeTab, uid, division]);

  // ── Load acknowledged IDs so we don't re-navigate ───────────
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'acknowledgements'), where('userId', '==', uid)),
      snap => {
        const ids = new Set<string>();
        snap.forEach(d => ids.add(d.data().alertId));
        setAcknowledgedIds(ids);
      }
    );
    return () => unsub();
  }, [uid]);

  const handleLogout = async () => {
    await signOut(auth);
    // AppNavigator handles redirect
  };

  const handleSaveProfile = async () => {
    if (!userData) return;
    setSavingProfile(true);
    try {
      if (editProfileName.trim()) {
        await updateDoc(doc(db, 'users', userData.uid), { name: editProfileName.trim() });
      }
      if (editProfilePassword.trim() && auth.currentUser) {
        await updatePassword(auth.currentUser, editProfilePassword);
      }
      setEditProfileModal(false);
      setEditProfileName('');
      setEditProfilePassword('');
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────
  const renderAlertItem = ({ item }: { item: AlertItem }) => {
    const timeLabel = item.timestamp
      ? (item.timestamp as Timestamp).toDate().toLocaleString()
      : 'Unknown time';
    const isAcked = acknowledgedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[T.card, item.status === 'active' && !isAcked && T.cardLive]}
        onPress={() => {
          if (item.status === 'active' && !isAcked) {
            navigation.navigate('FullScreenAlert', {
              alertId: item.id,
              message: item.message,
              artType: item.artType ?? artType,
              artLocation: item.artLocation ?? artLocation,
              timestamp: item.timestamp
                ? (item.timestamp as Timestamp).toDate().toISOString()
                : new Date().toISOString(),
            });
          }
        }}
        activeOpacity={item.status === 'active' && !isAcked ? 0.7 : 1}>
        <View style={styles.alertCardHeader}>
          <Text style={styles.alertMessage}>{item.message}</Text>
          {item.status === 'active' && !isAcked && (
            <View style={[T.badge, T.badgeLive]}>
              <Text style={T.badgeText}>LIVE</Text>
            </View>
          )}
          {isAcked && (
            <View style={[T.badge, T.badgeApproved]}>
              <Text style={T.badgeText}>✓ ACKED</Text>
            </View>
          )}
        </View>
        <View style={styles.alertMetaRow}>
          <Text style={T.cardMeta}>{timeLabel}</Text>
          <Text style={[styles.alertStatus, item.status === 'active' ? styles.statusActive : styles.statusClosed]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLogItem = ({ item }: { item: AttendedLog }) => {
    const alertDate = item.timestamp
      ? (item.timestamp as Timestamp).toDate().toLocaleDateString()
      : 'Unknown date';
    const ackTime = item.acknowledgedAt
      ? (item.acknowledgedAt as Timestamp).toDate().toLocaleTimeString()
      : '';

    return (
      <View style={T.card}>
        <Text style={T.cardName}>{item.message || `Alert ${item.alertId.slice(0, 8)}...`}</Text>
        <Text style={T.cardMeta}>{alertDate}</Text>
        {ackTime ? <Text style={styles.logAckTime}>Acknowledged at {ackTime}</Text> : null}
      </View>
    );
  };

  // ── Main Render ───────────────────────────────────────────────
  return (
    <View style={T.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Edit Profile Modal */}
      <Modal visible={editProfileModal} transparent animationType="fade">
        <View style={T.modalOverlay}>
          <View style={T.modalCard}>
            <Text style={T.modalTitle}>Edit Profile</Text>
            <TextInput style={T.input} placeholder="Name" placeholderTextColor={C.textMuted} value={editProfileName} onChangeText={setEditProfileName} />
            <TextInput style={T.input} placeholder="New Password (optional)" placeholderTextColor={C.textMuted} value={editProfilePassword} onChangeText={setEditProfilePassword} secureTextEntry />
            <Text style={[T.cardMeta, { marginBottom: S.md }]}>Note: You cannot change role, artType, or artLocation</Text>
            <View style={T.modalActions}>
              <TouchableOpacity style={T.outlineBtn} onPress={() => { setEditProfileModal(false); setEditProfileName(''); setEditProfilePassword(''); }}>
                <Text style={T.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.success }, savingProfile && T.btnDisabled]} onPress={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#fff" size="small" /> : <Text style={T.actionBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={T.header}>
        <View style={{ flex: 1, marginRight: S.md }}>
          <Text style={T.appName}>ART Mobilize</Text>
          <Text style={T.headerSub} numberOfLines={1}>
            {userData?.name ?? ''} · Staff · {artType} · {artLocation}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <TouchableOpacity
            style={[T.outlineBtn, T.outlineBtnAccent]}
            onPress={() => { setEditProfileName(userData?.name ?? ''); setEditProfileModal(true); }}>
            <Text style={[T.outlineBtnText, { color: C.accentLight }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={T.outlineBtn} onPress={handleLogout}>
            <Text style={T.outlineBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={T.subTabRow}>
        <TouchableOpacity style={[T.subTab, activeTab === 'alerts' && T.subTabActive]} onPress={() => setActiveTab('alerts')}>
          <Text style={[T.subTabText, activeTab === 'alerts' && T.subTabTextActive]}>Active Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[T.subTab, activeTab === 'log' && T.subTabActive]} onPress={() => setActiveTab('log')}>
          <Text style={[T.subTabText, activeTab === 'log' && T.subTabTextActive]}>My Attended Log</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'alerts' ? (
        loading
          ? <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>
          : (
            <FlatList
              data={alerts}
              keyExtractor={item => item.id}
              renderItem={renderAlertItem}
              contentContainerStyle={alerts.length === 0 ? T.centerContent : { paddingBottom: 24 }}
              ListEmptyComponent={<Text style={T.emptyText}>No alerts for your unit yet.</Text>}
            />
          )
      ) : loadingLog
        ? <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>
        : (
          <FlatList
            data={attendedLog}
            keyExtractor={item => item.alertId}
            renderItem={renderLogItem}
            contentContainerStyle={attendedLog.length === 0 ? T.centerContent : { paddingBottom: 24 }}
            ListEmptyComponent={<Text style={T.emptyText}>You haven't acknowledged any alerts yet.</Text>}
          />
        )
      }
    </View>
  );
};

const styles = StyleSheet.create({
  alertCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.sm },
  alertMessage:     { color: C.text, fontSize: 15, flex: 1, marginRight: S.sm },
  alertMetaRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  alertStatus:      { fontSize: 12, fontWeight: '600' },
  statusActive:     { color: C.danger },               // ✅ renamed from statusOpen
  statusClosed:     { color: C.success },
  logAckTime:       { color: C.success, fontSize: 12, marginTop: S.xs },
});

export default StaffDashboard;