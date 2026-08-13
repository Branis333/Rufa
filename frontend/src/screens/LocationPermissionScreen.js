import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import RadarPulse from '../components/RadarPulse';
import { useLocation } from '../context/LocationContext';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const FEATURES = [
  { icon: 'flash-outline', text: 'Match with nearby donors faster in emergencies' },
  { icon: 'navigate-outline', text: 'Accurate distance to hospitals and blood banks' },
  { icon: 'shield-checkmark-outline', text: 'Only used while you use Rufa — never shared' },
];

export default function LocationPermissionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setLocation } = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goToApp = () => {
    navigation.replace('Main');
  };

  const handleEnableLocation = async () => {
    setError('');
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission was denied. You can enable it later in Settings.');
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;

      let city = null;
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        city = place ? place.city || place.subregion || place.region : null;
      } catch (geocodeError) {
        city = null;
      }

      setLocation({ latitude, longitude, city });
      setLoading(false);
      goToApp();
    } catch (err) {
      setError('Could not get your location. Please try again.');
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#2D2D2D', colors.background, colors.background]}
      style={styles.gradient}
    >
      <TouchableOpacity
        style={[styles.backButton, { paddingTop: insets.top + spacing.md }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.white} />
      </TouchableOpacity>

      <View
        style={[
          styles.content,
          { paddingTop: spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <RadarPulse color={colors.primary} size={140} />
            <View style={styles.iconCircle}>
              <Ionicons name="location" size={40} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.title}>Enable Location</Text>
          <Text style={styles.description}>
            Rufa uses your location to match you with nearby blood requests and donors, and to
            calculate distances to hospitals and blood banks.
          </Text>

          <View style={styles.featureList}>
            {FEATURES.map((feature) => (
              <View key={feature.text} style={styles.featureRow}>
                <View style={styles.featureIconCircle}>
                  <Ionicons name={feature.icon} size={16} color={colors.primary} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title="Enable Location"
            icon="location-outline"
            onPress={handleEnableLocation}
            loading={loading}
          />

          <TouchableOpacity style={styles.skipLink} onPress={goToApp} disabled={loading}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  iconWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
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
  featureList: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  featureIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: colors.critical,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  skipLink: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
