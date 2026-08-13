import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import RadarPulse from '../components/RadarPulse';
import VerifiedBadge from '../components/VerifiedBadge';
import { useVerification } from '../context/VerificationContext';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const REASONS = [
  { icon: 'medkit-outline', text: 'Confirms a licensed doctor has screened your health & eligibility' },
  { icon: 'shield-checkmark-outline', text: 'Builds trust with recipients who see your verified tick' },
  { icon: 'flash-outline', text: 'Verified donors are prioritized for critical requests' },
];

export default function VerificationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { status, requestVerification } = useVerification();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donor Verification</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {status === 'verified' && (
          <View style={styles.card}>
            <View style={styles.verifiedIconCircle}>
              <VerifiedBadge size={56} />
            </View>
            <Text style={styles.title}>You're a verified donor</Text>
            <Text style={styles.description}>
              A doctor has confirmed your health screening. Recipients and hospitals will see a
              verified tick next to your name.
            </Text>
          </View>
        )}

        {status === 'pending' && (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <RadarPulse color={colors.primary} size={120} />
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={36} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>Under review</Text>
            <Text style={styles.description}>
              A licensed doctor is reviewing your health screening. This usually takes 24-48
              hours — we'll notify you as soon as it's confirmed.
            </Text>
          </View>
        )}

        {status === 'unverified' && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="ribbon-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>Get verified</Text>
            <Text style={styles.description}>
              Verification confirms you've been tested and cleared to donate by a licensed
              doctor. Until then, your profile won't show a verified tick.
            </Text>

            <View style={styles.reasonList}>
              {REASONS.map((reason) => (
                <View key={reason.text} style={styles.reasonRow}>
                  <View style={styles.reasonIconCircle}>
                    <Ionicons name={reason.icon} size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.reasonText}>{reason.text}</Text>
                </View>
              ))}
            </View>

            <PrimaryButton
              title="Request Verification"
              icon="ribbon-outline"
              onPress={requestVerification}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  },
  scroll: {
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  iconWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  verifiedIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  reasonList: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  reasonIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
