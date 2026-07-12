import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { COLORS } from '../theme';

export function PulseLoader({ message }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.fullScreen}>
      <Animated.View style={[styles.pulseCircle, { transform: [{ scale }], opacity }]}>
        <Text style={styles.pulseIcon}>💊</Text>
      </Animated.View>
      {message && <Text style={styles.pulseText}>{message}</Text>}
    </View>
  );
}

export function ButtonSpinner({ loading, children }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      const rotation = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1000, useNativeDriver: true })
      );
      rotation.start();
      return () => rotation.stop();
    }
  }, [loading]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.btnLoader}>
      {loading && <Animated.View style={[styles.btnSpinner, { transform: [{ rotate }] }]} />}
      {children}
    </View>
  );
}

export function SkeletonCard({ width, height, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const bgColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E8E8E8', '#F5F5F5'],
  });

  return <Animated.View style={[styles.skeleton, { width: width || '100%', height: height || 20, backgroundColor: bgColor }, style]} />;
}

export function OrderSkeleton() {
  return (
    <View style={styles.skelCard}>
      <View style={styles.skelRow}>
        <SkeletonCard width={120} height={14} />
        <SkeletonCard width={60} height={14} />
      </View>
      <SkeletonCard width={180} height={16} style={{ marginTop: 8 }} />
      <SkeletonCard width={80} height={14} style={{ marginTop: 6 }} />
    </View>
  );
}

export function ProductGridSkeleton() {
  return (
    <View style={styles.prodGrid}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={styles.prodSkel}>
          <SkeletonCard width="100%" height={120} />
          <SkeletonCard width="80%" height={14} style={{ marginTop: 8 }} />
          <SkeletonCard width="50%" height={14} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  pulseCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  pulseIcon: { fontSize: 32 },
  pulseText: { marginTop: 16, fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  btnLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSpinner: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#FFF',
    marginRight: 8,
  },
  skeleton: { borderRadius: 6 },
  skelCard: {
    backgroundColor: '#FFF', padding: 16, marginHorizontal: 15, marginBottom: 10,
    borderRadius: 14, elevation: 1,
  },
  skelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  prodGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  prodSkel: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 14, padding: 10,
    marginBottom: 8,
  },
});
