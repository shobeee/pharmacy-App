import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { COLORS } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const { login } = useAuth();

  const handleLoginSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill out both fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const formattedEmail = email.trim().toLowerCase();
      const docIdsToCheck = ["AdminUser", "MasterAdmin"];
      let foundAdmin = null;

      for (const id of docIdsToCheck) {
        const docRef = doc(db, "SystemAccess", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().email === formattedEmail) {
          foundAdmin = docSnap.data();
          break;
        }
      }

      if (foundAdmin) {
        if (foundAdmin.password === password.trim()) {
          await login(formattedEmail, password.trim());
          if (formattedEmail === "master@dmin.com") {
            navigation.replace('ElevatedDashboard');
          } else {
            navigation.replace('AdminDashboard');
          }
        } else {
          setErrorMessage("Invalid email or password.");
        }
      } else {
        await login(formattedEmail, password.trim());
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputField = useCallback(({ label, icon, value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize, fieldName, inputRef, onSubmitEditing }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrap, focusedField === fieldName && styles.inputWrapFocused]}>
        <Ionicons name={icon} size={18} color="#B0B8B4" style={styles.inputIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B0B8B4"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          autoCapitalize={autoCapitalize || 'none'}
          onFocus={() => setFocusedField(fieldName)}
          onBlur={() => setFocusedField(null)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={onSubmitEditing ? 'next' : 'done'}
        />
        {fieldName === 'password' && value.length > 0 && (
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeBtn}>
            <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#B0B8B4" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [focusedField, isPasswordVisible]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentWrapper} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
        <View style={styles.headerSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="medkit-outline" size={36} color="#FFF" />
          </View>
          <Text style={styles.headerTitle}>Welcome Back</Text>
          <Text style={styles.subTitle}>Sign in to continue</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <InputField
          label="Email Address"
          icon="mail-outline"
          value={email}
          onChangeText={(text) => { setEmail(text); setErrorMessage(''); }}
          placeholder="email@example.com"
          keyboardType="email-address"
          fieldName="email"
          inputRef={emailRef}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <InputField
          label="Password"
          icon="lock-closed-outline"
          value={password}
          onChangeText={(text) => { setPassword(text); setErrorMessage(''); }}
          placeholder="Enter your password"
          secureTextEntry
          fieldName="password"
          inputRef={passwordRef}
          onSubmitEditing={handleLoginSubmit}
        />

        <TouchableOpacity style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={handleLoginSubmit} disabled={isSubmitting} activeOpacity={0.9}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Text style={styles.buttonText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.footerLink}>
          <Text style={styles.footerText}>Don't have an account? <Text style={styles.boldText}>Sign Up</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentWrapper: { padding: 24, paddingBottom: 50, flexGrow: 1 },
  headerSection: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subTitle: { fontSize: 15, color: COLORS.textSecondary },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#D32F2F', fontSize: 13, fontWeight: '600', marginLeft: 8, flex: 1 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 14, height: 52, borderWidth: 1.5, borderColor: COLORS.border },
  inputWrapFocused: { borderColor: COLORS.primary },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary, height: '100%' },
  eyeBtn: { padding: 4, marginLeft: 8 },
  button: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 17, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: 16, marginRight: 8 },
  footerLink: { marginTop: 24, alignItems: 'center' },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  boldText: { color: COLORS.primary, fontWeight: '700' },
});
