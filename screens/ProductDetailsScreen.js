import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { useCart } from '../CartContext';
import { CONFIG } from '../config'; 

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen({ route, navigation }) {
  const { product } = route?.params || {};
  // Safety fallback to empty array to prevent "undefined" error
  const { addToCart, cart: cartItems = [] } = useCart(); 
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => navigation.navigate('Cart')}>
          <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>
            🛒 Cart ({cartItems.length})
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, cartItems]);

  if (!product) return null;

  const outOfStock = product.isOutOfStock;

  const handleIncrease = () => setQuantity(prev => prev + 1);
  const handleDecrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (outOfStock) return;
    addToCart(product, quantity);
    setIsAdded(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" />
        <View style={styles.detailsContainer}>
          <Text style={styles.category}>{product.category?.toUpperCase()}</Text>
          <Text style={styles.name}>{product.name}</Text>
         <Text style={styles.price}>
  {CONFIG.CURRENCY} {product.price}
</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Select Quantity</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.qtyBtn} onPress={handleDecrease}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={handleIncrease}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>Product Details</Text>
          <Text style={styles.description}>
            This item is curated for quality and efficacy. Please ensure to check the expiration date and dosage instructions provided on the packaging.
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.addButton, (isAdded || outOfStock) && styles.addedButton]} 
          onPress={handleAddToCart}
          disabled={isAdded || outOfStock}
        >
          <Text style={styles.addButtonText}>
            {outOfStock ? "Out of Stock" : isAdded ? "Added to Cart" : `Add ${quantity} to Cart`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  image: { width: '100%', height: width * 0.7, marginTop: 10 },
  detailsContainer: { backgroundColor: '#F9F9F9', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, marginTop: -30 },
  category: { color: COLORS.primary, fontWeight: '800', fontSize: 12, letterSpacing: 1.5, marginBottom: 8 },
  name: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  price: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginBottom: 25 },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  qtyBtn: { backgroundColor: '#FFF', width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  qtyBtnText: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  qtyText: { fontSize: 20, fontWeight: '700', marginHorizontal: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  description: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 20 },
  footer: { padding: 20, backgroundColor: '#FFF' },
  addButton: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 20, alignItems: 'center', elevation: 4 },
  addedButton: { backgroundColor: '#8BC34A' },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
}); 