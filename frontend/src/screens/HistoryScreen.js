import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const HISTORY_ITEMS = [
  {
    id: 1,
    category: 'Donation Given',
    type: 'O+',
    title: 'City General Hospital',
    date: 'Aug 5, 2026',
    status: 'Completed',
    bags: 2,
    icon: 'water',
  },
  {
    id: 2,
    category: 'Request Fulfilled',
    type: 'A+',
    title: "St. Mary's Medical Center",
    date: 'Jul 28, 2026',
    status: 'Completed',
    bags: 1,
    icon: 'heart',
  },
  {
    id: 3,
    category: 'Platform Support',
    type: '$10',
    title: 'Help Rufa Reach More Donors',
    date: 'Jul 20, 2026',
    status: 'Contribution',
    bags: 0,
    icon: 'gift',
  },
  {
    id: 4,
    category: 'Donation Given',
    type: 'AB+',
    title: 'University Hospital',
    date: 'Jun 30, 2026',
    status: 'Completed',
    bags: 2,
    icon: 'water',
  },
  {
    id: 5,
    category: 'Request Made',
    type: 'B-',
    title: 'Regional Blood Bank',
    date: 'Jun 15, 2026',
    status: 'Cancelled',
    bags: 0,
    icon: 'pulse',
  },
];

const STATUS_STYLES = {
  Completed: { bg: '#E8F5E9', text: colors.success },
  Contribution: { bg: '#E3F2FD', text: '#1565C0' },
  Cancelled: { bg: '#FFEBEE', text: colors.critical },
  Pending: { bg: '#FFF3E0', text: '#FF9800' },
};

export default function HistoryScreen({ navigation }) {
  const [filter, setFilter] = useState('All');

  const filteredItems = filter === 'All'
    ? HISTORY_ITEMS
    : HISTORY_ITEMS.filter((item) => item.category.includes(filter));

  return (
    <View style={styles.container}>
      <Header onNotificationPress={() => navigation.navigate('Notifications')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Activity & History</Text>
        <Text style={styles.subtitle}>Past donations, requests, and community support</Text>

        {/* Summary Impact Bar */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>12</Text>
            <Text style={styles.summaryLabel}>Donations</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>3</Text>
            <Text style={styles.summaryLabel}>Requests</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>$10</Text>
            <Text style={styles.summaryLabel}>Supported</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['All', 'Donation', 'Request', 'Support'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* History List */}
        {filteredItems.map((item) => {
          const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.Pending;
          return (
            <TouchableOpacity key={item.id} style={styles.historyCard} activeOpacity={0.7}>
              <View style={styles.badge}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
                <Text style={styles.badgeText}>{item.type}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.categoryLabel}>{item.category}</Text>
                <Text style={styles.hospital}>{item.title}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.meta}>{item.date}</Text>
                  {item.bags > 0 && (
                    <>
                      <Ionicons name="water-outline" size={12} color={colors.textSecondary} />
                      <Text style={styles.meta}>{item.bags} bag{item.bags > 1 ? 's' : ''}</Text>
                    </>
                  )}
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
    paddingBottom: spacing.xxxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.xxl,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
  },
  filterTextActive: {
    color: colors.white,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  badge: {
    backgroundColor: colors.badgeBlue,
    borderRadius: radius.sm,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    gap: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  info: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hospital: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
