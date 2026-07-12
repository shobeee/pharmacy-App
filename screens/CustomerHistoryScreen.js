import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext'; 
import { COLORS } from '../theme';
import { CONFIG } from '../config';

export default function CustomerHistoryScreen({ route }) {
  const { orders } = useCart();
  const { user } = useAuth(); 
  
  // SAFE: Use optional chaining and fallback to undefined
  const targetName = (user?.role === 'admin') ? route.params?.customerName : user?.name;

  // SAFE: Ensure orders exists before filtering
  const customerOrders = orders?.filter(o => o?.customerName === targetName) || [];
  
  // SAFE: Ensure reduce handles missing totals safely
  const totalSpent = customerOrders.reduce((sum, o) => sum + (o?.total || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Order History</Text>
      <Text style={styles.subHeader}>User: {targetName || 'Guest'}</Text>
      <Text style={styles.totalSpent}>Lifetime Spend: {CONFIG.CURRENCY} {totalSpent.toFixed(2)}</Text>

      <FlatList
        data={customerOrders}
        keyExtractor={item => item?.id || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* SAFE: Date check and item properties access */}
            <Text style={styles.date}>
              {item?.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
            </Text>
            <Text style={styles.items}>Items Purchased: {item?.items?.length || 0}</Text>
            <Text style={styles.total}>Total: {CONFIG.CURRENCY} {(item?.total || 0).toFixed(2)}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No purchase history found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  header: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  subHeader: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 8 },
  totalSpent: { fontSize: 16, color: COLORS.primary, marginBottom: 16, fontWeight: '700' },
  card: { padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  date: { fontSize: 14, fontWeight: 'bold' },
  items: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  total: { fontSize: 14, fontWeight: 'bold', marginTop: 8, color: COLORS.primary },
  empty: { textAlign: 'center', marginTop: 50, color: COLORS.textSecondary }
});