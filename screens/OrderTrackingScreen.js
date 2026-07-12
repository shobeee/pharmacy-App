import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Animated, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { CONFIG } from '../config';

const TRACKING_STEPS = [
  { level: 1, title: 'Order Placed', desc: 'Your order has been received by the pharmacy.', icon: 'receipt-outline' },
  { level: 2, title: 'Confirmed', desc: 'The pharmacy has reviewed and confirmed your order.', icon: 'checkmark-circle-outline' },
  { level: 3, title: 'Processing', desc: 'Your items are being prepared.', icon: 'cube-outline' },
  { level: 4, title: 'Out for Delivery', desc: 'Your package is on its way to you.', icon: 'bicycle-outline' },
  { level: 5, title: 'Completed', desc: 'Package delivered successfully.', icon: 'checkmark-done-circle-outline' },
];

const STATUS_COLORS = {
  1: { bg: '#FFF3E0', text: '#E65100', dot: '#FF9800' },
  2: { bg: '#E3F2FD', text: '#1565C0', dot: '#2196F3' },
  3: { bg: '#F3E5F5', text: '#7B1FA2', dot: '#9C27B0' },
  4: { bg: '#E8F5E9', text: '#2E7D32', dot: '#4CAF50' },
  5: { bg: '#E8F5E9', text: '#1B5E20', dot: '#2E7D32' },
};

