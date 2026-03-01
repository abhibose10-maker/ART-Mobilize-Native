// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { C, S, R } from '../../theme';
// ── Component ─────────────────────────────────────────────────
const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // ✅ DO NOT manually navigate — AppNavigator's onAuthStateChanged
      // reads the Firestore user doc and routes to the correct screen automatically
    } catch (e: any) {
      let msg = 'Login failed. Please try again.';
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (e.code === 'auth/user-not-found') {
        msg = 'No account found with this email.';
      } else if (e.code === 'auth/network-request-failed') {
        msg = 'Network error. Check your internet connection.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.card}>
        <Text style={styles.title}>ART Mobilize</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor="#A0A0B2"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#A0A0B2"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}>
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.primaryButtonText}>Login</Text>
          }
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: C.bg, justifyContent: 'center', paddingHorizontal: S.xxl },
  card:              { backgroundColor: C.surfaceAlt, borderRadius: R.xl, padding: S.xxl, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12 },
  title:             { fontSize: 28, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 4, letterSpacing: -0.5 },
  subtitle:          { fontSize: 14, color: C.textSec, textAlign: 'center', marginBottom: S.xxl },
  fieldGroup:        { marginBottom: S.lg },
  label:             { fontSize: 13, color: C.textSec, marginBottom: 6, fontWeight: '500' },
  input:             { height: 48, borderRadius: R.md, paddingHorizontal: S.md, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 15 },
  errorText:         { color: '#F97373', fontSize: 13, marginBottom: S.md },
  primaryButton:     { height: 50, borderRadius: R.pill, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginTop: S.sm },
  buttonDisabled:    { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  footerRow:         { flexDirection: 'row', justifyContent: 'center', marginTop: S.lg },
  footerText:        { color: C.textMuted, fontSize: 13 },
  linkText:          { color: C.accentLight, fontSize: 13, fontWeight: '600' },
});

export default LoginScreen; // ✅ only default export, no named export