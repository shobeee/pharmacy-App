import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Image, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { COLORS } from '../theme';
import { CONFIG } from '../config';

/**
 * Enhanced AddItemScreen
 * Features: Validation, Smooth Animations, Professional UI
 */
export default function AddItemScreen({ navigation }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  
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
      return Alert.alert("Missing Fields", "Please complete all fields and select an image.");
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "Products"), {
        name: name.trim(),
        price: parseFloat(price),
        category: category.trim(),
        description: description.trim(),
        imageUrl: imageUri,
        createdAt: new Date().toISOString(),
        isActive: true
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Add Product</Text>
        <Text style={styles.subHeader}>Fill in the details to list your product.</Text>

        <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
          {imageUri ? (
            <Animated.View style={{ opacity: fadeAnim, width: '100%', height: '100%' }}>
              <Image source={{ uri: imageUri }} style={styles.image} />
            </Animated.View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.plus}>+</Text>
              <Text style={styles.placeholderText}>Upload Image</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Product Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Paracetamol" 
            value={name} 
            onChangeText={setName} 
          />

          <Text style={styles.inputLabel}>Category</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Medicine/Syrup" 
            value={category} 
            onChangeText={setCategory} 
          />
<Text style={styles.inputLabel}>Price ({CONFIG.CURRENCY})</Text>
<TextInput 
  style={styles.input} 
  placeholder="0.00" 
  keyboardType="decimal-pad" 
  value={price} 
  onChangeText={setPrice} 
/>
          
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Brief product info..." 
            value={description} 
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && { opacity: 0.7 }]} 
          onPress={uploadItem} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Publish Product</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 24, paddingBottom: 50 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginTop: 40 },
  subHeader: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  imageBox: { 
    height: 180, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 20, 
    borderWidth: 2, 
    borderColor: '#E5E7EB', 
    borderStyle: 'dashed',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24,
    overflow: 'hidden'
  },
  image: { width: '100%', height: '100%' },
  placeholderContainer: { alignItems: 'center' },
  plus: { fontSize: 32, color: COLORS.primary, marginBottom: 8 },
  placeholderText: { color: COLORS.primary, fontWeight: '600' },
  formCard: { 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 20, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    elevation: 2 
  },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { 
    backgroundColor: '#F9FAFB', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    padding: 14, 
    borderRadius: 12, 
    fontSize: 15,
    color: '#1F2937'
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: { 
    backgroundColor: COLORS.primary, 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginTop: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5
  },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});