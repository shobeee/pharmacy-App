import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../theme';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, runTransaction } from 'firebase/firestore';

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);

  const validateForm = () => {
    if (!name.trim()) return "Please enter your full name.";
    if (!email.trim() || !email.includes('@')) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters long.";
    if (!phone.trim()) return "Please enter a valid contact number.";
    if (!address.trim()) return "Please enter a delivery address.";
    return null;
  };

  const handleGetCurrentLocation = async () => {
    setLoadingLocation(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please enable location permissions.');
      setLoadingLocation(false);
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocationCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const g = geocode[0];
        const parts = [g.name, g.street, g.subregion, g.city, g.region];
        const uniqueParts = [...new Set(parts.filter(p => p && p.trim() !== ""))];
        setAddress(uniqueParts.join(", "));
      }
    } catch (e) {
      Alert.alert('Error', 'Could not fetch location.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSignup = async () => {
    const error = validateForm();
    if (error) { Alert.alert('Validation Error', error); return; }

    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const counterRef = doc(db, "Counters", "UserCounter");
      
      const uniqueId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let newId = 1000;
        if (counterDoc.exists()) newId = counterDoc.data().lastId + 1;
        transaction.set(counterRef, { lastId: newId }, { merge: true });
        return newId;
      });

      await setDoc(doc(db, "Users", user.uid), {
        name, 
        email, 
        phone, 
        defaultAddress: address, 
        locationCoords: locationCoords,
        uniqueId, 
        loyaltyRewards: 0, 
        createdAt: new Date().toISOString()
      });

      Alert.alert('Welcome!', `Account created successfully.`);
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputField = useCallback(({ label, icon, value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize, multiline, fieldName, inputRef, onSubmitEditing }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrap, focusedField === fieldName && styles.inputWrapFocused, multiline && styles.inputWrapArea]}>
        <Ionicons name={icon} size={18} color="#B0B8B4" style={styles.inputIcon} />
        <TextInput
          ref={inputRef}
          style={[styles.input, multiline && styles.inputArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B0B8B4"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !showPassword}
          autoCapitalize={autoCapitalize || 'none'}
          multiline={multiline}
          onFocus={() => setFocusedField(fieldName)}
          onBlur={() => setFocusedField(null)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={onSubmitEditing ? 'next' : 'done'}
        />
        {fieldName === 'password' && value.length > 0 && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#B0B8B4" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [focusedField, showPassword]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentWrapper} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>+</Text>
            </View>
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.subTitle}>Join and get access to health essentials</Text>
          </View>

          <InputField label="Full Name" icon="person-outline" value={name} onChangeText={setName} placeholder="John Doe" fieldName="name" inputRef={nameRef} onSubmitEditing={() => emailRef.current?.focus()} />
          <InputField label="Email Address" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" fieldName="email" inputRef={emailRef} onSubmitEditing={() => passwordRef.current?.focus()} />
          <InputField label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry fieldName="password" inputRef={passwordRef} onSubmitEditing={() => phoneRef.current?.focus()} />
          <InputField label="Contact Number" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="+92 300 0000000" keyboardType="phone-pad" fieldName="phone" inputRef={phoneRef} onSubmitEditing={() => addressRef.current?.focus()} />

          <View style={styles.inputGroup}>
            <View style={styles.addressLabelRow}>
              <Text style={styles.inputLabel}>Delivery Address</Text>
              <TouchableOpacity style={styles.locationBtn} onPress={handleGetCurrentLocation} disabled={loadingLocation}>
                {loadingLocation ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.locationBtnText}>Use Current</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={[styles.inputWrap, focusedField === 'address' && styles.inputWrapFocused, styles.inputWrapArea]}>
              <Ionicons name="location-outline" size={18} color="#B0B8B4" style={styles.inputIcon} />
              <TextInput
                ref={addressRef}
                style={[styles.input, styles.inputArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Street, Building, Area"
                placeholderTextColor="#B0B8B4"
                multiline
                onFocus={() => setFocusedField('address')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={handleSignup} disabled={isSubmitting} activeOpacity={0.9}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.footerLink}>
            <Text style={styles.footerText}>Already have an account? <Text style={styles.boldText}>Sign In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentWrapper: { padding: 24, paddingBottom: 50 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  headerSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  logoText: { fontSize: 32, color: '#FFF', fontWeight: '300' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subTitle: { fontSize: 15, color: COLORS.textSecondary },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  addressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(46, 125, 50, 0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  locationBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 14, height: 52, borderWidth: 1.5, borderColor: COLORS.border },
  inputWrapFocused: { borderColor: COLORS.primary },
  inputWrapArea: { height: 'auto', minHeight: 52, paddingVertical: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary, height: '100%' },
  inputArea: { height: 70, textAlignVertical: 'top' },
  eyeBtn: { padding: 4, marginLeft: 8 },
  button: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 17, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: 16, marginRight: 8 },
  footerLink: { marginTop: 24, alignItems: 'center' },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  boldText: { color: COLORS.primary, fontWeight: '700' },
});