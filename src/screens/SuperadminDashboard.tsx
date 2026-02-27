import React, { useEffect, useState } from 'react';
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

type SuperadminDashboardProps = {
  route: {
    params?: {
      uid: string;
      name: string;
      role: string;
    };
  };
};

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
  status: string;
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
  responses?: Array<{id: string; name: string; acknowledgedAt?: any}>;
};

const SA_TABS = ['Dispatch', 'Approvals', 'Live Status', 'Past Logs', 'Directory'] as const;
type SATabName = typeof SA_TABS[number];

const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({ route }) => {
  const user = route.params;
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
  };

  // Build ART units list from all users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const unitMap = new Map<string, ArtUnit>();
      snap.forEach(d => {
        const data = d.data() as DocumentData;
        if (data.artType && data.artLocation) {
          const key = `${data.artType}__${data.artLocation}`;
          if (!unitMap.has(key)) {
            unitMap.set(key, {
              artType: data.artType,
              artLocation: data.artLocation,
              selected: false,
            });
          }
        }
      });
      setUnits(prev => {
        // Preserve selection state
        return Array.from(unitMap.values()).map(u => {
          const existing = prev.find(p => p.artType === u.artType && p.artLocation === u.artLocation);
          return existing ? { ...u, selected: existing.selected } : u;
        });
      });
    });
    return () => unsub();
  }, []);

  // Pending admins
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'admin'), where('status', '==', 'pending')),
      snap => {
        const list: AdminUser[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({ id: d.id, name: data.name ?? '', email: data.email ?? '', artType: data.artType ?? '', artLocation: data.artLocation ?? '', status: data.status ?? '' });
        });
        setPendingAdmins(list);
        setLoadingPending(false);
      },
    );
    return () => unsub();
  }, []);

  // All admins for directory
  useEffect(() => {
    if (activeTab !== 'Directory') return;
    const unsub = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'admin')),
      snap => {
        const list: AdminUser[] = [];
        snap.forEach(d => {
          const data = d.data() as DocumentData;
          list.push({ id: d.id, name: data.name ?? '', email: data.email ?? '', artType: data.artType ?? '', artLocation: data.artLocation ?? '', status: data.status ?? '' });
        });
        setAdminList(list);
        setLoadingAdmins(false);
      },
    );
    return () => unsub();
  }, [activeTab]);

  // Contacts
  useEffect(() => {
    if (activeTab !== 'Directory') return;
    const unsub = onSnapshot(collection(db, 'important_contacts'), snap => {
      const list: Contact[] = [];
      snap.forEach(d => {
        const data = d.data() as DocumentData;
        list.push({ id: d.id, name: data.name ?? '', role: data.role ?? '', phone: data.phone ?? '', email: data.email ?? '' });
      });
      setContacts(list);
      setLoadingContacts(false);
    });
    return () => unsub();
  }, [activeTab]);

  // Live Status — open alerts across all units with real-time responses
  useEffect(() => {
    if (activeTab !== 'Live Status') return;
    setLoadingLive(true);
    const unsub = onSnapshot(
      query(collection(db, 'alerts'), where('status', '==', 'open'), orderBy('createdAt', 'desc')),
      async snap => {
        const statuses: LiveUnitStatus[] = [];
        for (const d of snap.docs) {
          const data = d.data() as DocumentData;
          const rSnap = await getDocs(collection(db, 'alerts', d.id, 'responses'));
          const responses: any[] = [];
          rSnap.forEach(r => {
            const rd = r.data() as DocumentData;
            responses.push({
              id: r.id,
              name: rd.name ?? '',
              acknowledgedAt: rd.acknowledgedAt ?? null,
            });
          });
          statuses.push({
            key: d.id,
            artType: data.artType ?? '',
            artLocation: data.artLocation ?? '',
            alert: { id: d.id, message: data.message ?? '', status: data.status ?? 'open', createdAt: data.createdAt ?? null },
            responseCount: rSnap.size,
            responses: responses,
          } as LiveUnitStatus);
        }
        setLiveStatuses(statuses);
        setLoadingLive(false);
      },
    );
    return () => unsub();
  }, [activeTab]);

  // Past Logs
  useEffect(() => {
    if (activeTab !== 'Past Logs') return;
    setLoadingLogs(true);
    const unsub = onSnapshot(
      query(collection(db, 'alerts'), orderBy('createdAt', 'desc')),
      async snap => {
        const list: AlertItem[] = [];
        for (const d of snap.docs) {
          const data = d.data() as DocumentData;
          const rSnap = await getDocs(collection(db, 'alerts', d.id, 'responses'));
          list.push({
            id: d.id,
            message: data.message ?? '',
            status: data.status ?? '',
            artType: data.artType ?? '',
            artLocation: data.artLocation ?? '',
            createdAt: data.createdAt ?? null,
            responseCount: rSnap.size,
            expanded: false,
          });
        }
        setPastAlerts(list);
        setLoadingLogs(false);
      },
    );
    return () => unsub();
  }, [activeTab]);

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
            message: dispatchMessage.trim(),
            artType: u.artType,
            artLocation: u.artLocation,
            creatorId: user?.uid ?? null,
            creatorRole: 'superadmin',
            createdAt: serverTimestamp(),
            status: 'open',
          }),
        ),
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

  const handleApproveAdmin = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'approved', approvedBy: user?.uid, approvedAt: serverTimestamp() });
    } catch (e) {
      Alert.alert('Error', 'Failed to approve.');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalAdmin) return;
    try {
      await updateDoc(doc(db, 'users', rejectModalAdmin.id), {
        status: 'rejected',
        rejectionReason: rejectReason.trim() || 'Rejected by superadmin',
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
      { text: 'Remove', style: 'destructive', onPress: async () => { try { await deleteDoc(doc(db, 'users', admin.id)); } catch (e) { Alert.alert('Error', 'Failed to remove.'); } } },
    ]);
  };

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      const data = { name: contactName.trim(), role: contactRole.trim(), phone: contactPhone.trim(), email: contactEmail.trim() };
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
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteDoc(doc(db, 'important_contacts', contact.id)); } catch (e) { Alert.alert('Error', 'Failed to delete.'); } } },
    ]);
  };

  const openContactModal = (contact: Contact | 'new') => {
    setContactModal(contact);
    if (contact === 'new') {
      setContactName(''); setContactRole(''); setContactPhone(''); setContactEmail('');
    } else {
      setContactName(contact.name); setContactRole(contact.role); setContactPhone(contact.phone); setContactEmail(contact.email);
    }
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

  const togglePastAlertExpand = (id: string) => {
    setPastAlerts(prev => prev.map(a => a.id === id ? { ...a, expanded: !a.expanded } : a));
  };

  // ── Render helpers ──────────────────────────────────────────────

  const renderDispatch = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Select Units</Text>
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
            <Text style={styles.unitText}>{unit.artType} • {unit.artLocation}</Text>
          </TouchableOpacity>
        ))}
        {units.length === 0 && <Text style={styles.emptyText}>No units found.</Text>}
      </View>

      <View style={[styles.card, { marginTop: 0 }]}>
        <Text style={styles.sectionTitle}>Alert Message</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Type alert message for selected units..."
          placeholderTextColor="#6B7280"
          value={dispatchMessage}
          onChangeText={setDispatchMessage}
          multiline
        />
        <Text style={styles.selectedCount}>
          {units.filter(u => u.selected).length} unit(s) selected
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, dispatching && styles.buttonDisabled]}
          onPress={handleDispatch}
          disabled={dispatching}>
          {dispatching ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Dispatch Alert</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderApprovals = () => {
    if (loadingPending) return <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View>;
    return (
      <>
        <Modal visible={!!rejectModalAdmin} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Reject {rejectModalAdmin?.name}?</Text>
              <TextInput style={styles.input} placeholder="Rejection reason (optional)" placeholderTextColor="#6B7280" value={rejectReason} onChangeText={setRejectReason} />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setRejectModalAdmin(null); setRejectReason(''); }}>
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
          data={pendingAdmins}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.email} • {item.artType} • {item.artLocation}</Text>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.approveButton} onPress={() => handleApproveAdmin(item.id)}><Text style={styles.smallButtonText}>Approve</Text></TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={() => setRejectModalAdmin(item)}><Text style={styles.smallButtonText}>Reject</Text></TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={pendingAdmins.length === 0 ? styles.centerContent : { paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending admin approvals.</Text>}
        />
      </>
    );
  };

  const renderLiveStatus = () => {
    if (loadingLive) return <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View>;
    if (liveStatuses.length === 0) return <View style={styles.centerContent}><Text style={styles.emptyText}>No active alerts across any unit.</Text></View>;
    return (
      <FlatList
        data={liveStatuses}
        keyExtractor={item => item.key}
        renderItem={({ item }) => (
          <View style={[styles.card, styles.liveCard]}>
            <View style={styles.liveBadgeRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveUnitLabel}>{item.artType} • {item.artLocation}</Text>
            </View>
            <Text style={styles.liveMessage}>{item.alert.message}</Text>
            <View style={styles.liveFooter}>
              <Text style={styles.cardMeta}>
                {item.alert.createdAt ? item.alert.createdAt.toDate().toLocaleString() : ''}
              </Text>
              <Text style={styles.responseCountBadge}>{item.responseCount} responded</Text>
            </View>
            {item.responses && item.responses.length > 0 && (
              <View style={styles.responsesList}>
                <Text style={[styles.cardMeta, { marginTop: 12, marginBottom: 6, fontWeight: '600' }]}>Responses:</Text>
                {item.responses.map(r => (
                  <View key={r.id} style={styles.responseItem}>
                    <Text style={styles.cardName}>✓ {r.name}</Text>
                    {r.acknowledgedAt && (
                      <Text style={styles.cardMeta}>
                        {r.acknowledgedAt.toDate().toLocaleTimeString()}
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
    if (loadingLogs) return <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View>;
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
          style={[styles.input, { marginBottom: 12 }]}
          placeholder="Search by unit or message..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => togglePastAlertExpand(item.id)} activeOpacity={0.8}>
                <View style={styles.logHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertMessage}>{item.message}</Text>
                    <Text style={styles.cardMeta}>{item.artType} • {item.artLocation}</Text>
                    <Text style={styles.cardMeta}>
                      {item.createdAt ? item.createdAt.toDate().toLocaleString() : ''} • {item.responseCount ?? 0} responses
                    </Text>
                  </View>
                  <Text style={styles.expandChevron}>{item.expanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>
              {item.expanded && (
                <View style={styles.logExpanded}>
                  <Text style={styles.cardMeta}>Status: {item.status?.toUpperCase()}</Text>
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

  const renderDirectory = () => (
    <>
      <Modal visible={!!editAdminModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Admin</Text>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#6B7280" value={editName} onChangeText={setEditName} />
            <TextInput style={styles.input} placeholder="ART Type" placeholderTextColor="#6B7280" value={editArtType} onChangeText={setEditArtType} />
            <TextInput style={styles.input} placeholder="ART Location" placeholderTextColor="#6B7280" value={editArtLocation} onChangeText={setEditArtLocation} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditAdminModal(null)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.approveButton, savingAdmin && styles.buttonDisabled]} onPress={handleSaveAdmin} disabled={savingAdmin}>
                {savingAdmin ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.smallButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!contactModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{contactModal === 'new' ? 'Add Contact' : 'Edit Contact'}</Text>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#6B7280" value={contactName} onChangeText={setContactName} />
            <TextInput style={styles.input} placeholder="Role" placeholderTextColor="#6B7280" value={contactRole} onChangeText={setContactRole} />
            <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#6B7280" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#6B7280" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setContactModal(null)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.approveButton, savingContact && styles.buttonDisabled]} onPress={handleSaveContact} disabled={savingContact}>
                {savingContact ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.smallButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.subTabsRow}>
        <TouchableOpacity
          style={[styles.subTabButton, dirSubTab === 'admins' && styles.subTabActive]}
          onPress={() => setDirSubTab('admins')}>
          <Text style={[styles.subTabText, dirSubTab === 'admins' && styles.subTabTextActive]}>Admins</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabButton, dirSubTab === 'contacts' && styles.subTabActive]}
          onPress={() => setDirSubTab('contacts')}>
          <Text style={[styles.subTabText, dirSubTab === 'contacts' && styles.subTabTextActive]}>Important Contacts</Text>
        </TouchableOpacity>
      </View>

      {dirSubTab === 'admins' ? (
        loadingAdmins ? <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View> : (
          <FlatList
            data={adminList}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.email} • {item.artType} • {item.artLocation}</Text>
                <View style={[styles.statusBadge, item.status === 'approved' ? styles.statusApproved : item.status === 'pending' ? styles.statusPending : styles.statusRejected, { alignSelf: 'flex-start', marginTop: 4 }]}>
                  <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => { setEditAdminModal(item); setEditName(item.name); setEditArtType(item.artType); setEditArtLocation(item.artLocation); }}>
                    <Text style={styles.smallButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveAdmin(item)}>
                    <Text style={styles.smallButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={adminList.length === 0 ? styles.centerContent : { paddingBottom: 40 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No admins found.</Text>}
          />
        )
      ) : (
        loadingContacts ? <View style={styles.centerContent}><ActivityIndicator color="#60A5FA" /></View> : (
          <FlatList
            data={contacts}
            keyExtractor={item => item.id}
            ListHeaderComponent={
              <TouchableOpacity style={[styles.primaryButton, { marginBottom: 12 }]} onPress={() => openContactModal('new')}>
                <Text style={styles.primaryButtonText}>+ Add Contact</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.role}</Text>
                {item.phone ? <Text style={styles.cardMeta}>📞 {item.phone}</Text> : null}
                {item.email ? <Text style={styles.cardMeta}>✉ {item.email}</Text> : null}
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openContactModal(item)}>
                    <Text style={styles.smallButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeButton} onPress={() => handleDeleteContact(item)}>
                    <Text style={styles.smallButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No important contacts yet.</Text>}
          />
        )
      )}
    </>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Dispatch': return renderDispatch();
      case 'Approvals': return renderApprovals();
      case 'Live Status': return renderLiveStatus();
      case 'Past Logs': return renderPastLogs();
      case 'Directory': return renderDirectory();
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
            <Text style={[T.cardMeta, { marginBottom: 12 }]}>Note: You cannot change role</Text>
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
          {user ? <Text style={T.headerSub} numberOfLines={1}>{user.name} · Superadmin</Text> : null}
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
        {SA_TABS.map(tab => (
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
  centerContent: T.centerContent,
  card: T.card,
  liveCard: T.cardLive,
  sectionTitle: T.sectionTitle,
  textArea: T.textArea,
  input: T.input,
  primaryButton: T.primaryBtn,
  buttonDisabled: T.btnDisabled,
  primaryButtonText: T.primaryBtnText,
  selectAllBtn: { paddingVertical: S.sm, marginBottom: S.sm },
  selectAllText: { color: C.accentLight, fontSize: 13, fontWeight: '600' },
  unitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderRadius: R.sm, paddingHorizontal: S.sm, marginBottom: S.xs },
  unitRowSelected: { backgroundColor: C.accentBg },
  checkbox: { width: 22, height: 22, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.borderLight, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: C.accent, borderColor: C.accent },
  checkmark: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  unitText: { color: C.text, fontSize: 14 },
  selectedCount: { color: C.textSec, fontSize: 12, marginBottom: S.md },
  cardName: T.cardName,
  cardMeta: T.cardMeta,
  alertMessage: T.alertMsg,
  rowActions: T.rowActions,
  approveButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', minHeight: 38, backgroundColor: C.success },
  rejectButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', minHeight: 38, backgroundColor: C.danger },
  editButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', minHeight: 38, backgroundColor: C.accent },
  removeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', minHeight: 38, backgroundColor: C.purple },
  smallButtonText: T.actionBtnText,
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.sm, alignSelf: 'flex-start', marginTop: S.xs },
  statusApproved: T.badgeApproved,
  statusPending: T.badgePending,
  statusRejected: T.badgeRejected,
  statusBadgeText: T.badgeText,
  liveBadgeRow: T.liveBadgeRow,
  liveDot: T.liveDot,
  liveUnitLabel: { color: C.danger, fontSize: 12, fontWeight: '700' },
  liveMessage: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  liveFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  responseCountBadge: { color: C.success, fontSize: 12, fontWeight: '600' },
  logHeader: T.logHeader,
  expandChevron: T.expandChevron,
  logExpanded: T.logExpanded,
  emptyText: T.emptyText,
  subTabsRow: T.subTabRow,
  subTabButton: T.subTab,
  subTabActive: T.subTabActive,
  subTabText: T.subTabText,
  subTabTextActive: T.subTabTextActive,
  modalOverlay: T.modalOverlay,
  modalCard: T.modalCard,
  modalTitle: T.modalTitle,
  modalActions: T.modalActions,
  cancelButton: T.outlineBtn,
  cancelButtonText: T.outlineBtnText,
  responsesList: { marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.border },
  responseItem: { paddingVertical: S.xs },
});

export default SuperadminDashboard;

