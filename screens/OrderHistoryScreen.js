import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc } from 'firebase/firestore'; 
import { db } from '../firebaseConfig';
import { useAuth } from '../AuthContext';
import { COLORS } from '../theme';
import { CONFIG } from '../config';

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); 

  // FIX: Updated to clear 'hasNewMessageForUser' as established in ProfileScreen
  const markAsRead = async (orderId) => {
    try {
      const orderRef = doc(db, "Orders", orderId);
      await updateDoc(orderRef, { hasNewMessageForUser: false });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, "Orders");
    const q = query(
      ordersRef, 
      where("userId", "==", user.uid), 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setOrders(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, item) => sum + (Number(item?.totalAmount) || 0), 0);

  if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Order History</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{CONFIG.CURRENCY} {totalSpent.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item?.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (!item) return null;
          // Conditional style: yellow background if unread
          const isUnread = item.hasNewMessageForUser === true;
          const dateString = item.createdAt
            ? (item.createdAt.seconds
              ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
              : new Date(item.createdAt).toLocaleDateString())
            : 'N/A';

          return (
            <TouchableOpacity 
              style={[styles.card, isUnread && styles.unreadCard]} 
              onPress={() => {
                markAsRead(item.id);
                navigation.navigate('OrderDetails', { orderId: item.id });
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>#{item.id?.slice(-8).toUpperCase()}</Text>
                {isUnread && <View style={styles.redBadge}><Text style={styles.redBadgeText}>!</Text></View>}
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status || 'Processing'}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.dateText}>{dateString}</Text>
                <Text style={styles.amount}>{CONFIG.CURRENCY} {Number(item.totalAmount || 0).toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No past orders found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
  backText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statsContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#FFF', margin: 16, borderRadius: 12, elevation: 2 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  unreadCard: { backgroundColor: '#FFF9C4' }, // Yellow highlight for unread
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#2E7D32', fontSize: 11, fontWeight: 'bold' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { color: '#666', fontSize: 12 },
  amount: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' },
  redBadge: { backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  redBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 }
});