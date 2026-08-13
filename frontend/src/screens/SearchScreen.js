import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import DonorCard from '../components/DonorCard';
import LeafletMap from '../components/LeafletMap';
import { useLocation } from '../context/LocationContext';
import { offsetKm, FALLBACK_COORDS } from '../utils/geo';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const MOCK_DONORS = [
  { id: 1, bloodType: 'A+', distance: '2.4 km away', bags: 'Est. 1-2 bags', verified: true },
  { id: 2, bloodType: 'A+', distance: '3.1 km away', bags: 'Est. 1-2 bags', verified: false },
  { id: 3, bloodType: 'O+', distance: '4.8 km away', bags: 'Est. 2 bags', verified: true },
];

const DONOR_OFFSETS_KM = [
  { dLat: 0.5, dLng: -0.6 },
  { dLat: -0.4, dLng: 0.7 },
  { dLat: 0.9, dLng: 0.1 },
  { dLat: -0.7, dLng: -0.4 },
];

export default function SearchScreen({ navigation }) {
  const { location } = useLocation();
  const [bloodGroup, setBloodGroup] = useState('');
  const [hospital, setHospital] = useState('');
  const [amount, setAmount] = useState('');
  const [searched, setSearched] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const mapCenter = useMemo(
    () =>
      location?.latitude != null
        ? { lat: location.latitude, lng: location.longitude }
        : FALLBACK_COORDS,
    [location]
  );

  const donorMarkers = useMemo(
    () =>
      DONOR_OFFSETS_KM.map((offset, index) => ({
        id: index + 1,
        ...offsetKm(mapCenter, offset.dLat, offset.dLng),
        kind: 'donor',
        label: 'Donor nearby',
      })),
    [mapCenter]
  );

  const handleSearch = () => {
    setSearched(true);
  };

  const handleRequest = () => {
    Alert.alert('Request Sent', 'Your blood donation request has been sent to the donor.');
  };

  return (
    <View style={styles.container}>
      <Header onNotificationPress={() => navigation.navigate('Notifications')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.searchCard}>
          <Text style={styles.title}>Find Blood Donors</Text>

          <InputField
            label="Blood Group"
            placeholder="Select Group"
            value={bloodGroup}
            icon="water-outline"
            rightIcon="chevron-down"
            onPress={() => setShowPicker(true)}
          />
          <InputField
            label="Hospital Location"
            placeholder="Search hospital..."
            value={hospital}
            onChangeText={setHospital}
            icon="medical-outline"
          />
          <InputField
            label="Amount (Bags)"
            placeholder="e.g., 2"
            value={amount}
            onChangeText={setAmount}
            icon="water-outline"
            keyboardType="numeric"
          />

          <PrimaryButton
            title="Search Donors"
            icon="search"
            onPress={handleSearch}
          />
        </View>

        {searched && (
          <>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryTitle}>Potential Donors Found</Text>
                <Text style={styles.summarySub}>Based on 1-2 bags per donor</Text>
              </View>
              <View style={styles.summaryCount}>
                <Text style={styles.countNumber}>12</Text>
                <Text style={styles.countLabel}>Available</Text>
              </View>
            </View>

            {MOCK_DONORS.map((donor) => (
              <DonorCard
                key={donor.id}
                bloodType={donor.bloodType}
                distance={donor.distance}
                bags={donor.bags}
                verified={donor.verified}
                onRequest={handleRequest}
              />
            ))}

            <View style={styles.mapSection}>
              <View style={styles.mapHeader}>
                <Ionicons name="map-outline" size={20} color={colors.primary} />
                <Text style={styles.mapTitle}>Coverage Area</Text>
              </View>
              <View style={styles.mapContainer}>
                <LeafletMap
                  markers={donorMarkers}
                  center={mapCenter}
                  zoom={13}
                  style={styles.map}
                />
                <View style={styles.mapFooter}>
                  <Text style={styles.mapFooterText}>
                    Showing donors within 10km radius
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <Picker selectedValue={bloodGroup} onValueChange={setBloodGroup}>
              <Picker.Item label="Select Group" value="" />
              {BLOOD_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
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
  searchCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  summarySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryCount: {
    alignItems: 'flex-end',
  },
  countNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  countLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  mapSection: {
    marginTop: spacing.lg,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  mapContainer: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  map: {
    height: 220,
    width: '100%',
  },
  mapFooter: {
    backgroundColor: '#F0F0F0',
    padding: spacing.md,
    alignItems: 'center',
  },
  mapFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerDone: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
