import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import InputField from '../components/InputField';
import { useLocation } from '../context/LocationContext';
import { resolveRequests } from '../data/mockRequests';
import { FALLBACK_COORDS } from '../utils/geo';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const MIN_BAGS = 1;
const MAX_BAGS = 10;

const STATS = [
  { label: 'Total Donations', value: '12', icon: 'water', color: colors.primary },
  { label: 'Current Requests', value: '3', icon: 'pulse', color: '#FF9800' },
];

const HOSPITALS = [
  'City General Hospital (2.4 km)',
  "St. Mary's Medical Center (3.8 km)",
  'Regional Blood Bank (5.2 km)',
  'University Teaching Hospital (8.0 km)',
];

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export default function DashboardScreen({ navigation }) {
  const { location } = useLocation();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(HOSPITALS[0]);
  const [selectedBloodType, setSelectedBloodType] = useState('O+');
  const [bagsCount, setBagsCount] = useState(2);
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);

  const anchor = useMemo(
    () =>
      location?.latitude != null
        ? { lat: location.latitude, lng: location.longitude }
        : FALLBACK_COORDS,
    [location]
  );
  const nearbyRequests = useMemo(() => resolveRequests(anchor), [anchor]);

  const adjustBags = (delta) => {
    setBagsCount((prev) => Math.min(MAX_BAGS, Math.max(MIN_BAGS, prev + delta)));
  };

  const handleBroadcastRequest = () => {
    setShowRequestModal(false);
    navigation.navigate('RequestMatch', {
      hospital: selectedHospital,
      bloodType: selectedBloodType,
      bagsNeeded: bagsCount,
    });
  };

  return (
    <View style={styles.container}>
      <Header onNotificationPress={() => navigation.navigate('Notifications')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* User Greeting & Donor Status */}
        <View style={styles.greetingHeader}>
          <Text style={styles.greeting}>Hi, Agafina</Text>
          <View style={styles.subtextRow}>
            <Ionicons name="water" size={14} color={colors.primary} />
            <Text style={styles.subGreeting}>O+ Donor • {location?.city || 'Douala'}</Text>
          </View>
        </View>

        {/* Primary Action: Request Blood */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => setShowRequestModal(true)}
        >
          <View style={styles.heroIconCircle}>
            <Ionicons name="radio" size={26} color={colors.white} />
          </View>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>Request Blood</Text>
            <Text style={styles.heroSubtitle}>
              Broadcast to nearby donors & hospitals instantly
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </TouchableOpacity>

        {/* 2-Card Stats Row */}
        <View style={styles.statsGrid}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon} size={22} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Live Feed: Compatible Nearby Requests */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.titleWithDot}>
            <View style={styles.pulseDot} />
            <Text style={styles.sectionTitle}>Requests You Can Donate To</Text>
          </View>
          <Text style={styles.compatibilityBadge}>O+ Compatible</Text>
        </View>

        {nearbyRequests.map((item) => {
          const isCritical = item.urgency === 'Critical';
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.urgentCard, isCritical && styles.criticalCardBorder]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Map', { request: item })}
            >
              <View style={styles.urgentCardTop}>
                <View style={styles.bloodBadge}>
                  <Text style={styles.bloodBadgeText}>{item.bloodType}</Text>
                </View>
                <View style={styles.hospitalInfo}>
                  <Text style={styles.hospitalName}>{item.hospital}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.distanceText}>{item.distance}</Text>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  <Text style={styles.bagsStatusText}>
                    {item.bagsAccepted} of {item.bagsNeeded} bags committed (1 bag/donor)
                  </Text>
                </View>
                <View style={[styles.urgencyBadge, isCritical ? styles.badgeCritical : styles.badgeUrgent]}>
                  <Ionicons
                    name={isCritical ? 'alert-circle' : 'time-outline'}
                    size={12}
                    color={colors.white}
                  />
                  <Text style={styles.urgencyText}>{item.urgency}</Text>
                </View>
              </View>

              <View style={styles.cardFooterRow}>
                <Text style={styles.tapToRespond}>Tap to accept 1 bag request & view map</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Automatic Emergency Request Broadcast Modal */}
      <Modal visible={showRequestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleWithRadio}>
                <Ionicons name="radio" size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Automatic Emergency Broadcast</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={24} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <Text style={styles.broadcastSubtext}>
              Instantly notify all compatible donors and hospitals in your travel radius.
            </Text>

            <InputField
              label="Destination Hospital"
              placeholder="Select hospital"
              value={selectedHospital}
              rightIcon="chevron-down"
              icon="medical-outline"
              onPress={() => setShowHospitalPicker(true)}
            />

            <Text style={styles.fieldLabel}>Blood Group Needed</Text>
            <View style={styles.chipRow}>
              {BLOOD_TYPES.map((type) => {
                const selected = type === selectedBloodType;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setSelectedBloodType(type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Amount Needed (Bags)</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperButton, bagsCount <= MIN_BAGS && styles.stepperButtonDisabled]}
                onPress={() => adjustBags(-1)}
                disabled={bagsCount <= MIN_BAGS}
              >
                <Ionicons name="remove" size={20} color={colors.navy} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{bagsCount}</Text>
              <TouchableOpacity
                style={[styles.stepperButton, bagsCount >= MAX_BAGS && styles.stepperButtonDisabled]}
                onPress={() => adjustBags(1)}
                disabled={bagsCount >= MAX_BAGS}
              >
                <Ionicons name="add" size={20} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title="Send Emergency Broadcast"
              icon="radio-outline"
              onPress={handleBroadcastRequest}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* Hospital Picker Sheet */}
      <Modal visible={showHospitalPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerHeaderTitle}>Select Hospital</Text>
              <TouchableOpacity onPress={() => setShowHospitalPicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            {HOSPITALS.map((h) => {
              const selected = h === selectedHospital;
              return (
                <TouchableOpacity
                  key={h}
                  style={styles.hospitalRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedHospital(h);
                    setShowHospitalPicker(false);
                  }}
                >
                  <Ionicons name="medical-outline" size={18} color={colors.primary} />
                  <Text style={styles.hospitalRowText}>{h}</Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
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
    paddingBottom: spacing.xxxl,
  },
  greetingHeader: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.navy,
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  subGreeting: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
  },
  compatibilityBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  urgentCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  criticalCardBorder: {
    borderLeftColor: colors.critical,
  },
  urgentCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bloodBadge: {
    backgroundColor: colors.badgeBlue,
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  bloodBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  distanceText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bullet: {
    fontSize: 12,
    color: colors.textMuted,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  bagsStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeCritical: {
    backgroundColor: colors.critical,
  },
  badgeUrgent: {
    backgroundColor: '#FF9800',
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tapToRespond: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  titleWithRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
  },
  broadcastSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  chipTextSelected: {
    color: colors.white,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy,
    minWidth: 32,
    textAlign: 'center',
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  pickerDone: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hospitalRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
});
