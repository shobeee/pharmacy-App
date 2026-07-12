import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { db } from '../firebaseConfig';
import { COLORS } from '../theme';
import { CONFIG } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';
import { PulseLoader } from '../components/LoadingAnimation';
import { APP_CONFIG } from '../appConfig';

const STATUS_STEPS = APP_CONFIG.statusSteps;

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId } = route?.params || {};
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.email === 'shoaib@developer.com';

  const proceedOrder = async () => {
    if (!order || !order.status) return;
    const currentIndex = STATUS_STEPS.indexOf(order.status);
    if (currentIndex === -1 || currentIndex >= STATUS_STEPS.length - 1) return;
    const nextStatus = STATUS_STEPS[currentIndex + 1];
    try {
      await updateDoc(doc(db, "Orders", orderId), { status: nextStatus });
      setOrder(prev => ({ ...prev, status: nextStatus }));
      Alert.alert("Updated", `Order moved to: ${nextStatus}`);
    } catch (error) {
      Alert.alert("Error", "Could not update order status.");
    }
  };

  useEffect(() => {
    if (!orderId) { navigation.goBack(); return; }
    const fetchOrder = async () => {
      try {
        const orderRef = doc(db, "Orders", orderId);
        const docSnap = await getDoc(orderRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrder({ id: docSnap.id, ...data });
          if (isAdmin && data.hasNewMessage === true) await updateDoc(orderRef, { hasNewMessage: false });
          if (!isAdmin && data.hasNewMessageForUser === true) await updateDoc(orderRef, { hasNewMessageForUser: false });
        }
      } catch (error) {
        Alert.alert("Error", "Could not load details.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, isAdmin]);

  if (loading) return <PulseLoader message="Loading order..." />;

  if (!order) return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#999' }}>Order info unavailable.</Text>
      </View>
    </SafeAreaView>
  );

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const isCompleted = order.status === 'Completed';
  const statusColors = ['#FF9800', '#2196F3', '#9C27B0', '#4CAF50', '#2E7D32'];
  const dateStr = order.createdAt
    ? new Date(order.createdAt.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSub}>#{order.id?.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statusBanner}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[Math.max(0, currentStepIndex)] }]} />
          <View style={styles.statusTextWrap}>
            <Text style={styles.statusLabel}>{order.status}</Text>
            <Text style={styles.statusDate}>{dateStr}</Text>
          </View>
          {!isCompleted && currentStepIndex >= 0 && (
            <View style={[styles.statusStepBadge, { backgroundColor: statusColors[Math.max(0, currentStepIndex)] }]}>
              <Text style={styles.statusStepText}>Step {currentStepIndex + 1}/{STATUS_STEPS.length}</Text>
            </View>
          )}
          {isCompleted && (
            <View style={[styles.statusStepBadge, { backgroundColor: '#2E7D32' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
            </View>
          )}
        </View>

        {isAdmin && !isCompleted && (
          <TouchableOpacity style={styles.proceedBtn} onPress={proceedOrder} activeOpacity={0.8}>
            <Ionicons name="arrow-forward-circle" size={20} color="#FFF" />
            <Text style={styles.proceedBtnText}>  Advance to {STATUS_STEPS[currentStepIndex + 1]?.toUpperCase()}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Order Summary</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{order.customerName || 'Guest'}</Text>
          </View>
          {order.phoneNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{order.phoneNumber}</Text>
            </View>
          )}
          {order.deliveryAddress && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={[styles.infoValue, styles.infoValueFlex]}>{order.deliveryAddress}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment</Text>
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentBadgeText}>{order.paymentMethod || 'COD'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total</Text>
            <Text style={styles.totalValue}>{CONFIG.CURRENCY} {Number(order.totalAmount || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cart-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Items ({order.items?.length || 0})</Text>
          </View>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImg} />
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemMeta}>{CONFIG.CURRENCY} {Number(item.price || 0).toFixed(2)} × {item.quantity}</Text>
              </View>
              <Text style={styles.itemTotal}>{CONFIG.CURRENCY} {(Number(item.price || 0) * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Chat', { orderId: order.id })} activeOpacity={0.8}>
            <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnTrack]} onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })} activeOpacity={0.8}>
            <Ionicons name="navigate-outline" size={20} color="#FF9800" />
            <Text style={[styles.actionBtnText, { color: '#FF9800' }]}>Track</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 30 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statusDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  statusTextWrap: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  statusDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusStepBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginLeft: 8 },
  statusStepText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  proceedBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  proceedBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 8 },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoLabel: { width: 72, fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' },
  infoValueFlex: { textAlign: 'left' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  paymentBadge: { backgroundColor: '#F0F4FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paymentBadgeText: { fontSize: 12, fontWeight: '700', color: '#1565C0' },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F0F2F1', marginRight: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  itemMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 8 },

  actionsCard: { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.surface, padding: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  actionBtnTrack: { borderColor: '#FFE0B2' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});
