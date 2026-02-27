import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { signOut, updatePassword } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { C, S, R, T } from '../theme';

type StaffDashboardProps = {
  route: {
    params?: {
      uid: string;
      name: string;
      role: string;
      artType: string;
      artLocation: string;
    };
  };
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
};

type AlertItem = {
  id: string;
  message: string;
  status: string;
  createdAt?: Timestamp | null;
  artType?: string;
  artLocation?: string;
};

type AttendedLog = {
  alertId: string;
  message: string;
  acknowledgedAt?: Timestamp | null;
  responseMessage?: string;
  createdAt?: Timestamp | null;
};

const StaffDashboard: React.FC<StaffDashboardProps> = ({ route, navigation }) => {
  const user = route.params;
  const [activeTab, setActiveTab] = useState<'alerts' | 'log'>('alerts');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  // My attended log
  const [attendedLog, setAttendedLog] = useState<AttendedLog[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  // Edit Profile
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfilePassword, setEditProfilePassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const seenAlertIds = useRef<Set<string>>(new Set());

  // Subscribe to alerts for this unit
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'alerts'),
      where('artType', '==', user.artType),
      where('artLocation', '==', user.artLocation),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(
      q,
      snapshot => {
        const list: AlertItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as DocumentData;
          list.push({
            id: docSnap.id,
            message: data.message ?? '',
            status: data.status ?? 'open',
            createdAt: data.createdAt ?? null,
            artType: data.artType,
            artLocation: data.artLocation,
          });
        });

        // Navigate to FullScreenAlertScreen for any new open unacknowledged alert
        list.forEach(alert => {
          if (
            alert.status === 'open' &&
            !seenAlertIds.current.has(alert.id) &&
            !acknowledgedIds.has(alert.id)
          ) {
            seenAlertIds.current.add(alert.id);
            navigation.navigate('FullScreenAlert', {
              alertId: alert.id,
              message: alert.message,
              artType: alert.artType ?? user.artType,
              artLocation: alert.artLocation ?? user.artLocation,
              createdAt: alert.createdAt ? alert.createdAt.toDate().toISOString() : new Date().toISOString(),
              userName: user.name,
            });
          }
        });

        setAlerts(list);
        setLoading(false);
      },
      err => {
        console.error('Alerts listener error', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user?.artType, user?.artLocation]);

  // Load my attended log when tab switches
  useEffect(() => {
    if (activeTab !== 'log' || !user) return;
    setLoadingLog(true);

    // Query all alerts for this unit, then check which ones have user's response
    const q = query(
      collection(db, 'alerts'),
      where('artType', '==', user.artType),
      where('artLocation', '==', user.artLocation),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, async snapshot => {
      const log: AttendedLog[] = [];
      for (const alertDoc of snapshot.docs) {
        const alertData = alertDoc.data() as DocumentData;
        try {
          const responseSnap = await getDocs(
            collection(db, 'alerts', alertDoc.id, 'responses'),
          );
          responseSnap.forEach(rDoc => {
            if (rDoc.id === user.uid) {
              const rd = rDoc.data() as DocumentData;
              log.push({
                alertId: alertDoc.id,
                message: alertData.message ?? '',
                createdAt: alertData.createdAt ?? null,
                acknowledgedAt: rd.acknowledgedAt ?? null,
                responseMessage: rd.message ?? '',
              });
            }
          });
        } catch (_) {}
      }
      setAttendedLog(log);
      setLoadingLog(false);
    });

    return () => unsub();
  }, [activeTab, user?.uid, user?.artType, user?.artLocation]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const updates: any = {};
      if (editProfileName.trim()) {
        updates.name = editProfileName.trim();
      }
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users', user.uid), updates);
      }
      if (editProfilePassword.trim()) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await updatePassword(currentUser, editProfilePassword);
        }
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

  const renderAlertItem = ({ item }: { item: AlertItem }) => {
    const timeLabel = item.createdAt
      ? item.createdAt.toDate().toLocaleString()
      : 'Unknown time';
    const isAcked = acknowledgedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.alertCard, item.status === 'open' && !isAcked && styles.alertCardActive]}
        onPress={() => {
          if (item.status === 'open' && !isAcked) {
            navigation.navigate('FullScreenAlert', {
              alertId: item.id,
              message: item.message,
              artType: item.artType ?? user?.artType ?? '',
              artLocation: item.artLocation ?? user?.artLocation ?? '',
              createdAt: item.createdAt ? item.createdAt.toDate().toISOString() : new Date().toISOString(),
              userName: user?.name,
            });
          }
        }}
        activeOpacity={item.status === 'open' && !isAcked ? 0.7 : 1}>
        <View style={styles.alertCardHeader}>
          <Text style={styles.alertMessage}>{item.message}</Text>
          {item.status === 'open' && !isAcked && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          {isAcked && (
            <View style={styles.ackedBadge}>
              <Text style={styles.ackedBadgeText}>✓ ACKED</Text>
            </View>
          )}
        </View>
        <View style={styles.alertMetaRow}>
          <Text style={styles.alertTime}>{timeLabel}</Text>
          <Text style={[styles.alertStatus, item.status === 'open' ? styles.statusOpen : styles.statusClosed]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLogItem = ({ item }: { item: AttendedLog }) => {
    const alertDate = item.createdAt
      ? item.createdAt.toDate().toLocaleDateString()
      : 'Unknown date';
    const ackTime = item.acknowledgedAt
      ? item.acknowledgedAt.toDate().toLocaleTimeString()
      : '';

    return (
      <View style={styles.alertCard}>
        <Text style={styles.alertMessage}>{item.message}</Text>
        <Text style={styles.logDate}>{alertDate}</Text>
        {item.responseMessage ? (
          <Text style={styles.logResponseMsg}>"{item.responseMessage}"</Text>
        ) : null}
        {ackTime ? (
          <Text style={styles.logAckTime}>Acknowledged at {ackTime}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {/* Edit Profile Modal */}
      <Modal visible={editProfileModal} transparent animationType="fade">
        <View style={T.modalOverlay}>
          <View style={T.modalCard}>
            <Text style={T.modalTitle}>Edit Profile</Text>
            <TextInput
              style={T.input}
              placeholder="Name"
              placeholderTextColor={C.textMuted}
              value={editProfileName}
              onChangeText={setEditProfileName}
            />
            <TextInput
              style={T.input}
              placeholder="New Password (optional)"
              placeholderTextColor={C.textMuted}
              value={editProfilePassword}
              onChangeText={setEditProfilePassword}
              secureTextEntry
            />
            <Text style={[T.cardMeta, { marginBottom: 12 }]}>Note: You cannot change role, artType, or artLocation</Text>
            <View style={T.modalActions}>
              <TouchableOpacity style={T.outlineBtn} onPress={() => { setEditProfileModal(false); setEditProfileName(''); setEditProfilePassword(''); }}>
                <Text style={T.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[T.actionBtn, { backgroundColor: C.success }, savingProfile && T.btnDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#fff" size="small" /> : <Text style={T.actionBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={T.header}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={T.appName}>ART Mobilize</Text>
          {user ? (
            <Text style={T.headerSub} numberOfLines={1}>
              {user.name} · {user.artType} · {user.artLocation}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[T.outlineBtn, T.outlineBtnAccent]}
            onPress={() => {
              setEditProfileName(user?.name || '');
              setEditProfileModal(true);
            }}>
            <Text style={[T.outlineBtnText, { color: C.accentLight }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={T.outlineBtn} onPress={handleLogout}>
            <Text style={T.outlineBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={T.subTabRow}>
        <TouchableOpacity
          style={[T.subTab, activeTab === 'alerts' && T.subTabActive]}
          onPress={() => setActiveTab('alerts')}>
          <Text style={[T.subTabText, activeTab === 'alerts' && T.subTabTextActive]}>
            Active Alerts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[T.subTab, activeTab === 'log' && T.subTabActive]}
          onPress={() => setActiveTab('log')}>
          <Text style={[T.subTabText, activeTab === 'log' && T.subTabTextActive]}>
            My Attended Log
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'alerts' ? (
        loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color="#60A5FA" />
          </View>
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={item => item.id}
            renderItem={renderAlertItem}
            contentContainerStyle={alerts.length === 0 ? styles.centerContent : { paddingBottom: 24 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No alerts for your unit yet.</Text>
            }
          />
        )
      ) : loadingLog ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color="#60A5FA" />
        </View>
      ) : (
        <FlatList
          data={attendedLog}
          keyExtractor={item => item.alertId}
          renderItem={renderLogItem}
          contentContainerStyle={attendedLog.length === 0 ? styles.centerContent : { paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>You haven't acknowledged any alerts yet.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: T.screen,
  centerContent: T.centerContent,
  alertCard: T.card,
  alertCardActive: T.cardLive,
  alertCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.sm },
  alertMessage: { color: C.text, fontSize: 15, flex: 1, marginRight: S.sm },
  liveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.sm, alignSelf: 'flex-start', backgroundColor: C.danger },
  liveBadgeText: T.badgeText,
  ackedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.sm, alignSelf: 'flex-start', backgroundColor: C.success },
  ackedBadgeText: T.badgeText,
  alertMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  alertTime: { fontSize: 12, color: C.textSec },
  alertStatus: { fontSize: 12, fontWeight: '600' },
  statusOpen: { color: C.danger },
  statusClosed: { color: C.success },
  logDate: { color: C.textSec, fontSize: 12, marginTop: 4 },
  logResponseMsg: T.responseMsg,
  logAckTime: { color: C.success, fontSize: 12, marginTop: 4 },
  emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },
});

export default StaffDashboard;

