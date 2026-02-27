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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { C, S, R } from '../theme';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
};

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const ROLES = ['staff', 'admin'] as const;
const ART_TYPES = ['ART-1', 'ART-2', 'ART-3'] as const;
const DESIGNATIONS = ['Staff', 'JE', 'SSE'] as const;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pfNumber, setPfNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [designation, setDesignation] = useState<(typeof DESIGNATIONS)[number] | null>(null);
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number] | null>(null);
  const [artType, setArtType] = useState<(typeof ART_TYPES)[number] | null>(null);
  const [artLocation, setArtLocation] = useState('');
  const [profilePhotoName] = useState('No file selected');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (
      !email ||
      !pfNumber ||
      !name ||
      !mobileNumber ||
      !designation ||
      !role ||
      !artType ||
      !artLocation ||
      !address ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirm password must match.');
      return;
    }

    if (mobileNumber.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid mobile number', 'Please enter a valid mobile number.');
      return;
    }

    if (role === 'admin' && designation === 'Staff') {
      Alert.alert('Role restriction', 'Admin role is only available for SSE/JE designations.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Step 2: Create Firestore document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        pfNumber: pfNumber.trim(),
        mobileNumber: mobileNumber.trim(),
        designation,
        role,
        artType,
        artLocation: artLocation.trim(),
        address: address.trim(),
        profilePhotoUrl: '',
        status: 'pending',
        fcmToken: '',
        createdAt: serverTimestamp(),
      });

      // Step 3: Navigate to pending screen
      Alert.alert('Registration successful', 'Your account is waiting for approval.');
      navigation.navigate('Login');
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error?.message || 'Please try again.';
      setError(message);
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate('Login');
  };

  const onForgotPassword = () => {
    Alert.alert('Forgot Password', 'Please use the Login screen password recovery flow.');
  };

  const renderChip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

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
          <Text style={styles.brandSubtitle}>Emergency Response Management System</Text>

          <View style={styles.topTabs}>
            <TouchableOpacity style={styles.topTabBtn} onPress={goToLogin}>
              <Text style={styles.topTabText}>Login</Text>
            </TouchableOpacity>
            <View style={[styles.topTabBtn, styles.topTabBtnActive]}>
              <Text style={[styles.topTabText, styles.topTabTextActive]}>New User</Text>
            </View>
            <TouchableOpacity style={styles.topTabBtn} onPress={onForgotPassword}>
              <Text style={styles.topTabText}>Forgot Password</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Register to access ART Mobilize</Text>

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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#A0A0B2"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your mobile number"
              placeholderTextColor="#A0A0B2"
              keyboardType="phone-pad"
              value={mobileNumber}
              onChangeText={setMobileNumber}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Designation</Text>
            <View style={styles.chipRow}>
              {DESIGNATIONS.map(d => renderChip(d, designation === d, () => setDesignation(d)))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r}
                  style={styles.roleOption}
                  onPress={() => setRole(r)}>
                  <View style={[styles.radioOuter, role === r && styles.radioOuterActive]}>
                    {role === r ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text style={styles.roleLabel}>{r === 'staff' ? 'Staff' : 'Admin'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>Admin role is only available for SSE/JE designations.</Text>
          </View>

          <View style={[styles.fieldGroup, styles.inlineFields]}>
            <Text style={styles.label}>ART Type</Text>
            <View style={styles.chipRow}>
              {ART_TYPES.map(t => renderChip(t, artType === t, () => setArtType(t)))}
            </View>
            <Text style={styles.label}>ART Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Select location"
              placeholderTextColor="#A0A0B2"
              value={artLocation}
              onChangeText={setArtLocation}
            />
          </View>

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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password (min. 6 characters)"
              placeholderTextColor="#A0A0B2"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Profile Photo</Text>
            <TouchableOpacity
              style={styles.fileButton}
              onPress={() => Alert.alert('Profile Photo', 'File upload will be added in the next iteration.')}
            >
              <Text style={styles.fileButtonText}>Choose File</Text>
              <Text style={styles.fileNameText}>{profilePhotoName}</Text>
            </TouchableOpacity>
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
            <TouchableOpacity onPress={goToLogin}>
              <Text style={styles.linkText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: S.xxl,
    paddingVertical: S.xxxl,
  },
  card: {
    backgroundColor: C.surfaceAlt,
    borderRadius: R.xl,
    padding: S.xxl,
    borderWidth: 1,
    borderColor: C.border,
  },
  brandTitle: {
    color: C.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: C.textSec,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: S.md,
  },
  topTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: S.lg,
  },
  topTabBtn: {
    flex: 1,
    paddingVertical: S.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
  },
  topTabText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  topTabTextActive: {
    color: C.text,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: C.textSec,
    marginBottom: S.lg,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: S.lg,
  },
  label: {
    fontSize: 13,
    color: C.textSec,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.sm,
  },
  chip: {
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.borderLight,
    marginTop: S.sm,
  },
  chipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  chipLabel: {
    color: C.textSec,
    fontSize: 13,
    fontWeight: '500',
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xl,
    marginBottom: S.xs,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: C.accent,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  roleLabel: {
    color: C.text,
    fontSize: 13,
  },
  helperText: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: S.xs,
  },
  inlineFields: {
    gap: S.md,
  },
  textArea: {
    minHeight: 74,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: 15,
  },
  fileButton: {
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    paddingHorizontal: S.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  fileButtonText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  fileNameText: {
    color: C.textSec,
    fontSize: 12,
  },
  errorText: {
    color: '#F97373',
    fontSize: 13,
    marginBottom: S.md,
  },
  primaryButton: {
    height: 50,
    borderRadius: R.pill,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: S.lg,
  },
  footerText: {
    color: C.textMuted,
    fontSize: 13,
  },
  linkText: {
    color: C.accentLight,
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default RegisterScreen;

