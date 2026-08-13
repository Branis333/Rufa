import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

const RING_COUNT = 3;
const RING_DELAY = 600;
const DURATION = 1800;

export default function RadarPulse({ color = '#B2181C', size = 140 }) {
  const animations = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const loops = animations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * RING_DELAY),
          Animated.timing(anim, {
            toValue: 1,
            duration: DURATION,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay((RING_COUNT - 1 - index) * RING_DELAY),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [animations]);

  return (
    <View pointerEvents="none" style={[styles.container, { width: size, height: size }]}>
      {animations.map((anim, index) => {
        const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
        const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
        return (
          <Animated.View
            key={index}
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: color,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
});
