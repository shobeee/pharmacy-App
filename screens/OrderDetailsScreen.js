import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { db } from '../firebaseConfig';
import { COLORS } from '../theme';
import { CONFIG } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';

const STATUS_STEPS = ['Order Placed', 'Confirmed', 'Processing', 'Out for Delivery', 'Completed'];

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId } = route?.params || {};
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin access check
  const isAdmin = user?.role === 'admin' || user?.email === 'shoaib@developer.com';

  const proceedOrder = async () => {
    if (!order || !order.status) return;
    const currentIndex = STATUS_STEPS.indexOf(order.status);
    if (currentIndex === -1 || currentIndex >= STATUS_STEPS.length - 1) return;

    const nextStatus = STATUS_STEPS[currentIndex + 1];
    try {
      await updateDoc(doc(db, "Orders", orderId), { status: nextStatus });
      setOrder(prev => ({ ...prev, status: nextStatus }));
      Alert.alert("Success", `Order updated to: ${nextStatus}`);
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

          // Logic for Admin: Clear their notification flag
          if (isAdmin && data.hasNewMessage === true) {
            await updateDoc(orderRef, { hasNewMessage: false });
          }

          // Logic for User: Clear the "!" mark flag when they open the order
          if (!isAdmin && data.hasNewMessageForUser === true) {
            await updateDoc(orderRef, { hasNewMessageForUser: false });
          }
        }
      } catch (error) { 
        Alert.alert("Error", "Could not load details."); 
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchOrder();
  }, [orderId, isAdmin]);

  if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />;
  if (!order) return <View style={styles.container}><Text style={styles.emptyText}>Order info unavailable.</Text></View>;

  const isCompleted = order.status === 'Completed';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        <View style={styles.headerBox}>
          <Text style={styles.orderTitle}>Order Details</Text>
          <Text style={styles.orderSubtitle}>ID: #{order.id?.slice(-8).toUpperCase()}</Text>
        </View>

        {/* Admin-only Workflow Button */}
        {isAdmin && (
          <TouchableOpacity 
            style={[styles.trackButton, { backgroundColor: isCompleted ? '#BDBDBD' : COLORS.primary }]} 
            disabled={isCompleted}
            onPress={proceedOrder}
          >
            <Text style={styles.btnText}>
              {isCompleted ? 'Order Completed' : `Proceed to ${STATUS_STEPS[STATUS_STEPS.indexOf(order.status) + 1] || 'Final Step'}`}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('Chat', { orderId: order.id })}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
          <Text style={styles.btnText}> Chat regarding this order</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.row}><Text style={styles.label}>Status:</Text><Text style={[styles.val, {color: COLORS.primary}]}>{order.status}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Total:</Text><Text style={styles.val}>{CONFIG.CURRENCY} {Number(order.totalAmount || 0).toFixed(2)}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Products Ordered</Text>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.productRow}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productQty}>x {item.quantity}</Text>
              <Text style={styles.productPrice}>{CONFIG.CURRENCY} {(Number(item.price || 0) * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.trackButton, { backgroundColor: '#FF9800' }]} 
          onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
        >
          <Text style={styles.btnText}>Track Order Live</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  headerBox: { padding: 30, backgroundColor: COLORS.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  orderTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  orderSubtitle: { color: 'rgba(255,255,255,0.7)', marginTop: 5 },
  card: { backgroundColor: '#FFF', margin: 20, marginBottom: 0, padding: 20, borderRadius: 20, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 15, color: '#333' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: '#999', fontWeight: '600' },
  val: { color: '#333', fontWeight: 'bold' },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#EEE' },
  productName: { flex: 2 },
  productQty: { flex: 1, textAlign: 'center' },
  productPrice: { flex: 1, textAlign: 'right', fontWeight: 'bold' },
  trackButton: { margin: 20, padding: 20, borderRadius: 15, alignItems: 'center' },
  chatButton: { marginHorizontal: 20, marginTop: 15, padding: 15, backgroundColor: '#28A745', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#999' }
});