import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const NOTIFICATIONS = [
  {
    id: 1,
    title: 'Urgent Blood Request',
    message: 'O+ blood needed at City General Hospital — 2.4 km away',
    time: '5 min ago',
    icon: 'alert-circle',
    unread: true,
  },
  {
    id: 2,
    title: 'Request Accepted',
    message: 'Donor #8492 has accepted your blood request',
    time: '1 hour ago',
    icon: 'checkmark-circle',
    unread: true,
  },
  {
    id: 3,
    title: 'Donation Reminder',
    message: 'You are eligible to donate again in 45 days',
    time: '2 days ago',
    icon: 'water',
    unread: false,
  },
  {
    id: 4,
    title: 'Thank You!',
    message: "Your donation at St. Mary's saved 3 lives",
    time: '1 week ago',
    icon: 'heart',
    unread: false,
  },
];

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Text style={styles.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {NOTIFICATIONS.map((notif) => (
          <TouchableOpacity
            key={notif.id}
            style={[styles.notifCard, notif.unread && styles.unreadCard]}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, notif.unread && styles.iconCircleActive]}>
              <Ionicons
                name={notif.icon}
                size={22}
                color={notif.unread ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.notifContent}>
              <Text style={[styles.notifTitle, notif.unread && styles.unreadTitle]}>
                {notif.title}
              </Text>
              <Text style={styles.notifMessage}>{notif.message}</Text>
              <Text style={styles.notifTime}>{notif.time}</Text>
            </View>
            {notif.unread && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  },
  markAll: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  scroll: {
    padding: spacing.xl,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconCircleActive: {
    backgroundColor: colors.primary + '12',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notifMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
});
