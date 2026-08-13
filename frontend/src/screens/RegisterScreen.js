import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import Logo from '../components/Logo';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RADIUS_OPTIONS = ['5 km', '10 km', '25 km', '50 km', '100+ km'];

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [city, setCity] = useState('');
  const [travelRadius, setTravelRadius] = useState('25 km');
  const [password, setPassword] = useState('');

  const [showBloodPicker, setShowBloodPicker] = useState(false);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);

  const handleRegister = () => {
    navigation.navigate('LocationPermission');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Logo size="medium" />
            <Text style={styles.subtitle}>Join the donor network</Text>

            <InputField
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
            />
            <InputField
              label="Email Address"
              placeholder="donor@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <InputField
              label="Phone Number"
              placeholder="(555) 000-0000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <InputField
              label="Date of Birth"
              placeholder="mm/dd/yyyy"
              value={dob}
              onChangeText={setDob}
              rightIcon="calendar-outline"
            />
            <InputField
              label="Blood Group"
              placeholder="Select blood type"
              value={bloodGroup}
              rightIcon="chevron-down"
              onPress={() => setShowBloodPicker(true)}
            />
            
            {/* Onboarding Location & Travel Radius */}
            <InputField
              label="City / Location"
              placeholder="e.g., Douala, Cameroon"
              value={city}
              onChangeText={setCity}
              icon="location-outline"
            />
            <InputField
              label="Max Travel Radius (Matching Engine)"
              placeholder="Select max radius"
              value={travelRadius}
              rightIcon="chevron-down"
              icon="navigate-outline"
              onPress={() => setShowRadiusPicker(true)}
            />

            <InputField
              label="Password"
              placeholder="Create a secure password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <PrimaryButton title="Register" onPress={handleRegister} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Blood Group Picker Modal */}
      <Modal visible={showBloodPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowBloodPicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={bloodGroup}
              onValueChange={(val) => setBloodGroup(val)}
            >
              <Picker.Item label="Select blood type" value="" />
              {BLOOD_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>

      {/* Travel Radius Picker Modal */}
      <Modal visible={showRadiusPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowRadiusPicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={travelRadius}
              onValueChange={(val) => setTravelRadius(val)}
            >
              {RADIUS_OPTIONS.map((rad) => (
                <Picker.Item key={rad} label={rad} value={rad} />
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
    backgroundColor: '#2D2D2D',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
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
