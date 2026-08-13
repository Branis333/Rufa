import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import RadarPulse from '../components/RadarPulse';
import LeafletMap from '../components/LeafletMap';
import PrimaryButton from '../components/PrimaryButton';
import VerifiedBadge from '../components/VerifiedBadge';
import { useLocation } from '../context/LocationContext';
import { distanceKm, randomPointNear, interpolate, offsetKm, FALLBACK_COORDS } from '../utils/geo';
import { formatCountdown } from '../utils/time';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const SEARCH_RADIUS_KM = 6;

export default function RequestMatchScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const { hospital, bloodType, bagsNeeded } = route.params;

  const userCoords = useMemo(
    () =>
      location?.latitude != null
        ? { lat: location.latitude, lng: location.longitude }
        : FALLBACK_COORDS,
    [location]
  );

  // The broadcast modal only collects a hospital name, not real coordinates,
  // so we place it a plausible short distance from the requester.
  const hospitalCoords = useMemo(() => offsetKm(userCoords, 2.4, 1.6), [userCoords]);

  const searchCenter = useMemo(
    () => ({
      lat: (userCoords.lat + hospitalCoords.lat) / 2,
      lng: (userCoords.lng + hospitalCoords.lng) / 2,
    }),
    [userCoords, hospitalCoords]
  );

  const [acceptedDonors, setAcceptedDonors] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [reference, setReference] = useState('you');
  const nextIdRef = useRef(1000);

  useEffect(() => {
    let cancelled = false;
    const timeouts = [];

    const scheduleNext = (countSoFar) => {
      if (countSoFar >= bagsNeeded) return;
      const delay = 2000 + Math.random() * 2500;
      const timeoutId = setTimeout(() => {
        if (cancelled) return;
        const coords = randomPointNear(searchCenter, SEARCH_RADIUS_KM);
        const distanceToHospitalKm = distanceKm(coords, hospitalCoords);
        const donorId = `#${nextIdRef.current++}`;
        const donor = {
          id: donorId,
          coords,
          distanceToYou: distanceKm(coords, userCoords).toFixed(1),
          distanceToHospital: distanceToHospitalKm.toFixed(1),
          verified: Math.random() < 0.6,
          status: 'accepted',
          secondsLeft: null,
        };
        setAcceptedDonors((prev) => [...prev, donor]);
        scheduleNext(countSoFar + 1);

        const moveDelay = 2000 + Math.random() * 3000;
        const moveTimeoutId = setTimeout(() => {
          if (cancelled) return;
          const eta = Math.round(distanceToHospitalKm * 15 + 25);
          setAcceptedDonors((prev) =>
            prev.map((d) =>
              d.id === donorId ? { ...d, status: 'moving', secondsLeft: eta, etaTotal: eta } : d
            )
          );
        }, moveDelay);
        timeouts.push(moveTimeoutId);
      }, delay);
      timeouts.push(timeoutId);
    };

    scheduleNext(0);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [bagsNeeded, searchCenter, userCoords, hospitalCoords]);

  useEffect(() => {
    const tickId = setInterval(() => {
      setAcceptedDonors((prev) =>
        prev.map((d) => {
          if (d.status !== 'moving') return d;
          if (d.secondsLeft <= 1) return { ...d, status: 'arrived', secondsLeft: 0 };
          return { ...d, secondsLeft: d.secondsLeft - 1 };
        })
      );
    }, 1000);
    return () => clearInterval(tickId);
  }, []);

  const closestToYouId = useMemo(() => {
    if (!acceptedDonors.length) return null;
    return acceptedDonors.reduce((min, d) =>
      Number(d.distanceToYou) < Number(min.distanceToYou) ? d : min
    ).id;
  }, [acceptedDonors]);

  const closestToHospitalId = useMemo(() => {
    if (!acceptedDonors.length) return null;
    return acceptedDonors.reduce((min, d) =>
      Number(d.distanceToHospital) < Number(min.distanceToHospital) ? d : min
    ).id;
  }, [acceptedDonors]);

  const bagsAccepted = acceptedDonors.length;
  const isFullyMatched = bagsAccepted >= bagsNeeded;
  const progressPercent = Math.min(100, (bagsAccepted / bagsNeeded) * 100);

  const markers = useMemo(
    () => [
      { id: 'user', lat: userCoords.lat, lng: userCoords.lng, kind: 'user', label: 'You' },
      {
        id: 'hospital',
        lat: hospitalCoords.lat,
        lng: hospitalCoords.lng,
        kind: 'hospital',
        label: hospital,
      },
      ...acceptedDonors.map((d) => {
        const pos =
          d.status === 'moving' && d.etaTotal
            ? interpolate(d.coords, hospitalCoords, 1 - d.secondsLeft / d.etaTotal)
            : d.coords;
        return {
          id: d.id,
          lat: pos.lat,
          lng: pos.lng,
          kind: 'donor',
          label:
            d.status === 'moving'
              ? `Donor ${d.id} • En route • ${formatCountdown(d.secondsLeft)}`
              : d.status === 'arrived'
              ? `Donor ${d.id} • Arrived at hospital`
              : `Donor ${d.id} • ${d.distanceToYou} km to you`,
        };
      }),
    ],
    [acceptedDonors, userCoords, hospitalCoords, hospital]
  );

  const routes = useMemo(
    () =>
      acceptedDonors
        .filter((d) => d.status === 'moving')
        .map((d) => ({ from: d.coords, to: hospitalCoords, color: colors.navy })),
    [acceptedDonors, hospitalCoords]
  );

  const mapCenter = reference === 'hospital' ? hospitalCoords : userCoords;

  const handleChatWithDonor = (donor) => {
    navigation.navigate('Chat', { recipientName: `Donor ${donor.id}`, hospital });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finding Donors</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, viewMode === 'list' && styles.tabButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.tabText, viewMode === 'list' && styles.tabTextActive]}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, viewMode === 'map' && styles.tabButtonActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[styles.tabText, viewMode === 'map' && styles.tabTextActive]}>Map</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodBadgeText}>{bloodType}</Text>
          </View>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryTitle}>{hospital}</Text>
            <Text style={styles.summarySub}>
              {bagsAccepted} of {bagsNeeded} bags matched
            </Text>
          </View>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <View style={styles.referenceRow}>
        <Text style={styles.referenceLabel}>Relative to:</Text>
        <TouchableOpacity
          style={[styles.referenceChip, reference === 'you' && styles.referenceChipActive]}
          onPress={() => setReference('you')}
        >
          <Text style={[styles.referenceChipText, reference === 'you' && styles.referenceChipTextActive]}>
            You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.referenceChip, reference === 'hospital' && styles.referenceChipActive]}
          onPress={() => setReference('hospital')}
        >
          <Text
            style={[styles.referenceChipText, reference === 'hospital' && styles.referenceChipTextActive]}
          >
            Hospital
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'map' ? (
        <LeafletMap
          markers={markers}
          routes={routes}
          center={mapCenter}
          zoom={13}
          style={styles.map}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {isFullyMatched ? (
            <View style={styles.matchedBanner}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.matchedText}>
                Fully matched — {bagsNeeded} donor{bagsNeeded > 1 ? 's' : ''} on the way
              </Text>
            </View>
          ) : (
            <View style={styles.searchingRow}>
              <View style={styles.searchingIconWrap}>
                <RadarPulse color={colors.primary} size={90} />
                <Ionicons name="search" size={22} color={colors.primary} />
              </View>
              <Text style={styles.searchingText}>
                Searching for {bagsNeeded - bagsAccepted} more donor
                {bagsNeeded - bagsAccepted > 1 ? 's' : ''}…
              </Text>
            </View>
          )}

          {acceptedDonors.map((donor) => {
            const isClosestToYou = donor.id === closestToYouId;
            const isClosestToHospital = donor.id === closestToHospitalId;
            return (
              <View key={donor.id} style={styles.donorCard}>
                <View style={styles.donorRowTop}>
                  <View style={styles.donorIconCircle}>
                    <Ionicons name="person" size={16} color={colors.white} />
                  </View>
                  <Text style={styles.donorName}>Donor {donor.id}</Text>
                  {donor.verified && <VerifiedBadge size={14} />}
                  {isClosestToYou && isClosestToHospital ? (
                    <View style={[styles.pill, styles.pillCombined]}>
                      <Text style={styles.pillText}>Closest to you & hospital</Text>
                    </View>
                  ) : (
                    <>
                      {isClosestToYou && (
                        <View style={[styles.pill, styles.pillYou]}>
                          <Text style={styles.pillText}>Closest to you</Text>
                        </View>
                      )}
                      {isClosestToHospital && (
                        <View style={[styles.pill, styles.pillHospital]}>
                          <Text style={styles.pillText}>Closest to hospital</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                <Text
                  style={[
                    styles.donorStatusText,
                    donor.status === 'moving' && styles.donorStatusMoving,
                    donor.status === 'arrived' && styles.donorStatusArrived,
                  ]}
                >
                  {donor.status === 'accepted' && 'Accepted • preparing to leave'}
                  {donor.status === 'moving' && `En route • ${formatCountdown(donor.secondsLeft)}`}
                  {donor.status === 'arrived' && 'Arrived at hospital'}
                </Text>

                <View style={styles.donorMetaRow}>
                  <Ionicons name="walk-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.donorMetaText, reference === 'you' && styles.donorMetaEmphasis]}>
                    {donor.distanceToYou} km to you
                  </Text>
                  <Text style={styles.bullet}>•</Text>
                  <Ionicons name="medical-outline" size={13} color={colors.textSecondary} />
                  <Text
                    style={[styles.donorMetaText, reference === 'hospital' && styles.donorMetaEmphasis]}
                  >
                    {donor.distanceToHospital} km to hospital
                  </Text>
                </View>

                <TouchableOpacity style={styles.donorChatButton} onPress={() => handleChatWithDonor(donor)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.white} />
                  <Text style={styles.donorChatButtonText}>Chat</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {isFullyMatched && (
            <PrimaryButton
              title="View on Map"
              icon="map-outline"
              onPress={() => setViewMode('map')}
              style={styles.viewMapBtn}
            />
          )}
        </ScrollView>
      )}
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
  tabRow: {
    flexDirection: 'row',
    margin: spacing.lg,
    marginBottom: 0,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  summaryCard: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bloodBadge: {
    backgroundColor: colors.badgeBlue,
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  bloodBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryTextBlock: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  summarySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  referenceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  referenceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  referenceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  referenceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
  },
  referenceChipTextActive: {
    color: colors.white,
  },
  map: {
    flex: 1,
    margin: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  searchingRow: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  searchingIconWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  searchingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  matchedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#E8F5E9',
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  matchedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
    flex: 1,
  },
  donorCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  donorRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  donorIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pillYou: {
    backgroundColor: colors.primary + '15',
  },
  pillHospital: {
    backgroundColor: '#E3F2FD',
  },
  pillCombined: {
    backgroundColor: '#E8F5E9',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.navy,
  },
  donorStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 36,
    marginBottom: 4,
  },
  donorStatusMoving: {
    color: colors.primary,
  },
  donorStatusArrived: {
    color: colors.success,
  },
  donorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 36,
    marginBottom: spacing.sm,
  },
  donorMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  donorMetaEmphasis: {
    fontWeight: '700',
    color: colors.navy,
  },
  bullet: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  donorChatButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    marginLeft: 36,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  donorChatButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  viewMapBtn: {
    marginTop: spacing.sm,
  },
});
