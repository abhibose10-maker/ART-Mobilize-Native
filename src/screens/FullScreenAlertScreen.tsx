import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Vibration,
  Animated,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { C, S, R } from '../theme';

type FullScreenAlertScreenProps = {
  route: {
    params: {
      alertId: string;
      message: string;
      artType: string;
      artLocation: string;
      createdAt?: string;
      userName?: string;
    };
  };
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: any) => void;
  };
};

const VIBRATION_PATTERN = [0, 600, 400, 600, 400, 600, 400];

export default function FullScreenAlertScreen({ route, navigation }: FullScreenAlertScreenProps) {
  const { alertId, message, artType, artLocation, createdAt, userName } = route.params;

  const [ackMessage, setAckMessage] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  const player = useAudioPlayer(require('../../assets/siren.mp3'));

  // Start all intrusive effects on mount
  useEffect(() => {
    // Keep screen awake
    activateKeepAwakeAsync('alert').catch(() => {});

    // Siren loop
    try {
      player.loop = true;
      player.play();
    } catch (e) {
      console.warn('Siren play error', e);
    }

    // Continuous vibration
    Vibration.vibrate(VIBRATION_PATTERN, true);

    // Pulse animation on siren icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ).start();

    // Flash background red/dark
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]),
    ).start();

    // Slide up content
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();

    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    try {
      player.pause();
    } catch (_) {}
    Vibration.cancel();
    deactivateKeepAwake('alert');
    pulseAnim.stopAnimation();
    flashAnim.stopAnimation();
  };

  const handleAcknowledge = async () => {
    if (acknowledging || acknowledged) return;
    setAcknowledging(true);

    // Stop effects immediately
    stopAll();

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Not authenticated');

      // Get GPS
      let coords: { latitude: number; longitude: number } | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      } catch (_) {}

      // Save to Firestore
      await setDoc(
        doc(db, 'alerts', alertId, 'responses', uid),
        {
          userId: uid,
          name: userName ?? auth.currentUser?.displayName ?? 'Unknown',
          location: coords,
          acknowledgedAt: serverTimestamp(),
          message: ackMessage.trim(),
        },
      );

      setAcknowledged(true);

      // Navigate back after short delay
      setTimeout(() => {
        navigation.goBack();
      }, 800);
    } catch (e) {
      console.error('Acknowledge error', e);
      // Restart effects if failed
      try { player.loop = true; player.play(); } catch (_) {}
      Vibration.vibrate(VIBRATION_PATTERN, true);
      activateKeepAwakeAsync('alert').catch(() => {});
    } finally {
      setAcknowledging(false);
    }
  };

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0d0000', '#1a0000'],
  });

  const timeLabel = createdAt
    ? new Date(createdAt).toLocaleString()
    : new Date().toLocaleTimeString();

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar backgroundColor="#0d0000" barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>

          {/* Pulsing Siren Icon */}
          <Animated.Text style={[styles.sirenIcon, { transform: [{ scale: pulseAnim }] }]}>
            🚨
          </Animated.Text>

          {/* Title */}
          <Text style={styles.emergencyTitle}>EMERGENCY ALERT</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Alert Message */}
          <Text style={styles.alertMessage}>{message}</Text>

          {/* Unit Info */}
          <View style={styles.unitBadge}>
            <Text style={styles.unitBadgeText}>{artType} • {artLocation}</Text>
          </View>

          {/* Time */}
          <Text style={styles.timeText}>{timeLabel}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Optional Message Input */}
          <Text style={styles.inputLabel}>Optional response message:</Text>
          <TextInput
            style={styles.ackInput}
            placeholder="e.g. 'On my way', 'Need backup'..."
            placeholderTextColor="#6B7280"
            value={ackMessage}
            onChangeText={setAckMessage}
            multiline
            editable={!acknowledging && !acknowledged}
          />

          {/* Acknowledge Button */}
          {acknowledged ? (
            <View style={styles.acknowledgedBanner}>
              <Text style={styles.acknowledgedText}>✓ Acknowledged</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.ackButton, acknowledging && styles.ackButtonDisabled]}
              onPress={handleAcknowledge}
              disabled={acknowledging}
              activeOpacity={0.85}>
              {acknowledging ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : (
                <>
                  <Text style={styles.ackButtonText}>✓  ACKNOWLEDGE</Text>
                  <Text style={styles.ackButtonSub}>Tap to confirm you received this alert</Text>
                </>
              )}
            </TouchableOpacity>
          )}

        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  content: {
    alignItems: 'center',
  },
  sirenIcon: {
    fontSize: 88,
    marginBottom: 16,
  },
  emergencyTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#3f0000',
    marginVertical: 20,
  },
  alertMessage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 20,
  },
  unitBadge: {
    backgroundColor: '#3f0000',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  unitBadgeText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  ackInput: {
    width: '100%',
    minHeight: 80,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#0a0000',
    padding: 14,
    color: C.text,
    textAlignVertical: 'top',
    marginBottom: S.xxl,
    fontSize: 15,
  },
  ackButton: {
    width: '100%',
    minHeight: 72,
    borderRadius: R.xl,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  ackButtonDisabled: {
    backgroundColor: '#14532D',
    opacity: 0.8,
  },
  ackButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  ackButtonSub: {
    color: '#BBF7D0',
    fontSize: 12,
    marginTop: 4,
  },
  acknowledgedBanner: {
    width: '100%',
    height: 72,
    borderRadius: R.xl,
    backgroundColor: C.successDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  acknowledgedText: {
    color: '#4ADE80',
    fontSize: 20,
    fontWeight: '700',
  },
});