export default function OrderTrackingScreen({ route, navigation }) {
  const orderId = route?.params?.orderId;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showItems, setShowItems] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const getStepFromStatus = (status) => {
    if (!status) return 1;
    const s = status.toString().toLowerCase().trim();
    if (s.includes('completed') || s.includes('delivered')) return 5;
    if (s.includes('out for delivery')) return 4;
    if (s.includes('processing')) return 3;
    if (s.includes('confirmed')) return 2;
    if (s.includes('order placed')) return 1;
    return 1;
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      Alert.alert('Tracking Error', 'No order ID provided.');
      return;
    }
    const orderRef = doc(db, 'Orders', orderId);
    const unsubscribe = onSnapshot(orderRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setOrder({ id: docSnapshot.id, ...docSnapshot.data() });
      } else {
        Alert.alert('Error', 'Order document not found.');
      }
      setLoading(false);
    }, (error) => {
      console.error('Firestore Listener Error:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  useEffect(() => {
    const currentStep = getStepFromStatus(order?.status);
    const targetProgress = ((currentStep - 1) / (TRACKING_STEPS.length - 1)) * 100;
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [order?.status]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    if (getStepFromStatus(order?.status) < 5) pulse.start();
    return () => pulse.stop();
  }, [order?.status]);

  const currentStep = getStepFromStatus(order?.status);
  const isCompleted = currentStep >= TRACKING_STEPS.length;
  const statusColors = STATUS_COLORS[currentStep] || STATUS_COLORS[1];
  const canCancel = currentStep <= 2;

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const orderRef = doc(db, 'Orders', orderId);
              await updateDoc(orderRef, { status: 'cancelled' });
              Alert.alert('Cancelled', 'Your order has been cancelled.');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel order. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Reach out to the pharmacy for assistance.',
      [
        { text: 'Call Pharmacy', onPress: () => Linking.openURL('tel:+923001234567') },
        { text: 'Send Email', onPress: () => Linking.openURL('mailto:support@alshifapharmacy.com') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      const orderRef = doc(db, 'Orders', orderId);
      const unsubscribe = onSnapshot(orderRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          setOrder({ id: docSnapshot.id, ...docSnapshot.data() });
        }
        setLoading(false);
      }, () => setLoading(false));
      return () => unsubscribe();
    }, 300);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading tracking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const orderDate = order?.createdAt
    ? new Date(order.createdAt.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : 'N/A';

  const estimatedDelivery = (() => {
    if (isCompleted) return 'Completed';
    const days = Math.max(1, 4 - currentStep);
    if (days === 1) return 'Today';
    return `In ${days} days`;
  })();

  const progressPercent = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Order Tracking</Text>
            <Text style={styles.headerSubtitle}>#{orderId ? orderId.slice(-8).toUpperCase() : 'N/A'}</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusBanner, { backgroundColor: statusColors.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColors.dot }]} />
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusLabel, { color: statusColors.text }]}>
                {TRACKING_STEPS[Math.min(currentStep, TRACKING_STEPS.length) - 1]?.title || 'Completed'}
              </Text>
              <Text style={[styles.statusDesc, { color: statusColors.text }]}>
                {estimatedDelivery === 'Completed' ? 'Order completed successfully' : `Estimated delivery: ${estimatedDelivery}`}
              </Text>
            </View>
            {currentStep < 5 && (
              <Animated.View style={[styles.pulseRing, { opacity: pulseAnim }]}>
                <View style={[styles.pulseInner, { backgroundColor: statusColors.dot }]} />
              </Animated.View>
            )}
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Delivery Progress</Text>
              <Text style={styles.progressPercent}>{Math.round(((currentStep - 1) / (TRACKING_STEPS.length - 1)) * 100)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: progressPercent, backgroundColor: COLORS.primary }]} />
            </View>
          </View>

          <View style={styles.timelineCard}>
            {TRACKING_STEPS.map((step, index) => {
              const isActive = currentStep >= step.level;
              const isCurrent = currentStep === step.level;
              const showLine = index < TRACKING_STEPS.length - 1;

              return (
                <View key={step.level} style={styles.stepRow}>
                  <View style={styles.stepIndicator}>
                    <View style={[
                      styles.stepCircle,
                      isActive && styles.stepCircleActive,
                      isCurrent && styles.stepCircleCurrent,
                    ]}>
                      {isActive ? (
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      ) : (
                        <Ionicons name={step.icon} size={16} color={COLORS.textSecondary} />
                      )}
                    </View>
                    {showLine && (
                      <View style={[styles.stepLine, isActive && { backgroundColor: COLORS.primary }]} />
                    )}
                  </View>
                  <View style={[styles.stepContent, isCurrent && styles.stepContentCurrent]}>
                    <Text style={[styles.stepTitle, isActive && styles.stepTitleActive]}>
                      {step.title}
                    </Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Order Details</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>Order Date</Text>
              <Text style={styles.infoValue}>{orderDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>Total Amount</Text>
              <Text style={styles.infoValue}>{CONFIG.CURRENCY} {Number(order?.totalAmount || order?.total || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>Delivery</Text>
              <Text style={[styles.infoValue, styles.infoValueFlex]}>
                {order?.address || order?.deliveryAddress || 'Address on file'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>Contact</Text>
              <Text style={styles.infoValue}>{order?.phone || 'N/A'}</Text>
            </View>
          </View>

          {order?.items && order.items.length > 0 && (
            <View style={styles.itemsCard}>
              <TouchableOpacity style={styles.itemsHeader} onPress={() => setShowItems(!showItems)} activeOpacity={0.7}>
                <View style={styles.itemsHeaderLeft}>
                  <Ionicons name="cart-outline" size={18} color={COLORS.textPrimary} />
                  <Text style={styles.itemsTitle}>Order Items ({order.items.length})</Text>
                </View>
                <Ionicons
                  name={showItems ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
              {showItems && (
                <View style={styles.itemsList}>
                  {order.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name || item.productName}</Text>
                      <Text style={styles.itemQty}>x{item.quantity || 1}</Text>
                      <Text style={styles.itemPrice}>
                        {CONFIG.CURRENCY} {(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleContactSupport} activeOpacity={0.8}>
              <Ionicons name="headset-outline" size={20} color={COLORS.primary} />
              <Text style={styles.actionBtnText}>Contact Support</Text>
            </TouchableOpacity>
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={handleCancelOrder}
                disabled={cancelling}
                activeOpacity={0.8}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#D32F2F" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={20} color="#D32F2F" />
                    <Text style={[styles.actionBtnText, { color: '#D32F2F' }]}>Cancel Order</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.homeButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="home-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  wrapper: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  refreshBtn: { padding: 4 },

  scrollContent: { padding: 16, paddingBottom: 8 },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  statusTextContainer: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  statusDesc: { fontSize: 13, marginTop: 2, opacity: 0.8 },
  pulseRing: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  pulseInner: { width: 12, height: 12, borderRadius: 6, opacity: 0.4 },

  progressCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  progressPercent: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  progressBarBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  timelineCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepRow: { flexDirection: 'row', minHeight: 72 },
  stepIndicator: { alignItems: 'center', width: 32, marginRight: 14 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  stepCircleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepCircleCurrent: {
    borderWidth: 3, borderColor: '#A5D6A7',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  stepLine: {
    width: 2, flex: 1,
    backgroundColor: COLORS.border,
    position: 'absolute', top: 32, bottom: 0,
    zIndex: 1,
  },
  stepContent: { flex: 1, paddingBottom: 16 },
  stepContentCurrent: {
    backgroundColor: '#F1F8E9',
    marginHorizontal: -8, paddingHorizontal: 12,
    borderRadius: 8, paddingVertical: 4,
  },
  stepTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  stepTitleActive: { color: COLORS.textPrimary },
  stepDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 16 },

  infoCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 8, width: 80 },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
  infoValueFlex: { flex: 1 },

  itemsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  itemsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  itemsHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  itemsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 8 },
  itemsList: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemName: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  itemQty: { fontSize: 13, color: COLORS.textSecondary, marginHorizontal: 12, width: 30, textAlign: 'center' },
  itemPrice: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, width: 80, textAlign: 'right' },

  actionsCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  cancelBtn: { borderColor: '#FFCDD2', backgroundColor: '#FFF5F5' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  footer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  homeButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
