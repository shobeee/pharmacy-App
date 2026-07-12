import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useCart } from '../CartContext';
import { CONFIG } from '../config';

export default function CartScreen({ navigation }) {
  const contextData = useCart() || {};
  const cart = contextData.cart || [];
  const removeFromCart = contextData.removeFromCart || (() => {});
  const updateQuantity = contextData.updateQuantity || (() => {});
  const getCartTotal = contextData.getCartTotal || (() => 0);
  const getCartCount = contextData.getCartCount || (() => 0);
  const [deletingId, setDeletingId] = useState(null);

  const isCartEmpty = !cart || cart.length === 0;
  const cartTotal = getCartTotal();
  const cartCount = getCartCount();

  const handleDelete = (id) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setDeletingId(id);
        setTimeout(() => { removeFromCart(id); setDeletingId(null); }, 200);
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Shopping Cart</Text>
        <Text style={styles.itemCount}>{cartCount} item{cartCount !== 1 ? 's' : ''}</Text>
      </View>

      {isCartEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={56} color={COLORS.border} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Browse our catalog and add items you need.</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="storefront-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id?.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isDeleting = deletingId === item.id;
              return (
                <View style={[styles.cartCard, isDeleting && styles.cartCardDeleting]}>
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                  <View style={styles.detailsContainer}>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.productCategory}>{item.category}</Text>
                    <Text style={styles.productPrice}>{CONFIG.CURRENCY} {parseFloat(item.price).toFixed(2)}</Text>

                    <View style={styles.actionRow}>
                      <View style={styles.quantitySelector}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : handleDelete(item.id)}
                        >
                          <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity style={styles.removeBtn} onPress={() => handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.billDrawer}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal ({cartCount} items)</Text>
              <Text style={styles.billValue}>{CONFIG.CURRENCY} {cartTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery</Text>
              <Text style={styles.freeText}>FREE</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.billRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{CONFIG.CURRENCY} {cartTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutBtn}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Checkout')}
            >
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  itemCount: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 220 },
  cartCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cartCardDeleting: { opacity: 0.5, transform: [{ scale: 0.98 }] },
  productImage: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#F0F2F1' },
  detailsContainer: { flex: 1, marginLeft: 14, justifyContent: 'space-between' },
  productName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  productCategory: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  qtyValue: { paddingHorizontal: 10, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  removeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: COLORS.border },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  shopBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  shopBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  billDrawer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  billLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  billValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  freeText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  totalLabel: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  totalValue: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  checkoutBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 14, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginRight: 8 },
});