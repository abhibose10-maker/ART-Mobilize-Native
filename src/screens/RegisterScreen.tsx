import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

import { auth, db } from '../config/firebase';
import { C, S, R } from '../theme';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  PendingApproval: undefined;
};

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Register'
>;

// ── Constants ──────────────────────────────────────────────
const DIVISION = 'Central Railways Mumbai';

const ROLE_OPTIONS = [
  { label: 'Staff',        value: 'staff',        designations: ['Staff'] },
  { label: 'Admin (Incharge)', value: 'admin',    designations: ['JE', 'SSE'] },
] as const;

const ART_TYPES = ['Rail ART', 'Road ART', 'Medical Van'] as const;

const ART_LOCATIONS: Record<string, string[]> = {
  'Rail ART':    ['Kurla', 'Kalyan'],
  'Road ART':    ['CSMT', 'Kurla', 'Kalyan', 'Panvel'],
  'Medical Van': ['Kalyan', 'Panvel', 'Igatpuri'],
};

type RoleValue = 'staff' | 'admin';
type ArtType = (typeof ART_TYPES)[number];

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pfNumber, setPfNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RoleValue | null>(null);
  const [designation, setDesignation] = useState<string | null>(null);
  const [artType, setArtType] = useState<ArtType | null>(null);
  const [artLocation, setArtLocation] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When role changes reset designation
  const handleRoleSelect = (selectedRole: RoleValue) => {
    setRole(selectedRole);
    setDesignation(null);
  };

  // When ART type changes reset location
  const handleArtTypeSelect = (type: ArtType) => {
    setArtType(type);
    setArtLocation(null);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uid: string): Promise<string> => {
    if (!photoUri) return '';
    const storage = getStorage();
    const response = await fetch(photoUri);
    const blob = await response.blob();
    const storageRef = ref(storage, `profile_photos/${uid}.jpg`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleRegister = async () => {
    if (
      !email || !pfNumber || !name || !mobileNumber ||
      !designation || !role || !artType || !artLocation ||
      !address || !password || !confirmPassword
    ) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    if (mobileNumber.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid mobile', 'Please enter a valid 10 digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1 — Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, email.trim(), password
      );
      const user = userCredential.user;

      // Step 2 — Upload photo if selected
      const photoUrl = await uploadPhoto(user.uid);

      // Step 3 — Save to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid:             user.uid,
        name:            name.trim(),
        email:           email.trim(),
        pfNumber:        pfNumber.trim(),
        mobileNumber:    mobileNumber.trim(),
        designation,
        role,
        division:        DIVISION,
        artType,
        artLocation,
        address:         address.trim(),
        profilePhotoUrl: photoUrl,
        status:          'pending',
        fcmToken:        '',
        createdAt:       serverTimestamp(),
      });

      Alert.alert(
        'Registration Successful',
        'Your account is pending approval by the Divisional Control. You will be notified once approved.'
      );
      navigation.navigate('PendingApproval');

    } catch (err: any) {
      console.error('Registration error:', err);
      let message = 'Registration failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      }
      setError(message);
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const renderChip = (
    label: string,
    active: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Get designations for selected role
  const availableDesignations =
    ROLE_OPTIONS.find(r => r.value === role)?.designations ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>

          <Text style={styles.brandTitle}>ART Mobilize</Text>
          <Text style={styles.brandSubtitle}>
            Emergency Response Management System
          </Text>
          <Text style={styles.divisionBadge}>{DIVISION}</Text>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Register to access ART Mobilize
          </Text>

          {/* Note about SuperAdmin */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️  Divisional Control (SuperAdmin) accounts are assigned
              directly by the developer upon division request.
            </Text>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#A0A0B2"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* PF Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PF Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter PF Number"
              placeholderTextColor="#A0A0B2"
              value={pfNumber}
              onChangeText={setPfNumber}
            />
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#A0A0B2"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Mobile */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 10 digit mobile number"
              placeholderTextColor="#A0A0B2"
              keyboardType="phone-pad"
              value={mobileNumber}
              onChangeText={setMobileNumber}
            />
          </View>

          {/* Role */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.chipRow}>
              {ROLE_OPTIONS.map(r =>
                renderChip(r.label, role === r.value, () =>
                  handleRoleSelect(r.value)
                )
              )}
            </View>
          </View>

          {/* Designation — appears after role selected */}
          {role && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Designation</Text>
              <View style={styles.chipRow}>
                {availableDesignations.map(d =>
                  renderChip(d, designation === d, () => setDesignation(d))
                )}
              </View>
              {role === 'admin' && (
                <Text style={styles.helperText}>
                  Admin (Incharge) role is available for JE and SSE only.
                </Text>
              )}
            </View>
          )}

          {/* ART Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>ART Type</Text>
            <View style={styles.chipRow}>
              {ART_TYPES.map(t =>
                renderChip(t, artType === t, () => handleArtTypeSelect(t))
              )}
            </View>
          </View>

          {/* ART Location — appears after ART type selected */}
          {artType && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>ART Location</Text>
              <View style={styles.chipRow}>
                {ART_LOCATIONS[artType].map(loc =>
                  renderChip(loc, artLocation === loc, () =>
                    setArtLocation(loc)
                  )
                )}
              </View>
            </View>
          )}

          {/* Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter your full address"
              placeholderTextColor="#A0A0B2"
              value={address}
              onChangeText={setAddress}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor="#A0A0B2"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#A0A0B2"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {/* Profile Photo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Profile Photo</Text>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photoPreview}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>
                    📷  Tap to upload photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity onPress={() => setPhotoUri(null)}>
                <Text style={styles.removePhoto}>Remove photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Register</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Login</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  scrollContent:   { flexGrow: 1, paddingHorizontal: S.xxl, paddingVertical: S.xxxl },
  card:            { backgroundColor: C.surfaceAlt, borderRadius: R.xl, padding: S.xxl, borderWidth: 1, borderColor: C.border },
  brandTitle:      { color: C.text, fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 4, letterSpacing: -0.5 },
  brandSubtitle:   { color: C.textSec, fontSize: 12, textAlign: 'center', marginBottom: S.xs },
  divisionBadge:   { color: C.accent, fontSize: 12, textAlign: 'center', fontWeight: '600', marginBottom: S.md },
  title:           { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4, textAlign: 'center' },
  subtitle:        { fontSize: 13, color: C.textSec, marginBottom: S.lg, textAlign: 'center' },
  infoBox:         { backgroundColor: C.bg, borderRadius: R.md, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: S.lg },
  infoText:        { color: C.textSec, fontSize: 12, lineHeight: 18 },
  fieldGroup:      { marginBottom: S.lg },
  label:           { fontSize: 13, color: C.textSec, marginBottom: 6, fontWeight: '500' },
  input:           { height: 48, borderRadius: R.md, paddingHorizontal: S.md, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 15 },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.sm },
  chip:            { paddingHorizontal: S.lg, paddingVertical: S.sm, borderRadius: R.pill, borderWidth: 1, borderColor: C.borderLight },
  chipActive:      { backgroundColor: C.accent, borderColor: C.accent },
  chipLabel:       { color: C.textSec, fontSize: 13, fontWeight: '500' },
  chipLabelActive: { color: '#FFFFFF' },
  helperText:      { color: C.textMuted, fontSize: 12, marginTop: S.xs },
  textArea:        { minHeight: 74, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 15 },
  photoButton:     { borderRadius: R.md, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  photoPreview:    { width: '100%', height: 160, resizeMode: 'cover' },
  photoPlaceholder:     { height: 100, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { color: C.textSec, fontSize: 14 },
  removePhoto:     { color: '#F97373', fontSize: 12, marginTop: S.xs, textAlign: 'right' },
  errorText:       { color: '#F97373', fontSize: 13, marginBottom: S.md },
  primaryButton:   { height: 50, borderRadius: R.pill, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginTop: S.sm },
  buttonDisabled:  { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  footerRow:       { flexDirection: 'row', justifyContent: 'center', marginTop: S.lg },
  footerText:      { color: C.textMuted, fontSize: 13 },
  linkText:        { color: C.accentLight, fontSize: 13, marginLeft: 4, fontWeight: '600' },
});

export default RegisterScreen;