// src/screens/SuperadminDashboard.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, ScrollView, Modal, Alert, StatusBar,
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

// ── Types ─────────────────────────────────────────────────────
type AlertItem = {
  id: string;
  message: string;
  status: string;
  artType?: string;
  artLocation?: string;
  createdAt?: Timestamp | null;
  responseCount?: number;
  expanded?: boolean;
};

type ArtUnit = {
  artType: string;
  artLocation: string;
  selected: boolean;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  artType: string;
  artLocation: string;
  approved: boolean;
  rejected: boolean;
};

type Contact = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
};

type LiveUnitStatus = {
  key: string;
  artType: string;
  artLocation: string;
  alert: AlertItem;
  responseCount: number;
  responses?: Array<{ id: string; name: string; acknowledgedAt?: any }>;
};

const SA_TABS = ['Dispatch', 'Approvals', 'Live Status', 'Past Logs', 'Directory'] as const;
type SATabName = typeof SA_TABS[number];

// ── Component ─────────────────────────────────────────────────
const SuperadminDashboard: React.FC = () => {
  // ✅ Use authStore instead of route.params
  const { userData } = useAuthStore();
  const division = userData?.division ?? '';

  const [activeTab, setActiveTab] = useState<SATabName>('Dispatch');

  // Dispatch
  const [units, setUnits] = useState<ArtUnit[]>([]);
  const [dispatchMessage, setDispatchMessage] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Approvals
  const [pendingAdmins, setPendingAdmins] = useState<AdminUser[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [rejectModalAdmin, setRejectModalAdmin] = useState<AdminUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Live Status
  const [liveStatuses, setLiveStatuses] = useState<LiveUnitStatus[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);

  // Past Logs
  const [pastAlerts, setPastAlerts] = useState<AlertItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Directory
  const [dirSubTab, setDirSubTab] = useState<'admins' | 'contacts'>('admins');
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [editAdminModal, setEditAdminModal] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editArtType, setEditArtType] = useState('');
  const [editArtLocation, setEditArtLocation] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactModal, setContactModal] = useState<Contact | null | 'new'>(null);
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Edit Profile
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfilePassword, setEditProfilePassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    // AppNavigator onAuthStateChanged handles redirect automatically
  };

  // ── Build ART units list — filtered by division ──────────────
  useEffect(() => {
    if (!division) return;
    const unsub = onSnapshot(
      // ✅ Always filter by division per ARCHITECTURE.md
      query(collection(db, 'users'), where('division', '==', division)),
      snap => {
        const unitMap = new Map<string, ArtUnit>();
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          if (data.artType && data.artLocation) {
            const key = `${data.artType}__${data.artLocation}`;
            if (!unitMap.has(key)) {
              unitMap.set(key, { artType: data.artType, artLocation: data.artLocation, selected: false });
            }
          }
        });
        setUnits(prev =>
          Array.from(unitMap.values()).map(u => {
            const existing = prev.find(p => p.artType === u.artType && p.artLocation === u.artLocation);
            return existing ? { ...u, selected: existing.selected } : u;
          })
        );
      }
    );
    return () => unsub();
  }, [division]);

  // ── Pending Admins — division-filtered, correct field names ──
  useEffect(() => {
    if (!division) return;
    const unsub = onSnapshot(
      query(
        collection(db, 'users'),
        where('role', '==', 'Admin'),           // ✅ Capital A
        where('division', '==', division),       // ✅ Division filter
        where('approved', '==', false),          // ✅ correct field (not status)
        where('rejected', '==', false),
      ),
      snap => {
        const list: AdminUser[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id,
            name: data.name ?? '',
            email: data.email ?? '',
            artType: data.artType ?? '',
            artLocation: data.artLocation ?? '',
            approved: data.approved ?? false,
            rejected: data.rejected ?? false,
          });
        });
        setPendingAdmins(list);
        setLoadingPending(false);
      }
    );
    return () => unsub();
  }, [division]);

  // ── All Admins for Directory — division-filtered ─────────────
  useEffect(() => {
    if (activeTab !== 'Directory' || !division) return;
    const unsub = onSnapshot(
      query(
        collection(db, 'users'),
        where('role', '==', 'Admin'),            // ✅ Capital A
        where('division', '==', division),        // ✅ Division filter
      ),
      snap => {
        const list: AdminUser[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({
            id: d.id,
            name: data.name ?? '',
            email: data.email ?? '',
            artType: data.artType ?? '',
            artLocation: data.artLocation ?? '',
            approved: data.approved ?? false,
            rejected: data.rejected ?? false,
          });
        });
        setAdminList(list);
        setLoadingAdmins(false);
      }
    );
    return () => unsub();
  }, [activeTab, division]);

  // ── Contacts — division scoped ───────────────────────────────
  useEffect(() => {
    if (activeTab !== 'Directory' || !division) return;
    const unsub = onSnapshot(
      query(collection(db, 'important_contacts'), where('division', '==', division)),
      snap => {
        const list: Contact[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({ id: d.id, name: data.name ?? '', role: data.role ?? '', phone: data.phone ?? '', email: data.email ?? '' });
        });
        setContacts(list);
        setLoadingContacts(false);
      }
    );
    return () => unsub();
  }, [activeTab, division]);

  // ── Live Status — division-filtered, correct status value ────
  useEffect(() => {
    if (activeTab !== 'Live Status' || !division) return;
    setLoadingLive(true);
    const unsub = onSnapshot(
      query(
        collection(db, 'alerts'),
        where('division', '==', division),        // ✅ Division filter
        where('status', '==', 'active'),          // ✅ 'active' not 'open'
        orderBy('timestamp', 'desc'),             // ✅ 'timestamp' per schema
      ),
      async snap => {
        const statuses: LiveUnitStatus[] = [];
        for (const d of snap.docs) {
          const data = d.data() as DocumentData;
          const rSnap = await getDocs(collection(db, 'acknowledgements'));
          // Filter acknowledgements for this alert
          const responses: any[] = [];
          rSnap.forEach(r => {
            const rd = r.data() as DocumentData;
            if (rd.alertId === d.id) {
              responses.push({ id: r.id, name: rd.name ?? '', acknowledgedAt: rd.timestamp ?? null });
            }
          });
          statuses.push({
            key: d.id,
            artType: data.artType ?? '',
            artLocation: data.artLocation ?? '',
            alert: { id: d.id, message: data.message ?? '', status: data.status ?? 'active', createdAt: data.timestamp ?? null },
            responseCount: responses.length,
            responses,
          });
        }
        setLiveStatuses(statuses);
        setLoadingLive(false);
      }
    );
    return () => unsub();
  }, [activeTab, division]);

  // ── Past Logs — division-filtered ────────────────────────────
  useEffect(() => {
    if (activeTab !== 'Past Logs' || !division) return;
    setLoadingLogs(true);
    const unsub = onSnapshot(
      query(
        collection(db, 'alerts'),
        where('division', '==', division),        // ✅ Division filter
        orderBy('timestamp', 'desc'),
      ),
      async snap => {
        const list: AlertItem[] = [];
        for (const d of snap.docs) {
          const data = d.data() as DocumentData;
          // Count acknowledgements for this alert
          const rSnap = await getDocs(
            query(collection(db, 'acknowledgements'), where('alertId', '==', d.id))
          );
          list.push({
            id: d.id,
            message: data.message ?? '',
            status: data.status ?? '',
            artType: data.artType ?? '',
            artLocation: data.artLocation ?? '',
            createdAt: data.timestamp ?? null,
            responseCount: rSnap.size,
            expanded: false,
          });
        }
        setPastAlerts(list);
        setLoadingLogs(false);
      }
    );
    return () => unsub();
  }, [activeTab, division]);

  // ── Dispatch ─────────────────────────────────────────────────
  const handleDispatch = async () => {
    const selected = units.filter(u => u.selected);
    if (selected.length === 0 || !dispatchMessage.trim()) {
      Alert.alert('Error', 'Select at least one unit and enter a message.');
      return;
    }
    setDispatching(true);
    try {
      await Promise.all(
        selected.map(u =>
          addDoc(collection(db, 'alerts'), {
            division,                              // ✅ Always include division
            artType: u.artType,
            artLocation: u.artLocation,
            createdBy: userData?.uid ?? '',        // ✅ correct field name
            timestamp: serverTimestamp(),          // ✅ 'timestamp' per schema
            status: 'active',                      // ✅ 'active' not 'open'
          })
        )
      );
      setDispatchMessage('');
      setUnits(prev => prev.map(u => ({ ...u, selected: false })));
      Alert.alert('Success', `Alert dispatched to ${selected.length} unit(s).`);
    } catch (e) {
      Alert.alert('Error', 'Failed to dispatch alerts.');
    } finally {
      setDispatching(false);
    }
  };

  // ── Approve Admin ─────────────────────────────────────────────
  const handleApproveAdmin = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        approved: true,                            // ✅ correct field
        rejected: false,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to approve.');
    }
  };

  // ── Reject Admin ──────────────────────────────────────────────
  const handleRejectConfirm = async () => {
    if (!rejectModalAdmin) return;
    try {
      await updateDoc(doc(db, 'users', rejectModalAdmin.id), {
        approved: false,                           // ✅ correct field
        rejected: true,
      });
      setRejectModalAdmin(null);
      setRejectReason('');
    } catch (e) {
      Alert.alert('Error', 'Failed to reject.');
    }
  };

  const handleSaveAdmin = async () => {
    if (!editAdminModal) return;
    setSavingAdmin(true);
    try {
      await updateDoc(doc(db, 'users', editAdminModal.id), {
        name: editName.trim(),
        artType: editArtType.trim(),
        artLocation: editArtLocation.trim(),
      });
      setEditAdminModal(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleRemoveAdmin = (admin: AdminUser) => {
    Alert.alert('Remove Admin', `Remove ${admin.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try { await deleteDoc(doc(db, 'users', admin.id)); }
          catch (e) { Alert.alert('Error', 'Failed to remove.'); }
        }
      },
    ]);
  };

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      const data = {
        name: contactName.trim(), role: contactRole.trim(),
        phone: contactPhone.trim(), email: contactEmail.trim(),
        division,                                  // ✅ Always include division
      };
      if (contactModal === 'new') {
        await addDoc(collection(db, 'important_contacts'), data);
      } else if (contactModal && typeof contactModal === 'object') {
        await updateDoc(doc(db, 'important_contacts', contactModal.id), data);
      }
      setContactModal(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to save contact.');
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = (contact: Contact) => {
    Alert.alert('Delete Contact', `Delete ${contact.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteDoc(doc(db, 'important_contacts', contact.id)); }
          catch (e) { Alert.alert('Error', 'Failed to delete.'); }
        }
      },
    ]);
  };

  const openContactModal = (contact: Contact | 'new') => {
    setContactModal(contact);
    if (contact === 'new') {
      setContactName(''); setContactRole(''); setContactPhone(''); setContactEmail('');
    } else {
      setContactName(contact.name); setContactRole(contact.role);
      setContactPhone(contact.phone); setContactEmail(contact.email);
    }
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

  const togglePastAlertExpand = (id: string) => {
    setPastAlerts(prev => prev.map(a => a.id === id ? { ...a, expanded: !a.expanded } : a));
  };

  // ── Render Tabs ───────────────────────────────────────────────

  const renderDispatch = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={T.card}>
        <Text style={T.sectionTitle}>Select Units</Text>
        <TouchableOpacity
          style={styles.selectAllBtn}
          onPress={() => {
            const allSelected = units.every(u => u.selected);
            setUnits(prev => prev.map(u => ({ ...u, selected: !allSelected })));
          }}>
          <Text style={styles.selectAllText}>
            {units.every(u => u.selected) ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
        {units.map((unit, idx) => (
          <TouchableOpacity
            key={`${unit.artType}__${unit.artLocation}`}
            style={[styles.unitRow, unit.selected && styles.unitRowSelected]}
            onPress={() => setUnits(prev => prev.map((u, i) => i === idx ? { ...u, selected: !u.selected } : u))}>
            <View style={[styles.checkbox, unit.selected && styles.checkboxSelected]}>
              {unit.selected && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={T.cardName}>{unit.artType} • {unit.artLocation}</Text>
          </TouchableOpacity>
        ))}
        {units.length === 0 && <Text style={T.emptyText}>No units found in your division.</Text>}
      </View>

      <View style={T.card}>
        <Text style={T.sectionTitle}>Alert Message</Text>
        <TextInput
          style={T.textArea}
          placeholder="Type alert message for selected units..."
          placeholderTextColor={C.textMuted}
          value={dispatchMessage}
          onChangeText={setDispatchMessage}
          multiline
        />
        <Text style={T.cardMeta}>{units.filter(u => u.selected).length} unit(s) selected</Text>
        <TouchableOpacity
          style={[T.primaryBtn, { marginTop: S.sm }, dispatching && T.btnDisabled]}
          onPress={handleDispatch}
          disabled={dispatching}>
          {dispatching ? <ActivityIndicator color="#FFF" /> : <Text style={T.primaryBtnText}>Dispatch Alert</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderApprovals = () => {
    if (loadingPending) return <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>;
    return (
      <>
        <Modal visible={!!rejectModalAdmin} transparent animationType="fade">
          <View style={T.modalOverlay}>
            <View style={T.modalCard}>
              <Text style={T.modalTitle}>Reject {rejectModalAdmin?.name}?</Text>
              <TextInput style={T.input} placeholder="Rejection reason (optional)" placeholderTextColor={C.textMuted} value={rejectReason} onChangeText={setRejectReason} />
              <View style={T.modalActions}>
                <TouchableOpacity style={T.outlineBtn} onPress={() => { setRejectModalAdmin(null); setRejectReason(''); }}>
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
          data={pendingAdmins}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={T.card}>
              <Text style={T.cardName}>{item.name}</Text>
              <Text style={T.cardMeta}>{item.email} • {item.artType} • {item.artLocation}</Text>
              <View style={T.rowActions}>
                <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.success }]} onPress={() => handleApproveAdmin(item.id)}>
                  <Text style={T.actionBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.danger }]} onPress={() => setRejectModalAdmin(item)}>
                  <Text style={T.actionBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={pendingAdmins.length === 0 ? T.centerContent : { paddingBottom: 40 }}
          ListEmptyComponent={<Text style={T.emptyText}>No pending admin approvals.</Text>}
        />
      </>
    );
  };

  const renderLiveStatus = () => {
    if (loadingLive) return <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>;
    if (liveStatuses.length === 0) return <View style={T.centerContent}><Text style={T.emptyText}>No active alerts in your division.</Text></View>;
    return (
      <FlatList
        data={liveStatuses}
        keyExtractor={item => item.key}
        renderItem={({ item }) => (
          <View style={[T.card, T.cardLive]}>
            <View style={T.liveBadgeRow}>
              <View style={T.liveDot} />
              <Text style={styles.liveUnitLabel}>{item.artType} • {item.artLocation}</Text>
            </View>
            <Text style={T.alertMsg}>{item.alert.message}</Text>
            <View style={styles.liveFooter}>
              <Text style={T.cardMeta}>
                {item.alert.createdAt ? (item.alert.createdAt as Timestamp).toDate().toLocaleString() : ''}
              </Text>
              <Text style={styles.responseCountBadge}>{item.responseCount} responded</Text>
            </View>
            {item.responses && item.responses.length > 0 && (
              <View style={styles.responsesList}>
                <Text style={[T.cardMeta, { marginTop: S.md, marginBottom: S.sm, fontWeight: '600' }]}>Responses:</Text>
                {item.responses.map(r => (
                  <View key={r.id} style={styles.responseItem}>
                    <Text style={T.cardName}>✓ {r.name}</Text>
                    {r.acknowledgedAt && (
                      <Text style={T.cardMeta}>
                        {(r.acknowledgedAt as Timestamp).toDate().toLocaleTimeString()}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    );
  };

  const renderPastLogs = () => {
    if (loadingLogs) return <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>;
    const filtered = pastAlerts.filter(a => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (a.message ?? '').toLowerCase().includes(q) ||
        (a.artType ?? '').toLowerCase().includes(q) ||
        (a.artLocation ?? '').toLowerCase().includes(q)
      );
    });
    return (
      <>
        <TextInput
          style={[T.input, { marginBottom: S.md }]}
          placeholder="Search by unit or message..."
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={T.card}>
              <TouchableOpacity onPress={() => togglePastAlertExpand(item.id)} activeOpacity={0.8}>
                <View style={T.logHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={T.alertMsg}>{item.message}</Text>
                    <Text style={T.cardMeta}>{item.artType} • {item.artLocation}</Text>
                    <Text style={T.cardMeta}>
                      {item.createdAt ? (item.createdAt as Timestamp).toDate().toLocaleString() : ''} • {item.responseCount ?? 0} responses
                    </Text>
                  </View>
                  <Text style={T.expandChevron}>{item.expanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>
              {item.expanded && (
                <View style={T.logExpanded}>
                  <Text style={T.cardMeta}>Status: {item.status?.toUpperCase()}</Text>
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

  const renderDirectory = () => (
    <>
      <Modal visible={!!editAdminModal} transparent animationType="fade">
        <View style={T.modalOverlay}>
          <View style={T.modalCard}>
            <Text style={T.modalTitle}>Edit Admin</Text>
            <TextInput style={T.input} placeholder="Name" placeholderTextColor={C.textMuted} value={editName} onChangeText={setEditName} />
            <TextInput style={T.input} placeholder="ART Type" placeholderTextColor={C.textMuted} value={editArtType} onChangeText={setEditArtType} />
            <TextInput style={T.input} placeholder="ART Location" placeholderTextColor={C.textMuted} value={editArtLocation} onChangeText={setEditArtLocation} />
            <View style={T.modalActions}>
              <TouchableOpacity style={T.outlineBtn} onPress={() => setEditAdminModal(null)}>
                <Text style={T.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.accent }, savingAdmin && T.btnDisabled]} onPress={handleSaveAdmin} disabled={savingAdmin}>
                {savingAdmin ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={T.actionBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!contactModal} transparent animationType="fade">
        <View style={T.modalOverlay}>
          <View style={T.modalCard}>
            <Text style={T.modalTitle}>{contactModal === 'new' ? 'Add Contact' : 'Edit Contact'}</Text>
            <TextInput style={T.input} placeholder="Name" placeholderTextColor={C.textMuted} value={contactName} onChangeText={setContactName} />
            <TextInput style={T.input} placeholder="Role" placeholderTextColor={C.textMuted} value={contactRole} onChangeText={setContactRole} />
            <TextInput style={T.input} placeholder="Phone" placeholderTextColor={C.textMuted} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
            <TextInput style={T.input} placeholder="Email" placeholderTextColor={C.textMuted} value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" />
            <View style={T.modalActions}>
              <TouchableOpacity style={T.outlineBtn} onPress={() => setContactModal(null)}>
                <Text style={T.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.accent }, savingContact && T.btnDisabled]} onPress={handleSaveContact} disabled={savingContact}>
                {savingContact ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={T.actionBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={T.subTabRow}>
        <TouchableOpacity style={[T.subTab, dirSubTab === 'admins' && T.subTabActive]} onPress={() => setDirSubTab('admins')}>
          <Text style={[T.subTabText, dirSubTab === 'admins' && T.subTabTextActive]}>Admins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[T.subTab, dirSubTab === 'contacts' && T.subTabActive]} onPress={() => setDirSubTab('contacts')}>
          <Text style={[T.subTabText, dirSubTab === 'contacts' && T.subTabTextActive]}>Important Contacts</Text>
        </TouchableOpacity>
      </View>

      {dirSubTab === 'admins' ? (
        loadingAdmins
          ? <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>
          : (
            <FlatList
              data={adminList}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={T.card}>
                  <Text style={T.cardName}>{item.name}</Text>
                  <Text style={T.cardMeta}>{item.email} • {item.artType} • {item.artLocation}</Text>
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
                      onPress={() => { setEditAdminModal(item); setEditName(item.name); setEditArtType(item.artType); setEditArtLocation(item.artLocation); }}>
                      <Text style={T.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.purple }]} onPress={() => handleRemoveAdmin(item)}>
                      <Text style={T.actionBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={adminList.length === 0 ? T.centerContent : { paddingBottom: 40 }}
              ListEmptyComponent={<Text style={T.emptyText}>No admins found.</Text>}
            />
          )
      ) : (
        loadingContacts
          ? <View style={T.centerContent}><ActivityIndicator color={C.accentLight} /></View>
          : (
            <FlatList
              data={contacts}
              keyExtractor={item => item.id}
              ListHeaderComponent={
                <TouchableOpacity style={[T.primaryBtn, { marginBottom: S.md }]} onPress={() => openContactModal('new')}>
                  <Text style={T.primaryBtnText}>+ Add Contact</Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <View style={T.card}>
                  <Text style={T.cardName}>{item.name}</Text>
                  <Text style={T.cardMeta}>{item.role}</Text>
                  {item.phone ? <Text style={T.cardMeta}>📞 {item.phone}</Text> : null}
                  {item.email ? <Text style={T.cardMeta}>✉ {item.email}</Text> : null}
                  <View style={T.rowActions}>
                    <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.accent }]} onPress={() => openContactModal(item)}>
                      <Text style={T.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[T.actionBtn, { backgroundColor: C.danger }]} onPress={() => handleDeleteContact(item)}>
                      <Text style={T.actionBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={<Text style={T.emptyText}>No important contacts yet.</Text>}
            />
          )
      )}
    </>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Dispatch':    return renderDispatch();
      case 'Approvals':   return renderApprovals();
      case 'Live Status': return renderLiveStatus();
      case 'Past Logs':   return renderPastLogs();
      case 'Directory':   return renderDirectory();
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
            <Text style={[T.cardMeta, { marginBottom: S.md }]}>Note: You cannot change your role</Text>
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
            {userData?.name ?? ''} · SuperAdmin · {division}
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
        {SA_TABS.map(tab => (
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
  selectAllBtn:      { paddingVertical: S.sm, marginBottom: S.sm },
  selectAllText:     { color: C.accentLight, fontSize: 13, fontWeight: '600' },
  unitRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderRadius: R.sm, paddingHorizontal: S.sm, marginBottom: S.xs },
  unitRowSelected:   { backgroundColor: C.accentBg },
  checkbox:          { width: 22, height: 22, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.borderLight, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected:  { backgroundColor: C.accent, borderColor: C.accent },
  checkmark:         { color: '#FFF', fontSize: 12, fontWeight: '700' },
  liveUnitLabel:     { color: C.danger, fontSize: 12, fontWeight: '700' },
  liveFooter:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  responseCountBadge:{ color: C.success, fontSize: 12, fontWeight: '600' },
  responsesList:     { marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.border },
  responseItem:      { paddingVertical: S.xs },
});

export default SuperadminDashboard;