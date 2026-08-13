import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

export default function VerifiedBadge({ size = 15 }) {
  return <Ionicons name="checkmark-circle" size={size} color={colors.badgeBlueText} />;
}
