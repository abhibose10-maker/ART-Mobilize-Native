// src/screens/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, ScrollView, Modal, Alert,
  Dimensions, StatusBar,
} from 'react-native';
import { signOut, updatePassword } from 'firebase/auth';
import {
  addDoc, collection, doc, onSnapshot, orderBy,
  query, updateDoc, deleteDoc, where, Timestamp,
  DocumentData, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuthStore } from '../store/authstore';
import { C, S, R, T } from '../theme';
import StaffMapView from '../components/StaffMapView';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Types ─────────────────────────────────────────────────────
type AlertItem = {
  id: string;
  message: string;
  status: string;
  artType?: string;
  artLocation?: string;
  createdBy?: string;
  timestamp?: Timestamp | null;        // ✅ renamed from createdAt
};

type PendingUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  artType: string;
  artLocation: string;
};

type StaffMember = {
  id: string;
  name: string;
  email: string;
  approved: boolean;                   // ✅ correct field
  rejected: boolean;
  artType: string;
  artLocation: string;
};

type AlertResponse = {
  id: string;
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp?: Timestamp | null;
};

type AlertWithResponses = AlertItem & {
  responses: AlertResponse[];
  expanded: boolean;
};

const TABS = ['Send Alert', 'Approvals', 'Live Report', 'Directory', 'Alert Logs', 'Staff Map'] as const;
type TabName = typeof TABS[number];

