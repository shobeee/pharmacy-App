import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Assuming you have a theme file. If not, replace COLORS.primary with a string like '#2196F3'
const PRIMARY_COLOR = '#2196F3'; 

export default function MasterLoginScreen({ navigation }) {
  const [masterKey, setMasterKey] = useState('');

  const handleAccess = () => {
    // Check for the Master Key
    if (masterKey === 'SHOAIB_MASTER_2026') { 
      navigation.replace('ElevatedDashboard');
    } else {
      Alert.alert('Access Denied', 'Unauthorized entry attempt.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>System Control Gate</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Enter Master Key" 
        secureTextEntry 
        value={masterKey} 
        onChangeText={setMasterKey} 
      />
      <TouchableOpacity style={styles.button} onPress={handleAccess}>
        <Text style={styles.buttonText}>Unlock Elevated Mode</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 20, color: '#FFF', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, marginBottom: 20 },
  button: { backgroundColor: PRIMARY_COLOR, padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold' }
});