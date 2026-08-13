import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

export default function PostDonationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const hospital = route?.params?.hospital || 'City General Hospital';
  const [supported, setSupported] = useState(false);

  const handleSupport = () => {
    setSupported(true);
    Alert.alert('Thank You!', 'Your contribution helps Rufa reach more blood donors in emergency situations.');
  };

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={72} color={colors.success} />
          </View>

          <Text style={styles.title}>Donation Complete</Text>
          <Text style={styles.subtitle}>
            Thank you for donating at {hospital}. Your generosity is directly saving lives today.
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>Bags Donated</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>6</Text>
              <Text style={styles.statLabel}>Lives Helped</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.supportSection}>
            <View style={styles.heartCircle}>
              <Ionicons name="heart" size={24} color={colors.primary} />
            </View>
            <Text style={styles.supportTitle}>Help Rufa reach more donors</Text>
            <Text style={styles.supportSub}>
              Rufa relies on community support to maintain emergency dispatch and map location networks for blood matches.
            </Text>

            {supported ? (
              <View style={styles.thankYouBox}>
                <Ionicons name="heart-circle" size={32} color={colors.primary} />
                <Text style={styles.thankYouText}>You supported Rufa! Thank you.</Text>
              </View>
            ) : (
              <PrimaryButton
                title="Support Rufa"
                icon="heart"
                onPress={handleSupport}
                style={styles.supportBtn}
              />
            )}

            <TouchableOpacity style={styles.notNowBtn} onPress={handleDone}>
              <Text style={styles.notNowText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
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
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xxl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xxl,
  },
  supportSection: {
    width: '100%',
    alignItems: 'center',
  },
  heartCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
  },
  supportSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 18,
  },
  supportBtn: {
    width: '100%',
  },
  thankYouBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: radius.sm,
    width: '100%',
    justifyContent: 'center',
  },
  thankYouText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  notNowBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  notNowText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
