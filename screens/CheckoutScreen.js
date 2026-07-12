import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { COLORS } from '../theme';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { CONFIG } from '../config';
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function CheckoutScreen({ navigation }) {
  const { getCartTotal, cart, clearCart } = useCart();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loyaltyRewards, setLoyaltyRewards] = useState(0);
  const [prescriptionImage, setPrescriptionImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [editingField, setEditingField] = useState(null);

  const cartTotal = getCartTotal();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) { setFetchingData(false); return; }
      try {
        const userRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || user?.email?.split('@')[0] || '');
          setPhone(data.phone || '');
          setAddress(data.defaultAddress || '');
          setLoyaltyRewards(data.loyaltyRewards || 0);
        } else {
          setName(user?.email?.split('@')[0] || '');
        }
      } catch (error) { console.error("Error:", error); } 
      finally { setFetchingData(false); }
    };
    fetchUserData();
  }, [user]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'To attach a prescription, please allow access to your photo gallery.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setPrescriptionImage(result.assets[0].uri);
    }
  };

  const handlePlaceOrder = async () => {
    if (!cart || cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart first.', [{ text: 'Go to Home', onPress: () => navigation.navigate('Home') }]);
      return;
    }

    if (!name.trim() || !phone.trim() || !address.trim()) {
      Alert.alert('Missing Details', 'Please fill out all delivery fields.');
      return;
    }

    if (paymentMethod === 'REWARDS' && loyaltyRewards < cartTotal) {
      Alert.alert('Insufficient Balance', `You need ${CONFIG.CURRENCY} ${cartTotal.toFixed(2)} but have ${CONFIG.CURRENCY} ${loyaltyRewards.toFixed(2)} in rewards.`);
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === 'CARD') {
        try {
          const response = await fetch(`${CONFIG.PAYMENT_SERVER_URL}/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: cartTotal, currency: 'pkr' }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Payment server error');

          const { error: initError } = await initPaymentSheet({
            paymentIntentClientSecret: data.clientSecret,
            merchantDisplayName: 'Al Shifa Pharmacy',
            returnURL: 'stripe-redirect://pharmacyappstable',
          });
          if (initError) {
            setLoading(false);
            Alert.alert('Payment Error', initError.message);
            return;
          }

          const { error: presentError } = await presentPaymentSheet();
          if (presentError) {
            setLoading(false);
            Alert.alert('Payment Failed', presentError.message);
            return;
          }
        } catch (fnError) {
          setLoading(false);
          Alert.alert(
            'Card Payment Unavailable',
            'Payment server is not deployed yet.\n\nDeploy the server first or use Cash on Delivery.'
          );
          return;
        }
      }

      if (paymentMethod === 'REWARDS') {
        await updateDoc(doc(db, "Users", user.uid), { loyaltyRewards: increment(-cartTotal) });
      }

      const orderData = {
        userId: user?.uid || 'guest',
        customerName: name,
        phoneNumber: phone,
        deliveryAddress: address,
        paymentMethod,
        totalAmount: cartTotal,
        items: cart || [],
        createdAt: new Date().toISOString(),
        status: 'Order Placed',
        step: 1,
        paid: paymentMethod === 'CARD',
      };

      const docRef = await addDoc(collection(db, "Orders"), orderData);
      clearCart();
      setLoading(false);

      Alert.alert('Order Confirmed!', paymentMethod === 'CARD'
        ? 'Payment successful! Your order has been placed.'
        : 'Your order has been placed successfully.', [
        { text: 'Track Order', onPress: () => navigation.navigate('OrderTracking', { orderId: docRef.id }) }
      ]);
    } catch (e) {
      setLoading(false);
      Alert.alert("Error", "Could not place order: " + e.message);
    }
  };

  if (fetchingData) return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>

          <View style={[styles.fieldWrap, editingField === 'name' && styles.fieldWrapActive]}>
            <Text style={styles.fieldIcon}>👤</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor="#B0B8B4"
              onFocus={() => setEditingField('name')}
              onBlur={() => setEditingField(null)}
            />
          </View>

          <View style={[styles.fieldWrap, editingField === 'phone' && styles.fieldWrapActive]}>
            <Text style={styles.fieldIcon}>📞</Text>
            <TextInput
              style={styles.fieldInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
              placeholderTextColor="#B0B8B4"
              keyboardType="phone-pad"
              onFocus={() => setEditingField('phone')}
              onBlur={() => setEditingField(null)}
            />
          </View>

          <View style={[styles.fieldWrap, styles.fieldWrapArea, editingField === 'address' && styles.fieldWrapActive]}>
            <Text style={styles.fieldIcon}>📍</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Delivery Address"
              placeholderTextColor="#B0B8B4"
              multiline
              onFocus={() => setEditingField('address')}
              onBlur={() => setEditingField(null)}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Prescription (Optional)</Text>
          </View>
          {prescriptionImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: prescriptionImage }} style={styles.previewImage} />
              <Text style={styles.previewLabel} numberOfLines={1}>Prescription Uploaded</Text>
              <TouchableOpacity style={styles.removeImgBtn} onPress={() => setPrescriptionImage(null)}>
                <Ionicons name="close-circle" size={22} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage}>
              <Ionicons name="cloud-upload-outline" size={28} color={COLORS.primary} />
              <Text style={styles.uploadTitle}>Upload Doctor's Prescription</Text>
              <Text style={styles.uploadSub}>JPG, PNG accepted</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'COD' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('COD')}
            activeOpacity={0.7}
          >
            <View style={[styles.radioOuter, paymentMethod === 'COD' && styles.radioOuterActive]}>
              {paymentMethod === 'COD' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Cash on Delivery</Text>
              <Text style={styles.paymentDesc}>Pay when you receive your order</Text>
            </View>
            <Text style={styles.paymentEmoji}>💵</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'REWARDS' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('REWARDS')}
            activeOpacity={0.7}
          >
            <View style={[styles.radioOuter, paymentMethod === 'REWARDS' && styles.radioOuterActive]}>
              {paymentMethod === 'REWARDS' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Loyalty Rewards</Text>
              <Text style={styles.paymentDesc}>{loyaltyRewards.toFixed(2)} points available</Text>
            </View>
            <Text style={styles.paymentEmoji}>⭐</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'CARD' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('CARD')}
            activeOpacity={0.7}
          >
            <View style={[styles.radioOuter, paymentMethod === 'CARD' && styles.radioOuterActive]}>
              {paymentMethod === 'CARD' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Card Payment</Text>
              <Text style={styles.paymentDesc}>Pay securely with debit or credit card</Text>
            </View>
            <Ionicons name="card" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { marginBottom: 120 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Total</Text>
            <Text style={styles.summaryValue}>{CONFIG.CURRENCY} {cartTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charges</Text>
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{CONFIG.CURRENCY} {cartTotal.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.footerTotalLabel}>Total</Text>
            <Text style={styles.footerTotalValue}>{CONFIG.CURRENCY} {cartTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder} disabled={loading} activeOpacity={0.9}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.placeOrderText}>Place Order</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scrollContent: { padding: 16, paddingTop: 8 },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 8 },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 14, height: 50, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.border },
  fieldWrapActive: { borderColor: COLORS.primary },
  fieldWrapArea: { height: 'auto', minHeight: 50, paddingVertical: 12 },
  fieldIcon: { fontSize: 16, marginRight: 10 },
  fieldInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, height: '100%' },
  fieldInputArea: { height: 50, textAlignVertical: 'top' },
  uploadBox: { borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 14, padding: 24, alignItems: 'center', backgroundColor: COLORS.background },
  uploadTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginTop: 8 },
  uploadSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  previewContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  previewImage: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#EEE' },
  previewLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 12 },
  removeImgBtn: { padding: 4 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, marginBottom: 10, backgroundColor: COLORS.background },
  paymentOptionActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(46, 125, 50, 0.04)' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C0C8C4', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  radioOuterActive: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  paymentInfo: { flex: 1 },
  paymentLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  paymentDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  paymentEmoji: { fontSize: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  freeBadge: { backgroundColor: 'rgba(46, 125, 50, 0.1)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  freeText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  totalValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingTop: 12, backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerTotalLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  footerTotalValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  placeOrderBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  placeOrderText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginRight: 8 },
});