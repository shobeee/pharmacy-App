import React, { useState, useRef } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, Image, ScrollView, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { COLORS } from '../theme';
import { CONFIG } from '../config';

const QUICK_CATEGORIES = ['Tablets', 'Syrups', 'Injections', 'Drops', 'Capsules', 'Ointments'];

export default function AddItemScreen({ navigation }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [discount, setDiscount] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert("Permission Needed", "Allow access to photos to upload products.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  };

  const uploadItem = async () => {
    if (!name || !price || !category || !imageUri) {
      return Alert.alert("Missing Fields", "Please complete all required fields and select an image.");
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "Products"), {
        name: name.trim(),
        price: parseFloat(price),
        category: category.trim(),
        description: description.trim(),
        discount: discount ? parseInt(discount) : null,
        imageUrl: imageUri,
        createdAt: new Date().toISOString(),
        isActive: true,
        isOutOfStock: false,
      });
      Alert.alert("Success", "Product added successfully!");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Upload Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <Text style={styles.subHeader}>List a new item in your pharmacy catalog</Text>

        <TouchableOpacity style={styles.imageBox} onPress={pickImage} activeOpacity={0.8}>
          {imageUri ? (
            <Animated.View style={{ opacity: fadeAnim, width: '100%', height: '100%' }}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>Tap to change</Text>
              </View>
            </Animated.View>
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholderIcon}>
                <Text style={styles.placeholderIconText}>📷</Text>
              </View>
              <Text style={styles.placeholderText}>Upload Product Image</Text>
              <Text style={styles.placeholderSub}>JPG, PNG accepted</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Product Information</Text>

          <Text style={styles.inputLabel}>Product Name *</Text>
          <TextInput
            style={[styles.input, focusedField === 'name' && styles.inputFocused]}
            placeholder="e.g. Paracetamol 500mg"
            placeholderTextColor="#B0B8B4"
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={styles.inputLabel}>Category *</Text>
          <View style={styles.categoryRow}>
            {QUICK_CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c === category ? '' : c)}
              >
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, focusedField === 'category' && styles.inputFocused]}
            placeholder="Or type a custom category"
            placeholderTextColor="#B0B8B4"
            value={category}
            onChangeText={setCategory}
            onFocus={() => setFocusedField('category')}
            onBlur={() => setFocusedField(null)}
          />

          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <Text style={styles.inputLabel}>Price ({CONFIG.CURRENCY}) *</Text>
              <TextInput
                style={[styles.input, focusedField === 'price' && styles.inputFocused]}
                placeholder="0.00"
                placeholderTextColor="#B0B8B4"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View style={styles.priceField}>
              <Text style={styles.inputLabel}>Discount %</Text>
              <TextInput
                style={[styles.input, focusedField === 'discount' && styles.inputFocused]}
                placeholder="0"
                placeholderTextColor="#B0B8B4"
                keyboardType="number-pad"
                value={discount}
                onChangeText={setDiscount}
                onFocus={() => setFocusedField('discount')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, focusedField === 'description' && styles.inputFocused]}
            placeholder="Brief product info, dosage, etc."
            placeholderTextColor="#B0B8B4"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            onFocus={() => setFocusedField('description')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.7 }]}
          onPress={uploadItem}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Publish Product</Text>
              <Text style={styles.submitArrow}>→</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 50 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  subHeader: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  imageBox: {
    height: 180, backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 6, alignItems: 'center' },
  imageOverlayText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  placeholderContainer: { alignItems: 'center' },
  placeholderIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(46,125,50,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  placeholderIconText: { fontSize: 22 },
  placeholderText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  placeholderSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  formCard: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, padding: 14, borderRadius: 12, fontSize: 15, color: COLORS.textPrimary },
  inputFocused: { borderColor: COLORS.primary },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.background, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  chipTextActive: { color: '#FFF' },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceField: { flex: 1 },
  submitButton: {
    flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 18,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  submitArrow: { color: '#FFF', fontSize: 18, marginLeft: 8, fontWeight: '600' },
});
