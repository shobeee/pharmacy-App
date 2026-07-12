import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, Image, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 
import { COLORS, currentPharmacyConfig } from '../theme';
import { useCart } from '../CartContext'; 
import { useAuth } from '../AuthContext'; 
import { CONFIG } from '../config';
import { PulseLoader, ProductGridSkeleton } from '../components/LoadingAnimation';

const { width } = Dimensions.get('window');

const CategoryIcons = {
  'All': '💊',
  'Tablets': '💊',
  'Syrups': '🧴',
  'Injections': '💉',
  'Drops': '🩺',
  'Capsules': '💊',
  'Ointments': '🧴',
};

const BANNERS = [
  { id: '1', title: 'Free Delivery', subtitle: 'On orders above PKR 500', color: '#1B5E20' },
  { id: '2', title: 'New Arrivals', subtitle: 'Check out latest products', color: '#2E7D32' },
];

export default function HomeScreen({ navigation }) {
  const { user, loading: authLoading } = useAuth(); 
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { addToCart, getCartCount, getCartTotal } = useCart(); 
  const [addedAnimations, setAddedAnimations] = useState({});
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const q = query(collection(db, "Products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', ...new Set(products.map(p => p.category || 'Uncategorized'))];

  const handleAddToCart = (item) => {
    addToCart(item, 1);
    setAddedAnimations(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedAnimations(prev => ({ ...prev, [item.id]: false }));
    }, 1200);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  if (authLoading) {
    return <PulseLoader message="Loading..." />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ height: 120 }} />
        <ProductGridSkeleton />
      </View>
    );
  }

  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
      <View style={styles.headerTopRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.pharmacyName}>{currentPharmacyConfig?.name || 'Pharmacy'}</Text>
        </View>
        <View style={styles.headerRight}>
          {user?.role === 'admin' && (
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => navigation.navigate('AdminDashboard')}>
              <Text style={styles.iconText}>⚙️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('OrderHistory')}>
            <Text style={styles.iconText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>{user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search medicines, vitamins..."
            placeholderTextColor="#9EA7A3"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannerScroll} contentContainerStyle={styles.bannerContent}>
        {BANNERS.map(banner => (
          <View key={banner.id} style={[styles.bannerCard, { backgroundColor: banner.color }]}>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
            </View>
            <Text style={styles.bannerEmoji}>{banner.id === '1' ? '🚚' : '✨'}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.categoriesContainer}>
        <FlatList 
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.categoryButton, 
                selectedCategory === item && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={styles.categoryEmoji}>{CategoryIcons[item] || '💊'}</Text>
              <Text style={[
                styles.categoryText, 
                selectedCategory === item && styles.categoryTextActive
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList 
        data={filteredProducts}
        numColumns={2}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsEmoji}>🔍</Text>
            <Text style={styles.noResultsTitle}>No items found</Text>
            <Text style={styles.noResultsSub}>Try a different category or search term</Text>
          </View>
        }
        columnWrapperStyle={filteredProducts.length > 0 ? styles.row : undefined}
        contentContainerStyle={[styles.productList, getCartCount() > 0 && { paddingBottom: 110 }]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => {
          const isAdded = addedAnimations[item.id];
          return (
            <TouchableOpacity 
              style={[styles.productCard, item.isOutOfStock && styles.outOfStockCard]}
              onPress={() => navigation.navigate('ProductDetails', { product: item })}
              activeOpacity={0.7}
            >
              <View style={styles.imageWrapper}>
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                {item.isOutOfStock && (
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockBadgeText}>Out of Stock</Text>
                  </View>
                )}
                {item.discount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{item.discount}%</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.productName, item.isOutOfStock && styles.outOfStockText]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.productCategory}>{item.category}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>{CONFIG.CURRENCY} {item.price}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.addButton, isAdded && styles.addedButton, item.isOutOfStock && styles.disabledAddButton]} 
                onPress={() => handleAddToCart(item)}
                disabled={item.isOutOfStock || isAdded}
                activeOpacity={0.8}
              >
                <Text style={styles.addButtonText}>
                  {isAdded ? '✓ Added' : item.isOutOfStock ? 'N/A' : '+ Add'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {getCartCount() > 0 && (
        <TouchableOpacity style={styles.floatingCartBar} onPress={() => navigation.navigate('Cart')} activeOpacity={0.9}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartIconWrap}>
              <Text style={styles.cartEmoji}>🛒</Text>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getCartCount()}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.cartBarTotal}>{CONFIG.CURRENCY} {getCartTotal().toFixed(2)}</Text>
              <Text style={styles.cartBarCount}>{getCartCount()} Item{getCartCount() > 1 ? 's' : ''}</Text>
            </View>
          </View>
          <View style={styles.cartBarButton}>
            <Text style={styles.cartBarButtonText}>Checkout →</Text>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, paddingTop: 8 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerLeft: {},
  greeting: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  pharmacyName: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconText: { fontSize: 18 },
  avatarSmall: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarSmallText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  searchContainer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 16, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, height: '100%' },
  clearIcon: { fontSize: 14, color: COLORS.textSecondary, padding: 4 },
  bannerScroll: { marginTop: 12, paddingLeft: 20 },
  bannerContent: { paddingRight: 20 },
  bannerCard: { width: width * 0.7, height: 90, borderRadius: 16, padding: 16, marginRight: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerTextWrap: { flex: 1 },
  bannerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  bannerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  bannerEmoji: { fontSize: 32, marginLeft: 8 },
  categoriesContainer: { paddingVertical: 14 },
  categoryList: { paddingHorizontal: 20 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: COLORS.surface, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  categoryButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryEmoji: { fontSize: 16, marginRight: 6 },
  categoryText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#FFF' },
  productList: { paddingHorizontal: 16, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
  productCard: { backgroundColor: COLORS.surface, width: '48%', marginBottom: 14, borderRadius: 16, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  outOfStockCard: { opacity: 0.7 },
  imageWrapper: { position: 'relative', marginBottom: 10 },
  productImage: { width: '100%', height: 130, borderRadius: 12, backgroundColor: '#F0F2F1' },
  stockBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  discountBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#D32F2F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  discountText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  productName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 18, marginBottom: 2 },
  productCategory: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 6 },
  outOfStockText: { color: '#757575' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productPrice: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  addButton: { backgroundColor: COLORS.primary, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  addedButton: { backgroundColor: '#43A047' },
  disabledAddButton: { backgroundColor: '#BDBDBD' },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  noResultsContainer: { alignItems: 'center', paddingTop: 60 },
  noResultsEmoji: { fontSize: 48, marginBottom: 12 },
  noResultsTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  noResultsSub: { fontSize: 14, color: COLORS.textSecondary },
  floatingCartBar: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center' },
  cartIconWrap: { position: 'relative', marginRight: 14 },
  cartEmoji: { fontSize: 24 },
  cartBadge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#FF6B6B', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  cartBarTotal: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  cartBarCount: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', marginTop: 1 },
  cartBarButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  cartBarButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 }
});