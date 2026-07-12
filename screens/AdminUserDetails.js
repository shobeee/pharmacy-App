import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { PulseLoader } from '../components/LoadingAnimation';

export default function AdminUserDetails({ route, navigation }) {
  const { userId } = route.params || {};
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      const docSnap = await getDoc(doc(db, "Users", userId));
      if (docSnap.exists()) setUserData(docSnap.data());
      setLoading(false);
    };
    fetchUser();
  }, [userId]);

  if (loading) return <PulseLoader message="Loading user..." />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userData?.name?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{userData?.name || 'Anonymous'}</Text>
          <Text style={styles.userRole}>Registered Customer</Text>
        </View>

        <View style={styles.card}>
          <DetailRow icon="mail-outline" label="Email" value={userData?.email} />
          <DetailRow icon="call-outline" label="Phone" value={userData?.phone || 'Not provided'} />
          <DetailRow icon="location-outline" label="Address" value={userData?.defaultAddress || 'Not set'} />
          <DetailRow icon="gift-outline" label="Loyalty Rewards" value={`${userData?.loyaltyRewards || 0} LR`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: COLORS.primary },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E1E8EE', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary },
  userName: { fontSize: 22, fontWeight: '800', color: '#333' },
  userRole: { fontSize: 14, color: '#888', marginTop: 5 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  rowText: { marginLeft: 15 },
  label: { fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, fontWeight: '600', color: '#2D3436', marginTop: 2 }
});