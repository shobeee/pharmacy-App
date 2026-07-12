import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc } from 'firebase/firestore'; 
import { db } from '../firebaseConfig'; 

export default function ElevatedDashboard() {

  const updateLockStatus = async (isLocked) => {
    try {
      // Updated to match the path: AppConfig -> Settings
      await updateDoc(doc(db, "AppConfig", "Settings"), {
        isLocked: isLocked
      });
      Alert.alert("Success", `App is now ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update lock status. Check your permissions.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Master Control Panel</Text>
      
      <View style={styles.card}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#d32f2f' }]} 
          onPress={() => updateLockStatus(true)}
        >
          <Text style={styles.buttonText}>LOCK APP</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#388e3c' }]} 
          onPress={() => updateLockStatus(false)}
        >
          <Text style={styles.buttonText}>UNLOCK APP</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 4 },
  button: { padding: 15, borderRadius: 8, marginVertical: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});