// ── Component ─────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  // ✅ Use authStore instead of route.params
  const { userData } = useAuthStore();
  const division   = userData?.division   ?? '';
  const artType    = userData?.artType    ?? '';
  const artLocation = userData?.artLocation ?? '';

  const [activeTab, setActiveTab] = useState<TabName>('Send Alert');

  // Send Alert
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Pending Approvals
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [rejectModalUser, setRejectModalUser] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Live Report
  const [openAlerts, setOpenAlerts] = useState<AlertItem[]>([]);
  const [liveResponses, setLiveResponses] = useState<AlertResponse[]>([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [liveAlertId, setLiveAlertId] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(true);

  // Staff Directory
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [editModalStaff, setEditModalStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Alert Logs
  const [alertLogs, setAlertLogs] = useState<AlertWithResponses[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Edit Profile
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfilePassword, setEditProfilePassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Staff Map
  const [staffLocations, setStaffLocations] = useState<Array<{
    id: string; name: string; latitude: number; longitude: number; lastUpdate?: any;
  }>>([]);
  const [loadingStaffMap, setLoadingStaffMap] = useState(true);

  const handleLogout = async () => {
    await signOut(auth);
    // AppNavigator onAuthStateChanged handles redirect
  };

  // ── Pending Approvals — own unit only, correct fields ────────
  useEffect(() => {
    if (!division || !artType || !artLocation) return;
    const unsub = onSnapshot(
      query(
        collection(db, 'users'),
        where('division', '==', division),       // ✅ division filter
        where('artType', '==', artType),
        where('artLocation', '==', artLocation),
        where('approved', '==', false),          // ✅ correct field
        where('rejected', '==', false),
      ),
      snap => {
        const list: PendingUser[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id, name: data.name ?? '', email: data.email ?? '',
            role: data.role ?? '', artType: data.artType ?? '', artLocation: data.artLocation ?? '',
          });
        });
        setPendingUsers(list);
        setLoadingPending(false);
      }
    );
    return () => unsub();
  }, [division, artType, artLocation]);

  // ── Staff Directory — own unit only ──────────────────────────
  useEffect(() => {
    if (!division || !artType || !artLocation) return;
    const unsub = onSnapshot(
      query(
        collection(db, 'users'),
        where('role', '==', 'Staff'),            // ✅ capital S
        where('division', '==', division),
        where('artType', '==', artType),
        where('artLocation', '==', artLocation),
      ),
      snap => {
        const list: StaffMember[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id, name: data.name ?? '', email: data.email ?? '',
            approved: data.approved ?? false,    // ✅ correct field
            rejected: data.rejected ?? false,
            artType: data.artType ?? '', artLocation: data.artLocation ?? '',
          });
        });
        setStaffList(list);
        setTotalStaff(list.filter(s => s.approved).length);
        setLoadingStaff(false);
      }
    );
    return () => unsub();
  }, [division, artType, artLocation]);

  // ── Live Alerts — own unit, correct status/field names ───────
  useEffect(() => {
    if (!division || !artType || !artLocation) return;
    setLoadingLive(true);
    const unsub = onSnapshot(
      query(
        collection(db, 'alerts'),
        where('division', '==', division),       // ✅ division filter
        where('artType', '==', artType),
        where('artLocation', '==', artLocation),
        where('status', '==', 'active'),         // ✅ 'active' not 'open'
        orderBy('timestamp', 'desc'),            // ✅ 'timestamp' per schema
      ),
      snap => {
        const list: AlertItem[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id, message: data.message ?? '',
            status: data.status ?? 'active',
            timestamp: data.timestamp ?? null,
          });
        });
        setOpenAlerts(list);
        setLiveAlertId(list.length > 0 ? list[0].id : null);
        setLoadingLive(false);
      }
    );
    return () => unsub();
  }, [division, artType, artLocation]);

  // ── Live Responses — from acknowledgements collection ────────
  useEffect(() => {
    if (!liveAlertId) { setLiveResponses([]); return; }
    const unsub = onSnapshot(
      query(collection(db, 'acknowledgements'), where('alertId', '==', liveAlertId)),
      snap => {
        const list: AlertResponse[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id, userId: data.userId ?? '',
            name: data.name ?? '',
            latitude: data.latitude ?? 0,        // ✅ flat fields per schema
            longitude: data.longitude ?? 0,
            timestamp: data.timestamp ?? null,
          });
        });
        setLiveResponses(list);
      }
    );
    return () => unsub();
  }, [liveAlertId]);

  // ── Alert Logs ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'Alert Logs' || !division || !artType || !artLocation) return;
    setLoadingLogs(true);
    const unsub = onSnapshot(
      query(
        collection(db, 'alerts'),
        where('division', '==', division),
        where('artType', '==', artType),
        where('artLocation', '==', artLocation),
        orderBy('timestamp', 'desc'),
      ),
      async snap => {
        const logs: AlertWithResponses[] = [];
        for (const d of snap.docs) {
          const data = d.data() as DocumentData;
          const rSnap = await getDocs(
            query(collection(db, 'acknowledgements'), where('alertId', '==', d.id))
          );
          const responses: AlertResponse[] = [];
          rSnap.forEach(r => {
            const rd = r.data() as DocumentData;
            responses.push({
              id: r.id, userId: rd.userId ?? '', name: rd.name ?? '',
              latitude: rd.latitude ?? 0, longitude: rd.longitude ?? 0,
              timestamp: rd.timestamp ?? null,
            });
          });
          logs.push({
            id: d.id, message: data.message ?? '', status: data.status ?? '',
            timestamp: data.timestamp ?? null, responses, expanded: false,
          });
        }
        setAlertLogs(logs);
        setLoadingLogs(false);
      }
    );
    return () => unsub();
  }, [activeTab, division, artType, artLocation]);

  // ── Staff Map ────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'Staff Map' || !division || !artType || !artLocation) return;
    setLoadingStaffMap(true);
    const unsub = onSnapshot(
      query(
        collection(db, 'users'),
        where('role', '==', 'Staff'),
        where('division', '==', division),
        where('artType', '==', artType),
        where('artLocation', '==', artLocation),
        where('approved', '==', true),
      ),
      snap => {
        const locs: Array<{ id: string; name: string; latitude: number; longitude: number; lastUpdate?: any }> = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          if (data.location?.latitude && data.location?.longitude) {
            locs.push({
              id: d.id, name: data.name ?? 'Staff',
              latitude: data.location.latitude,
              longitude: data.location.longitude,
              lastUpdate: data.location.timestamp ?? null,
            });
          }
        });
        setStaffLocations(locs);
        setLoadingStaffMap(false);
      }
    );
    return () => unsub();
  }, [activeTab, division, artType, artLocation]);

  // ── Actions ───────────────────────────────────────────────────
  const handleSendAlert = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        division,                                // ✅ always include
        artType,
        artLocation,
        createdBy: userData?.uid ?? '',          // ✅ correct field name
        timestamp: serverTimestamp(),            // ✅ correct field name
        status: 'active',                        // ✅ 'active' not 'open'
        message: message.trim(),
      });
      setMessage('');
    } catch (e) {
      Alert.alert('Error', 'Failed to send alert.');
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        approved: true,                          // ✅ correct field
        rejected: false,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to approve.');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalUser) return;
    try {
      await updateDoc(doc(db, 'users', rejectModalUser.id), {
        approved: false,
        rejected: true,                          // ✅ correct field
      });
      setRejectModalUser(null);
      setRejectReason('');
    } catch (e) {
      Alert.alert('Error', 'Failed to reject.');
    }
  };

  const handleEditSave = async () => {
    if (!editModalStaff) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', editModalStaff.id), { name: editName.trim() });
      // ✅ Admin cannot change artType/artLocation per architecture rules
      setEditModalStaff(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStaff = (staff: StaffMember) => {
    Alert.alert('Remove Staff', `Remove ${staff.name} from the system?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try { await deleteDoc(doc(db, 'users', staff.id)); }
          catch (e) { Alert.alert('Error', 'Failed to remove staff.'); }
        },
      },
    ]);
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

  const toggleLogExpand = (alertId: string) => {
    setAlertLogs(prev => prev.map(a => a.id === alertId ? { ...a, expanded: !a.expanded } : a));
  };

  // ── Render Tabs ───────────────────────────────────────────────

  const renderSendAlert = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={T.card}>
        <Text style={T.sectionTitle}>Send Alert to Unit</Text>
        <Text style={[T.cardMeta, { color: C.accentLight, marginBottom: S.md }]}>
          {artType} • {artLocation} • {division}
        </Text>
        <TextInput
          style={T.textArea}
          placeholder="Type alert message..."
          placeholderTextColor={C.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity
          style={[T.primaryBtn, sending && T.btnDisabled]}
          onPress={handleSendAlert}
          disabled={sending}>
          {sending ? <ActivityIndicator color="#FFF" /> : <Text style={T.primaryBtnText}>Send Alert</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderApprovals = () => {
    if (loadingPending) return <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>;
    return (
      <>
        <Modal visible={!!rejectModalUser} transparent animationType="fade">
          <View style={T.modalOverlay}>
            <View style={T.modalCard}>
              <Text style={T.modalTitle}>Reject {rejectModalUser?.name}?</Text>
              <TextInput style={T.input} placeholder="Rejection reason (optional)" placeholderTextColor={C.textMuted} value={rejectReason} onChangeText={setRejectReason} />
              <View style={T.modalActions}>
                <TouchableOpacity style={T.outlineBtn} onPress={() => { setRejectModalUser(null); setRejectReason(''); }}>
                  <Text style={T.outlineBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.danger }]} onPress={handleRejectConfirm}>
                  <Text style={T.actionBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <FlatList
          data={pendingUsers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={T.card}>
              <Text style={T.cardName}>{item.name}</Text>
              <Text style={T.cardMeta}>{item.email} • {item.role}</Text>
              <View style={T.rowActions}>
                <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.success }]} onPress={() => handleApprove(item.id)}>
                  <Text style={T.actionBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.danger }]} onPress={() => setRejectModalUser(item)}>
                  <Text style={T.actionBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={pendingUsers.length === 0 ? T.centerContent : { paddingBottom: 40 }}
          ListEmptyComponent={<Text style={T.emptyText}>No pending approvals.</Text>}
        />
      </>
    );
  };

  const renderLiveReport = () => {
    if (loadingLive) return <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>;
    if (openAlerts.length === 0) {
      return <View style={T.centerContent}><Text style={T.emptyText}>No active alerts right now.</Text></View>;
    }
    const currentAlert = openAlerts[0];
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[T.card, T.cardLive]}>
          <View style={T.liveBadgeRow}>
            <View style={T.liveDot} />
            <Text style={T.liveLabel}>LIVE ALERT</Text>
          </View>
          <Text style={styles.liveMessage}>{currentAlert.message}</Text>
          <Text style={T.cardMeta}>
            {currentAlert.timestamp ? (currentAlert.timestamp as Timestamp).toDate().toLocaleString() : ''}
          </Text>
          <TouchableOpacity
            style={styles.closeAlertButton}
            onPress={() => {
              Alert.alert('Close Alert', 'Mark this alert as resolved?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Close Alert', style: 'destructive', onPress: async () => {
                    try {
                      await updateDoc(doc(db, 'alerts', currentAlert.id), {
                        status: 'closed',
                        closedBy: userData?.uid,
                      });
                    } catch (e) { Alert.alert('Error', 'Failed to close alert.'); }
                  },
                },
              ]);
            }}>
            <Text style={styles.closeAlertButtonText}>Close Alert</Text>
          </TouchableOpacity>
        </View>

        <View style={T.card}>
          <Text style={[T.cardName, { marginBottom: S.sm }]}>
            {liveResponses.length} / {totalStaff} staff responded
          </Text>
          <View style={T.progressBar}>
            <View style={[T.progressFill, {
              width: totalStaff > 0 ? `${Math.round((liveResponses.length / totalStaff) * 100)}%` : '0%'
            }]} />
          </View>
        </View>

        {liveResponses.map(r => (
          <View key={r.id} style={T.card}>
            <Text style={T.cardName}>{r.name}</Text>
            {r.timestamp && (
              <Text style={T.cardMeta}>
                Acked at {(r.timestamp as Timestamp).toDate().toLocaleTimeString()}
              </Text>
            )}
            {(r.latitude !== 0 && r.longitude !== 0) && (
              <Text style={T.cardMeta}>
                📍 {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
              </Text>
            )}
          </View>
        ))}
        {liveResponses.length === 0 && (
          <Text style={[T.emptyText, { textAlign: 'center', marginTop: S.lg }]}>
            Waiting for staff responses...
          </Text>
        )}
      </ScrollView>
    );
  };

  const renderDirectory = () => {
    if (loadingStaff) return <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>;
    return (
      <>
        <Modal visible={!!editModalStaff} transparent animationType="fade">
          <View style={T.modalOverlay}>
            <View style={T.modalCard}>
              <Text style={T.modalTitle}>Edit Staff</Text>
              <TextInput style={T.input} placeholder="Name" placeholderTextColor={C.textMuted} value={editName} onChangeText={setEditName} />
              <Text style={[T.cardMeta, { marginBottom: S.md }]}>
                Note: artType and artLocation cannot be changed
              </Text>
              <View style={T.modalActions}>
                <TouchableOpacity style={T.outlineBtn} onPress={() => setEditModalStaff(null)}>
                  <Text style={T.outlineBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.accent }, saving && T.btnDisabled]} onPress={handleEditSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={T.actionBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <FlatList
          data={staffList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={T.card}>
              <Text style={T.cardName}>{item.name}</Text>
              <Text style={T.cardMeta}>{item.email}</Text>
              <View style={[
                T.badge,
                item.approved ? T.badgeApproved : item.rejected ? T.badgeRejected : T.badgePending,
                { marginTop: S.xs }
              ]}>
                <Text style={T.badgeText}>
                  {item.approved ? 'APPROVED' : item.rejected ? 'REJECTED' : 'PENDING'}
                </Text>
              </View>
              <View style={T.rowActions}>
                <TouchableOpacity
                  style={[T.actionBtn, { backgroundColor: C.accent }]}
                  onPress={() => { setEditModalStaff(item); setEditName(item.name); }}>
                  <Text style={T.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.purple }]} onPress={() => handleRemoveStaff(item)}>
                  <Text style={T.actionBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={staffList.length === 0 ? T.centerContent : { paddingBottom: 40 }}
          ListEmptyComponent={<Text style={T.emptyText}>No staff in your unit.</Text>}
        />
      </>
    );
  };

  const renderAlertLogs = () => {
    if (loadingLogs) return <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>;
    const filtered = alertLogs.filter(a =>
      !logSearchQuery.trim() || (a.message ?? '').toLowerCase().includes(logSearchQuery.toLowerCase())
    );
    return (
      <>
        <TextInput
          style={[T.input, { marginBottom: S.sm }]}
          placeholder="Search alerts by message..."
          placeholderTextColor={C.textMuted}
          value={logSearchQuery}
          onChangeText={setLogSearchQuery}
        />
        <Text style={[T.cardMeta, { textAlign: 'right', marginBottom: S.sm }]}>{filtered.length} result(s)</Text>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={T.card}>
              <TouchableOpacity onPress={() => toggleLogExpand(item.id)} activeOpacity={0.8}>
                <View style={T.logHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={T.alertMsg}>{item.message}</Text>
                    <Text style={T.cardMeta}>
                      {item.timestamp ? (item.timestamp as Timestamp).toDate().toLocaleString() : ''} • {item.responses.length} responses
                    </Text>
                  </View>
                  <Text style={T.expandChevron}>{item.expanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>
              {item.expanded && (
                <View style={T.logExpanded}>
                  {item.responses.length === 0
                    ? <Text style={T.emptyText}>No responses recorded.</Text>
                    : item.responses.map(r => (
                      <View key={r.id} style={T.logResponseItem}>
                        <Text style={T.cardName}>{r.name}</Text>
                        {r.timestamp && (
                          <Text style={T.cardMeta}>{(r.timestamp as Timestamp).toDate().toLocaleTimeString()}</Text>
                        )}
                        {(r.latitude !== 0 && r.longitude !== 0) && (
                          <Text style={T.cardMeta}>📍 {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</Text>
                        )}
                      </View>
                    ))
                  }
                </View>
              )}
            </View>
          )}
          contentContainerStyle={filtered.length === 0 ? T.centerContent : { paddingBottom: 40 }}
          ListEmptyComponent={<Text style={T.emptyText}>No alerts found.</Text>}
        />
      </>
    );
  };

  const renderStaffMap = () => {
    if (loadingStaffMap) return <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>;
    return (
      <StaffMapView
        staffLocations={staffLocations}
        mapOverlayStyle={styles.mapOverlay}
        emptyTextStyle={T.emptyText}
      />
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Send Alert':  return renderSendAlert();
      case 'Approvals':   return renderApprovals();
      case 'Live Report': return renderLiveReport();
      case 'Directory':   return renderDirectory();
      case 'Alert Logs':  return renderAlertLogs();
      case 'Staff Map':   return renderStaffMap();
    }
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
                {savingProfile ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={T.actionBtnText}>Save</Text>}
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
            {userData?.name ?? ''} · Admin · {artType} · {artLocation}
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

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={T.tabBar} contentContainerStyle={T.tabBarRow}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={[T.tab, activeTab === tab && T.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[T.tabText, activeTab === tab && T.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  liveMessage:          { color: C.text, fontSize: 17, fontWeight: '600', marginBottom: S.sm },
  closeAlertButton:     { marginTop: S.md, height: 42, borderRadius: R.pill, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  closeAlertButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  mapOverlay:           { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
});

export default AdminDashboard;