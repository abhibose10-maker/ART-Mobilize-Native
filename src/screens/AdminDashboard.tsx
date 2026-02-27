import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  deleteDoc,
  where,
  Timestamp,
  DocumentData,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { updatePassword } from 'firebase/auth';
import { C, S, R, T } from '../theme';
import StaffMapView from '../components/StaffMapView';

const SCREEN_WIDTH = Dimensions.get('window').width;

type AdminDashboardProps = {
  route: {
    params?: {
      uid: string;
      name: string;
      role: string;
      artType: string;
      artLocation: string;
    };
  };
};

type AlertItem = {
  id: string;
  message: string;
  status: string;
  artType?: string;
  artLocation?: string;
  creatorId?: string;
  createdAt?: Timestamp | null;
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
  status: string;
  artType: string;
  artLocation: string;
};

type AlertResponse = {
  id: string;
  name: string;
  location?: { latitude: number; longitude: number } | null;
  acknowledgedAt?: Timestamp | null;
  message?: string;
};

type AlertWithResponses = AlertItem & {
  responses: AlertResponse[];
  expanded: boolean;
};

const TABS = ['Send Alert', 'Approvals', 'Live Report', 'Directory', 'Alert Logs', 'Rescue Map', 'Staff Map'] as const;
type TabName = typeof TABS[number];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ route }) => {
  const user = route.params;
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
  const [editArtType, setEditArtType] = useState('');
  const [editArtLocation, setEditArtLocation] = useState('');
  const [saving, setSaving] = useState(false);

  // Alert Logs
  const [alertLogs, setAlertLogs] = useState<AlertWithResponses[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit Profile
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfilePassword, setEditProfilePassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Staff Map
  const [staffLocations, setStaffLocations] = useState<Array<{id: string; name: string; latitude: number; longitude: number; lastUpdate?: any}>>([]);
  const [loadingStaffMap, setLoadingStaffMap] = useState(true);

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Listeners for pending approvals and staff directory (always on)
  useEffect(() => {
    if (!user) {
      setLoadingPending(false);
      setLoadingStaff(false);
      return;
    }

    const pendingUnsub = onSnapshot(
      query(
        collection(db, 'users'),
        where('status', '==', 'pending'),
        where('artType', '==', user.artType),
        where('artLocation', '==', user.artLocation),
      ),
      snap => {
        const list: PendingUser[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id,
            name: data.name ?? '',
            email: data.email ?? '',
            role: data.role ?? '',
            artType: data.artType ?? '',
            artLocation: data.artLocation ?? '',
          });
        });
        setPendingUsers(list);
        setLoadingPending(false);
      },
    );

    const staffUnsub = onSnapshot(
      query(
        collection(db, 'users'),
        where('role', '==', 'staff'),
        where('artType', '==', user.artType),
        where('artLocation', '==', user.artLocation),
      ),
      snap => {
        const list: StaffMember[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id,
            name: data.name ?? '',
            email: data.email ?? '',
            status: data.status ?? '',
            artType: data.artType ?? '',
            artLocation: data.artLocation ?? '',
          });
        });
        setStaffList(list);
        setTotalStaff(list.filter(s => s.status === 'approved').length);
        setLoadingStaff(false);
      },
    );

    return () => {
      pendingUnsub();
      staffUnsub();
    };
  }, [user?.artType, user?.artLocation]);

  // Live report listener
  useEffect(() => {
    if (!user) return;
    setLoadingLive(true);

    const alertUnsub = onSnapshot(
      query(
        collection(db, 'alerts'),
        where('artType', '==', user.artType),
        where('artLocation', '==', user.artLocation),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
      ),
      snap => {
        const list: AlertItem[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id,
            message: data.message ?? '',
            status: data.status ?? 'open',
            createdAt: data.createdAt ?? null,
          });
        });
        setOpenAlerts(list);
        const topId = list.length > 0 ? list[0].id : null;
        setLiveAlertId(topId);
        setLoadingLive(false);
      },
    );

    return () => alertUnsub();
  }, [user?.artType, user?.artLocation]);

  // Responses listener for the active live alert
  useEffect(() => {
    if (!liveAlertId) {
      setLiveResponses([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'alerts', liveAlertId, 'responses'),
      snap => {
        const list: AlertResponse[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id,
            name: data.name ?? '',
            location: data.location ?? null,
            acknowledgedAt: data.acknowledgedAt ?? null,
            message: data.message ?? '',
          });
        });
        setLiveResponses(list);
      },
    );

    return () => unsub();
  }, [liveAlertId]);

  // Alert logs listener
  useEffect(() => {
    if (activeTab !== 'Alert Logs' || !user) return;
    setLoadingLogs(true);

    const unsub = onSnapshot(
      query(
        collection(db, 'alerts'),
        where('artType', '==', user.artType),
        where('artLocation', '==', user.artLocation),
        orderBy('createdAt', 'desc'),
      ),
      async snap => {
        const logs: AlertWithResponses[] = [];
        for (const d of snap.docs) {
          const data = d.data() as DocumentData;
          const rSnap = await getDocs(collection(db, 'alerts', d.id, 'responses'));
          const responses: AlertResponse[] = [];
          rSnap.forEach(r => {
            const rd = r.data() as DocumentData;
            responses.push({
              id: r.id,
              name: rd.name ?? '',
              location: rd.location ?? null,
              acknowledgedAt: rd.acknowledgedAt ?? null,
              message: rd.message ?? '',
            });
          });
          logs.push({
            id: d.id,
            message: data.message ?? '',
            status: data.status ?? '',
            createdAt: data.createdAt ?? null,
            responses,
            expanded: false,
          });
        }
        setAlertLogs(logs);
        setLoadingLogs(false);
      },
    );

    return () => unsub();
  }, [activeTab, user?.artType, user?.artLocation]);

  const handleSendAlert = async () => {
    if (!user || !message.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        message: message.trim(),
        artType: user.artType,
        artLocation: user.artLocation,
        creatorId: user.uid,
        creatorRole: 'admin',
        createdAt: serverTimestamp(),
        status: 'open',
      });
      setMessage('');
    } catch (e) {
      console.error('Send alert error', e);
      Alert.alert('Error', 'Failed to send alert.');
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved',
        approvedBy: user?.uid,
        approvedAt: serverTimestamp(),
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to approve.');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalUser) return;
    try {
      await updateDoc(doc(db, 'users', rejectModalUser.id), {
        status: 'rejected',
        rejectionReason: rejectReason.trim() || 'Rejected by admin',
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
      await updateDoc(doc(db, 'users', editModalStaff.id), {
        name: editName.trim(),
        artType: editArtType.trim(),
        artLocation: editArtLocation.trim(),
      });
      setEditModalStaff(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStaff = (staff: StaffMember) => {
    Alert.alert(
      'Remove Staff',
      `Remove ${staff.name} from the system?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', staff.id));
            } catch (e) {
              Alert.alert('Error', 'Failed to remove staff.');
            }
          },
        },
      ],
    );
  };

  const toggleLogExpand = (alertId: string) => {
    setAlertLogs(prev =>
      prev.map(a => (a.id === alertId ? { ...a, expanded: !a.expanded } : a)),
    );
  };

  // Staff Map listener
  useEffect(() => {
    if (activeTab !== 'Staff Map' || !user) return;
    setLoadingStaffMap(true);
    const unsub = onSnapshot(
      query(
        collection(db, 'users'),
        where('role', '==', 'staff'),
        where('artType', '==', user.artType),
        where('artLocation', '==', user.artLocation),
        where('status', '==', 'approved')
      ),
      snap => {
        const locs: Array<{id: string; name: string; latitude: number; longitude: number; lastUpdate?: any}> = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          if (data.location?.latitude && data.location?.longitude) {
            locs.push({
              id: d.id,
              name: data.name ?? 'Staff',
              latitude: data.location.latitude,
              longitude: data.location.longitude,
              lastUpdate: data.location.timestamp ?? null,
            });
          }
        });
        setStaffLocations(locs);
        setLoadingStaffMap(false);
      },
    );
    return () => unsub();
  }, [activeTab, user?.artType, user?.artLocation]);

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

  // ── Render helpers ──────────────────────────────────────────────

  const renderSendAlert = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Send Alert to Unit</Text>
        <Text style={styles.unitLabel}>{user?.artType} • {user?.artLocation}</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Type alert message..."
          placeholderTextColor="#6B7280"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity
          style={[styles.primaryButton, sending && styles.buttonDisabled]}
          onPress={handleSendAlert}
          disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Send Alert</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderApprovals = () => {
    if (loadingPending) return <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View>;
    return (
      <>
        <Modal visible={!!rejectModalUser} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Reject {rejectModalUser?.name}?</Text>
              <TextInput
                style={styles.input}
                placeholder="Rejection reason (optional)"
                placeholderTextColor="#6B7280"
                value={rejectReason}
                onChangeText={setRejectReason}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setRejectModalUser(null); setRejectReason(''); }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={handleRejectConfirm}>
                  <Text style={styles.smallButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <FlatList
          data={pendingUsers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.email} • {item.role}</Text>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(item.id)}>
                  <Text style={styles.smallButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={() => setRejectModalUser(item)}>
                  <Text style={styles.smallButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={pendingUsers.length === 0 ? styles.centerContent : { paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending approvals.</Text>}
        />
      </>
    );
  };

  const renderLiveReport = () => {
    if (loadingLive) return <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View>;
    if (openAlerts.length === 0) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No active alerts right now.</Text>
        </View>
      );
    }
    const currentAlert = openAlerts[0];
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.card, styles.liveAlertCard]}>
          <View style={styles.liveBadgeRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>LIVE ALERT</Text>
          </View>
          <Text style={styles.liveMessage}>{currentAlert.message}</Text>
          <Text style={styles.liveTime}>
            {currentAlert.createdAt ? currentAlert.createdAt.toDate().toLocaleString() : ''}
          </Text>
          <TouchableOpacity
            style={styles.closeAlertButton}
            onPress={() => {
              Alert.alert('Close Alert', 'Mark this alert as resolved?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Close Alert',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await updateDoc(doc(db, 'alerts', currentAlert.id), { status: 'closed', closedAt: serverTimestamp(), closedBy: user?.uid });
                    } catch (e) {
                      Alert.alert('Error', 'Failed to close alert.');
                    }
                  },
                },
              ]);
            }}>
            <Text style={styles.closeAlertButtonText}>Close Alert</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.responseCountCard}>
          <Text style={styles.responseCountText}>
            {liveResponses.length} / {totalStaff} staff responded
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {
              width: totalStaff > 0 ? `${Math.round((liveResponses.length / totalStaff) * 100)}%` : '0%'
            }]} />
          </View>
        </View>

        {liveResponses.map(r => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.cardName}>{r.name}</Text>
            {r.message ? <Text style={styles.responseMsg}>"{r.message}"</Text> : null}
            {r.acknowledgedAt ? (
              <Text style={styles.cardMeta}>
                Acked at {r.acknowledgedAt.toDate().toLocaleTimeString()}
              </Text>
            ) : null}
            {r.location ? (
              <Text style={styles.cardMeta}>
                📍 {r.location.latitude.toFixed(5)}, {r.location.longitude.toFixed(5)}
              </Text>
            ) : null}
          </View>
        ))}
        {liveResponses.length === 0 && (
          <Text style={[styles.emptyText, { textAlign: 'center', marginTop: 16 }]}>
            Waiting for staff responses...
          </Text>
        )}
      </ScrollView>
    );
  };

  const renderDirectory = () => {
    if (loadingStaff) return <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View>;
    return (
      <>
        <Modal visible={!!editModalStaff} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit Staff</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#6B7280"
                value={editName}
                onChangeText={setEditName}
              />
              <TextInput
                style={styles.input}
                placeholder="ART Type"
                placeholderTextColor="#6B7280"
                value={editArtType}
                onChangeText={setEditArtType}
              />
              <TextInput
                style={styles.input}
                placeholder="ART Location"
                placeholderTextColor="#6B7280"
                value={editArtLocation}
                onChangeText={setEditArtLocation}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalStaff(null)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveButton, saving && styles.buttonDisabled]}
                  onPress={handleEditSave}
                  disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.smallButtonText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <FlatList
          data={staffList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.email}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : item.status === 'pending' ? styles.statusPending : styles.statusRejected]}>
                  <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setEditModalStaff(item);
                    setEditName(item.name);
                    setEditArtType(item.artType);
                    setEditArtLocation(item.artLocation);
                  }}>
                  <Text style={styles.smallButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveStaff(item)}>
                  <Text style={styles.smallButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={staffList.length === 0 ? styles.centerContent : { paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No staff in your unit.</Text>}
        />
      </>
    );
  };

  const renderAlertLogs = () => {
    if (loadingLogs) return <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View>;
    
    const filtered = alertLogs.filter(a => {
      if (!logSearchQuery.trim()) return true;
      const q = logSearchQuery.toLowerCase();
      return (a.message ?? '').toLowerCase().includes(q);
    });

    return (
      <>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="Search alerts by message..."
            placeholderTextColor="#6B7280"
            value={logSearchQuery}
            onChangeText={setLogSearchQuery}
          />
          <Text style={styles.resultCount}>{filtered.length} result(s)</Text>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => toggleLogExpand(item.id)} activeOpacity={0.8}>
              <View style={styles.logHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertMessage}>{item.message}</Text>
                  <Text style={styles.cardMeta}>
                    {item.createdAt ? item.createdAt.toDate().toLocaleString() : ''} • {item.responses.length} responses
                  </Text>
                </View>
                <Text style={styles.expandChevron}>{item.expanded ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>
            {item.expanded && (
              <View style={styles.logExpanded}>
                {item.responses.length === 0 ? (
                  <Text style={styles.emptyText}>No responses recorded.</Text>
                ) : (
                  item.responses.map(r => (
                    <View key={r.id} style={styles.logResponseItem}>
                      <Text style={styles.cardName}>{r.name}</Text>
                      {r.message ? <Text style={styles.responseMsg}>"{r.message}"</Text> : null}
                      {r.acknowledgedAt ? (
                        <Text style={styles.cardMeta}>{r.acknowledgedAt.toDate().toLocaleTimeString()}</Text>
                      ) : null}
                      {r.location ? (
                        <Text style={styles.cardMeta}>
                          📍 {r.location.latitude.toFixed(5)}, {r.location.longitude.toFixed(5)}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}
          contentContainerStyle={filtered.length === 0 ? styles.centerContent : { paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No alerts found.</Text>}
        />
      </>
    );
  };

  const renderRescueMap = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, alignItems: 'center' }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mumbai Division ART Rescue Map</Text>
        <Text style={styles.cardMeta}>Scroll to view the full map</Text>
      </View>
      <ScrollView 
        style={styles.rescueMapContainer}
        maximumZoomScale={3}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: 'https://via.placeholder.com/800x1200/1a2035/3b82f6?text=Mumbai+Division+ART+Rescue+Map' }}
          style={styles.rescueMapImage}
          resizeMode="contain"
        />
      </ScrollView>
      <Text style={[styles.cardMeta, { marginTop: 12, textAlign: 'center' }]}>
        Note: Replace the placeholder URL with your actual rescue map image URL
      </Text>
    </ScrollView>
  );

  const renderStaffMap = () => {
    if (loadingStaffMap) return <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View>;

    return (
      <StaffMapView
        staffLocations={staffLocations}
        mapOverlayStyle={styles.mapOverlay}
        emptyTextStyle={styles.emptyText}
      />
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Send Alert': return renderSendAlert();
      case 'Approvals': return renderApprovals();
      case 'Live Report': return renderLiveReport();
      case 'Directory': return renderDirectory();
      case 'Alert Logs': return renderAlertLogs();
      case 'Rescue Map': return renderRescueMap();
      case 'Staff Map': return renderStaffMap();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
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
                {savingProfile ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={T.actionBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={T.header}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={T.appName}>ART Mobilize</Text>
          {user ? (
            <Text style={T.headerSub} numberOfLines={1}>
              {user.name} · Admin · {user.artType} · {user.artLocation}
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={T.tabBar} contentContainerStyle={T.tabBarRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[T.tab, activeTab === tab && T.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[T.tabText, activeTab === tab && T.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: T.screen,
  card: T.card,
  cardLive: T.cardLive,
  sectionTitle: T.sectionTitle,
  unitLabel: { fontSize: 13, color: C.accentLight, marginBottom: S.md },
  textArea: T.textArea,
  input: T.input,
  primaryButton: T.primaryBtn,
  buttonDisabled: T.btnDisabled,
  primaryButtonText: T.primaryBtnText,
  cardName: T.cardName,
  cardMeta: T.cardMeta,
  alertMessage: T.alertMsg,
  rowActions: T.rowActions,
  approveButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', minHeight: 38, backgroundColor: C.success },
  rejectButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', minHeight: 38, backgroundColor: C.danger },
  editButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', minHeight: 38, backgroundColor: C.accent },
  removeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', minHeight: 38, backgroundColor: C.purple },
  smallButtonText: T.actionBtnText,
  statusRow: { flexDirection: 'row', marginTop: S.sm },
  statusBadge: T.badge,
  statusApproved: T.badgeApproved,
  statusPending: T.badgePending,
  statusRejected: T.badgeRejected,
  statusBadgeText: T.badgeText,
  liveBadgeRow: T.liveBadgeRow,
  liveDot: T.liveDot,
  liveLabel: T.liveLabel,
  liveAlertCard: T.cardLive,
  liveMessage: { color: C.text, fontSize: 17, fontWeight: '600', marginBottom: 6 },
  liveTime: { color: C.textSec, fontSize: 12 },
  responseCountCard: T.card,
  responseCountText: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: S.sm },
  progressBar: T.progressBar,
  progressFill: T.progressFill,
  responseMsg: T.responseMsg,
  logHeader: T.logHeader,
  expandChevron: T.expandChevron,
  logExpanded: T.logExpanded,
  logResponseItem: T.logResponseItem,
  emptyText: T.emptyText,
  centerContent: T.centerContent,
  modalOverlay: T.modalOverlay,
  modalCard: T.modalCard,
  modalTitle: T.modalTitle,
  modalActions: T.modalActions,
  cancelButton: T.outlineBtn,
  cancelButtonText: T.outlineBtnText,
  closeAlertButton: { marginTop: S.md, height: 42, borderRadius: R.pill, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  closeAlertButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  searchContainer: { paddingBottom: S.sm },
  resultCount: { color: C.textSec, fontSize: 12, marginTop: 4, textAlign: 'right' },
  rescueMapContainer: { width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH * 1.4, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  rescueMapImage: { width: '100%', height: '100%' },
  mapOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
});

export default AdminDashboard;

