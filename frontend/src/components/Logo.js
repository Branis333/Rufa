import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

export default function Logo({ size = 'medium', showTagline = true }) {
  const dimensions = {
    small: { width: 48, height: 48, fontSize: 18, taglineSize: 8 },
    medium: { width: 72, height: 72, fontSize: 28, taglineSize: 10 },
    large: { width: 100, height: 100, fontSize: 36, taglineSize: 11 },
  }[size];

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo.png')}
        style={{ width: dimensions.width, height: dimensions.height }}
        resizeMode="contain"
      />
      <Text style={[styles.brand, { fontSize: dimensions.fontSize }]}>rufa</Text>
      {showTagline && (
        <Text style={[styles.tagline, { fontSize: dimensions.taglineSize }]}>
          BLOOD DONOR MATCHING
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  brand: {
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    color: colors.textSecondary,
    letterSpacing: 2,
    marginTop: 4,
    fontWeight: '400',
  },
});
