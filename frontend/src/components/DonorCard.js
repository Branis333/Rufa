import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from './PrimaryButton';
import VerifiedBadge from './VerifiedBadge';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

export default function DonorCard({ bloodType, distance, bags, verified, onRequest }) {
  return (
    <View style={styles.card}>
      {verified && (
        <View style={styles.verifiedPill}>
          <VerifiedBadge size={12} />
          <Text style={styles.verifiedPillText}>Verified</Text>
        </View>
      )}
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{bloodType}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>Eligible Donor</Text>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.detail}>{distance}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="water-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.detail}>{bags}</Text>
          </View>
        </View>
      </View>
      <PrimaryButton title="Request" onPress={onRequest} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  verifiedPill: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.badgeBlue,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.badgeBlueText,
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  badge: {
    backgroundColor: colors.badgeBlue,
    borderRadius: radius.sm,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  detail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  button: {
    paddingVertical: spacing.md,
  },
});
