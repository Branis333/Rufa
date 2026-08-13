import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import RadarPulse from './RadarPulse';
import { useIncomingRequest } from '../context/IncomingRequestContext';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function IncomingRequestOverlay() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { incomingRequest, dismissIncomingRequest } = useIncomingRequest();
  const player = useAudioPlayer(require('../../assets/sounds/alert-beep.wav'));

  useEffect(() => {
    if (incomingRequest) {
      player.loop = true;
      player.seekTo(0);
      player.play();
    } else {
      player.pause();
    }
    return () => {
      player.pause();
    };
  }, [incomingRequest, player]);

  if (!incomingRequest) return null;

  const isCritical = incomingRequest.urgency === 'Critical';

  const handleView = () => {
    dismissIncomingRequest();
    navigation.navigate('Main', { screen: 'Map', params: { request: incomingRequest } });
  };

  const handleDismiss = () => {
    dismissIncomingRequest();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        style={[styles.overlay, { paddingTop: insets.top + spacing.xxxl }]}
      >
        <Text style={styles.badgeLabel}>{isCritical ? 'CRITICAL REQUEST' : 'BLOOD REQUEST'}</Text>

        <View style={styles.iconWrap}>
          <RadarPulse color={colors.white} size={170} />
          <View style={styles.iconCircle}>
            <Ionicons name="water" size={44} color={colors.white} />
          </View>
        </View>

        <Text style={styles.bloodType}>{incomingRequest.bloodType} needed</Text>
        <Text style={styles.hospital}>{incomingRequest.hospital}</Text>
        <Text style={styles.meta}>
          {incomingRequest.distance} • {incomingRequest.recipientName}
        </Text>

        <View style={[styles.buttonRow, { paddingBottom: insets.bottom + spacing.xxl }]}>
          <TouchableOpacity style={styles.actionColumn} onPress={handleDismiss}>
            <View style={styles.dismissButton}>
              <Ionicons name="close" size={28} color={colors.white} />
            </View>
            <Text style={styles.buttonLabel}>Dismiss</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionColumn} onPress={handleView}>
            <View style={styles.viewButton}>
              <Ionicons name="arrow-forward" size={28} color={colors.primary} />
            </View>
            <Text style={styles.buttonLabel}>View Request</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
  },
  iconWrap: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  bloodType: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.white,
  },
  hospital: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.white,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  meta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxxl,
    marginTop: 'auto',
  },
  actionColumn: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  dismissButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  viewButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
});
