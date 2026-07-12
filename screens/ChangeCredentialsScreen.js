import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { COLORS } from '../theme';

export default function ChangeCredentialsScreen({ navigation }) {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleUpdate = async () => {
    // Basic validation
    if (!newUsername || !newPassword) {
      Alert.alert("Input Required", "Please fill in both fields.");
      return;
    }

    try {
      // Points to the specific AdminUser document in the SystemAccess collection
      const credsRef = doc(db, "SystemAccess", "AdminUser"); 
      await updateDoc(credsRef, {
        username: newUsername,
        password: newPassword
      });
      
      Alert.alert("Success", "Credentials updated successfully.");
      navigation.goBack();
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update credentials. Ensure you are signed in.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Update Admin Credentials</Text>
      <TextInput 
        style={styles.input} 
        placeholder="New Username" 
        value={newUsername} 
        onChangeText={setNewUsername} 
      />
      <TextInput 
        style={styles.input} 
        placeholder="New Password" 
        secureTextEntry 
        value={newPassword} 
        onChangeText={setNewPassword} 
      />
      <TouchableOpacity style={styles.button} onPress={handleUpdate}>
        <Text style={styles.buttonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F4F7F6' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 15, backgroundColor: '#FFF' },
  button: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold' }
});