import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../components/LeafletMap';
import PrimaryButton from '../components/PrimaryButton';
import { useLocation } from '../context/LocationContext';
import { distanceKm, interpolate, FALLBACK_COORDS } from '../utils/geo';
import { formatCountdown } from '../utils/time';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const MIN_TRAVEL_SECONDS = 40;
const MAX_TRAVEL_SECONDS = 70;

const ELIGIBILITY_QUESTIONS = [
  {
    id: 'recent_donation',
    text: 'Have you donated blood in the last 3 months?',
    disqualifyIfYes: true,
  },
  {
    id: 'illness',
    text: 'Do you currently have a fever, cold, flu, or infection?',
    disqualifyIfYes: true,
  },
  {
    id: 'medication',
    text: 'Are you on antibiotics or blood-thinning medication?',
    disqualifyIfYes: true,
  },
  {
    id: 'tattoo',
    text: 'Have you had a tattoo or piercing in the last 6 months?',
    disqualifyIfYes: true,
  },
  {
    id: 'weight',
    text: 'Do you weigh at least 50kg (110 lbs)?',
    disqualifyIfYes: false,
  },
];

export default function MapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const { request } = route.params;

  const [accepted, setAccepted] = useState(false);
  const [hasStartedMoving, setHasStartedMoving] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [travelDuration, setTravelDuration] = useState(null);
  const intervalRef = useRef(null);

  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [answers, setAnswers] = useState({});
  const [eligibilityResult, setEligibilityResult] = useState(null);

  const donorCoords = useMemo(
    () =>
      location?.latitude != null
        ? { lat: location.latitude, lng: location.longitude }
        : FALLBACK_COORDS,
    [location]
  );

  const closerTarget = useMemo(() => {
    const dRecipient = distanceKm(donorCoords, request.recipientCoords);
    const dHospital = distanceKm(donorCoords, request.hospitalCoords);
    return dRecipient <= dHospital ? 'recipient' : 'hospital';
  }, [donorCoords, request]);

  useEffect(() => {
    if (!hasStartedMoving) return undefined;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev != null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [hasStartedMoving]);

  const handleOpenEligibility = () => {
    setAnswers({});
    setEligibilityResult(null);
    setShowEligibilityModal(true);
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const failedQuestions = ELIGIBILITY_QUESTIONS.filter(
    (q) => answers[q.id] === q.disqualifyIfYes
  );
  const allAnswered = ELIGIBILITY_QUESTIONS.every((q) => typeof answers[q.id] === 'boolean');

  const handleSubmitEligibility = () => {
    if (!allAnswered) return;
    setEligibilityResult(failedQuestions.length > 0 ? 'ineligible' : 'eligible');
  };

  const handleConfirmEligible = () => {
    setShowEligibilityModal(false);
    setAccepted(true);
  };

  const handleCloseEligibility = () => {
    setShowEligibilityModal(false);
  };

  const handleStartMoving = () => {
    const duration =
      MIN_TRAVEL_SECONDS + Math.floor(Math.random() * (MAX_TRAVEL_SECONDS - MIN_TRAVEL_SECONDS));
    setSecondsLeft(duration);
    setTravelDuration(duration);
    setHasStartedMoving(true);
  };

  const handleDecline = () => {
    setAccepted(false);
    setHasStartedMoving(false);
    setSecondsLeft(null);
    setTravelDuration(null);
    clearInterval(intervalRef.current);
  };

  const handleChat = () => {
    navigation.navigate('Chat', { recipientName: request.recipientName, hospital: request.hospital });
  };

  const handleCompleteDonation = () => {
    navigation.navigate('PostDonation', { hospital: request.hospital });
  };

  const isArrivedReady = hasStartedMoving && secondsLeft === 0;

  const donorDisplayCoords = useMemo(() => {
    if (!hasStartedMoving || !travelDuration) return donorCoords;
    const fraction = 1 - secondsLeft / travelDuration;
    return interpolate(donorCoords, request.hospitalCoords, fraction);
  }, [hasStartedMoving, travelDuration, secondsLeft, donorCoords, request]);

  const markers = useMemo(() => {
    const list = [
      {
        id: 'user',
        lat: donorDisplayCoords.lat,
        lng: donorDisplayCoords.lng,
        kind: 'user',
        label: 'You',
      },
    ];

    if (accepted) {
      list.push({
        id: 'hospital',
        lat: request.hospitalCoords.lat,
        lng: request.hospitalCoords.lng,
        kind: 'hospital',
        label: request.hospital,
      });
      list.push({
        id: 'recipient',
        lat: request.recipientCoords.lat,
        lng: request.recipientCoords.lng,
        kind: 'recipient',
        label: `${request.recipientName}'s location`,
      });
    } else if (closerTarget === 'hospital') {
      list.push({
        id: 'hospital',
        lat: request.hospitalCoords.lat,
        lng: request.hospitalCoords.lng,
        kind: 'hospital',
        label: request.hospital,
      });
    } else {
      list.push({
        id: 'recipient-approx',
        lat: request.recipientCoords.lat,
        lng: request.recipientCoords.lng,
        kind: 'recipient',
        approx: true,
        label: `${request.recipientName} (approximate location)`,
      });
    }

    return list;
  }, [accepted, closerTarget, donorDisplayCoords, request]);

  const routes = useMemo(() => {
    if (!hasStartedMoving) return [];
    return [{ from: donorCoords, to: request.hospitalCoords, color: colors.primary }];
  }, [hasStartedMoving, donorCoords, request]);

  const mapCenter = useMemo(() => {
    if (hasStartedMoving) {
      return {
        lat: (donorCoords.lat + request.hospitalCoords.lat) / 2,
        lng: (donorCoords.lng + request.hospitalCoords.lng) / 2,
      };
    }
    if (accepted) {
      return { lat: request.hospitalCoords.lat, lng: request.hospitalCoords.lng };
    }
    return donorCoords;
  }, [hasStartedMoving, accepted, donorCoords, request]);

  const mapZoom = hasStartedMoving ? 12 : 13;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blood Request</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodBadgeText}>{request.bloodType}</Text>
          </View>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryHospital}>{request.hospital}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.metaText}>{request.recipientName}</Text>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.metaText}>{request.time}</Text>
            </View>
          </View>
          <View
            style={[
              styles.urgencyBadge,
              request.urgency === 'Critical' ? styles.badgeCritical : styles.badgeUrgent,
            ]}
          >
            <Text style={styles.urgencyText}>{request.urgency}</Text>
          </View>
        </View>

        {!accepted ? (
          <View style={styles.actionRow}>
            <PrimaryButton title="Decline" variant="decline" icon="close" onPress={handleDecline} />
            <PrimaryButton
              title="Accept 1 Bag Request"
              icon="checkmark"
              onPress={handleOpenEligibility}
              style={styles.acceptButton}
            />
          </View>
        ) : (
          <View>
            <View style={styles.acceptedRow}>
              <View style={styles.enRouteBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.enRouteText}>
                  {isArrivedReady
                    ? "You've arrived"
                    : hasStartedMoving
                    ? `En route • ${formatCountdown(secondsLeft)}`
                    : 'Accepted • Ready when you are'}
                </Text>
              </View>
              <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.white} />
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>

            {!hasStartedMoving && (
              <PrimaryButton
                title="Start Moving to Hospital"
                icon="navigate-outline"
                onPress={handleStartMoving}
                style={styles.startMovingBtn}
              />
            )}
          </View>
        )}
      </View>

      <View style={styles.mapWrapper}>
        <View style={styles.trackingLabel}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>
            {hasStartedMoving
              ? `En route to ${request.hospital}`
              : accepted
              ? `Ready to head to ${request.hospital}`
              : 'Showing the closer of recipient or hospital'}
          </Text>
        </View>

        <LeafletMap
          markers={markers}
          routes={routes}
          center={mapCenter}
          zoom={mapZoom}
          style={styles.map}
        />

        {isArrivedReady && (
          <View style={styles.bottomInfoCard}>
            <PrimaryButton
              title="Arrived & Complete My 1-Bag Donation"
              icon="checkmark-done"
              onPress={handleCompleteDonation}
            />
          </View>
        )}
      </View>

      <Modal visible={showEligibilityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Eligibility Check</Text>
              <TouchableOpacity onPress={handleCloseEligibility}>
                <Ionicons name="close" size={24} color={colors.navy} />
              </TouchableOpacity>
            </View>

            {eligibilityResult ? (
              <View style={styles.eligibilityResultBox}>
                <Ionicons
                  name={eligibilityResult === 'eligible' ? 'checkmark-circle' : 'close-circle'}
                  size={48}
                  color={eligibilityResult === 'eligible' ? colors.success : colors.critical}
                />
                {eligibilityResult === 'eligible' ? (
                  <>
                    <Text style={styles.eligibilityResultTitle}>You're a good fit!</Text>
                    <Text style={styles.eligibilityResultText}>
                      Based on your answers, you're eligible to donate. Suggesting you to{' '}
                      {request.recipientName} now.
                    </Text>
                    <PrimaryButton
                      title="Continue"
                      icon="checkmark"
                      onPress={handleConfirmEligible}
                      style={{ marginTop: spacing.lg }}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.eligibilityResultTitle}>Not eligible right now</Text>
                    <Text style={styles.eligibilityResultText}>
                      Based on your answers, you shouldn't donate for this request. Please take
                      care of yourself — thank you for being willing to help.
                    </Text>
                    {failedQuestions.map((q) => (
                      <Text key={q.id} style={styles.eligibilityReason}>
                        • {q.text}
                      </Text>
                    ))}
                    <PrimaryButton
                      title="Close"
                      variant="outline"
                      onPress={handleCloseEligibility}
                      style={{ marginTop: spacing.lg }}
                    />
                  </>
                )}
              </View>
            ) : (
              <>
                <Text style={styles.eligibilitySubtext}>
                  A few quick health questions before we suggest you to {request.recipientName}.
                </Text>
                <ScrollView style={styles.eligibilityScroll} showsVerticalScrollIndicator={false}>
                  {ELIGIBILITY_QUESTIONS.map((q) => (
                    <View key={q.id} style={styles.questionBlock}>
                      <Text style={styles.questionText}>{q.text}</Text>
                      <View style={styles.answerRow}>
                        <TouchableOpacity
                          style={[
                            styles.answerChip,
                            answers[q.id] === true && styles.answerChipSelected,
                          ]}
                          onPress={() => handleAnswer(q.id, true)}
                        >
                          <Text
                            style={[
                              styles.answerChipText,
                              answers[q.id] === true && styles.answerChipTextSelected,
                            ]}
                          >
                            Yes
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.answerChip,
                            answers[q.id] === false && styles.answerChipSelected,
                          ]}
                          onPress={() => handleAnswer(q.id, false)}
                        >
                          <Text
                            style={[
                              styles.answerChipText,
                              answers[q.id] === false && styles.answerChipTextSelected,
                            ]}
                          >
                            No
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <PrimaryButton
                  title="Submit"
                  onPress={handleSubmitEligibility}
                  style={{ marginTop: spacing.md, opacity: allAnswered ? 1 : 0.5 }}
                />
              </>
            )}
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
  summaryCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
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
  summaryTextBlock: {
    flex: 1,
  },
  summaryHospital: {
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
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bullet: {
    fontSize: 12,
    color: colors.textMuted,
  },
  urgencyBadge: {
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  acceptButton: {
    flex: 1.5,
  },
  acceptedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startMovingBtn: {
    marginTop: spacing.md,
  },
  enRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.badgeBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  enRouteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  chatButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  mapWrapper: {
    flex: 1,
    margin: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  trackingLabel: {
    position: 'absolute',
    top: spacing.lg,
    alignSelf: 'center',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mapOverlay,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  trackingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
  },
  map: {
    flex: 1,
  },
  bottomInfoCard: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
  },
  eligibilitySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  eligibilityScroll: {
    maxHeight: 360,
  },
  questionBlock: {
    marginBottom: spacing.lg,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  answerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  answerChip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  answerChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  answerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  answerChipTextSelected: {
    color: colors.white,
  },
  eligibilityResultBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  eligibilityResultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  eligibilityResultText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  eligibilityReason: {
    fontSize: 12,
    color: colors.critical,
    alignSelf: 'stretch',
    marginTop: spacing.xs,
  },
});
