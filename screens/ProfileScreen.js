import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useAuth } from '../AuthContext';
import { doc, getDoc, setDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loyaltyRewards, setLoyaltyRewards] = useState(0);
  const [locationCoords, setLocationCoords] = useState(null);

  const [unreadOrders, setUnreadOrders] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchUserData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setPhone(data.phone || '');
          setAddress(data.defaultAddress || '');
          setLoyaltyRewards(data.loyaltyRewards || data.rewards || data.points || 0);
          setLocationCoords(data.locationCoords || null);
        }
      } catch (error) {
        console.error("Profile Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    const ordersRef = collection(db, "Orders");
    const q = query(
      ordersRef,
      where("userId", "==", user.uid),
      where("hasNewMessageForUser", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setUnreadOrders(orders);
    }, (error) => {
      console.error("Listener Error:", error);
    });

    fetchUserData();
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "Users", user.uid), { name, phone, defaultAddress: address }, { merge: true });
      Alert.alert("Success", "Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Error", "Could not save profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = () => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive", onPress: async () => {
          try { await signOut(auth); } catch (error) { Alert.alert("Error", error.message); }
        }
      }
    ]);
  };

  const hasUnread = unreadOrders.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Account</Text>
          <View style={{ width: 40 }} />
        </View>

        {hasUnread && (
          <TouchableOpacity
            style={styles.notificationBanner}
            onPress={() => navigation.navigate('OrderHistory')}
            activeOpacity={0.85}
          >
            <View style={styles.notifIconWrap}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
            </View>
            <View style={styles.notifTextWrap}>
              <Text style={styles.notifTitle}>
                {unreadOrders.length} New Message{unreadOrders.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.notifSubtitle}>
                You have unread replies on your orders
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name?.charAt(0).toUpperCase() || 'U'}</Text>
            </View>
            {hasUnread && <View style={styles.avatarDot} />}
          </View>
          <Text style={styles.userName}>{name || user?.email?.split('@')[0] || ''}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.statValue}>{loyaltyRewards}</Text>
              <Text style={styles.statLabel}>Rewards</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
              <Text style={styles.statValue}>{unreadOrders.length}</Text>
              <Text style={styles.statLabel}>Updates</Text>
            </View>
          </View>
        </View>

        {locationCoords && (
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: locationCoords.latitude,
                longitude: locationCoords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker coordinate={locationCoords} title="My Delivery Location" />
            </MapView>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.fieldRow}>
            <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} style={styles.fieldIcon} />
            {isEditing ? (
              <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholder="Enter name" />
            ) : (
              <Text style={styles.fieldValue}>{name || 'Not set'}</Text>
            )}
          </View>

          <Text style={styles.fieldLabel}>Contact Number</Text>
          <View style={styles.fieldRow}>
            <Ionicons name="call-outline" size={16} color={COLORS.textSecondary} style={styles.fieldIcon} />
            {isEditing ? (
              <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Enter phone" />
            ) : (
              <Text style={styles.fieldValue}>{phone || 'Not set'}</Text>
            )}
          </View>

          <Text style={styles.fieldLabel}>Primary Address</Text>
          <View style={styles.fieldRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} style={styles.fieldIcon} />
            {isEditing ? (
              <TextInput style={[styles.fieldInput, styles.fieldInputMultiline]} value={address} onChangeText={setAddress} multiline placeholder="Enter address" />
            ) : (
              <TouchableOpacity onPress={openInMaps} style={{ flex: 1 }}>
                <Text style={[styles.fieldValue, styles.linkText]}>{address || 'No address set'}</Text>
                {address ? <Text style={styles.linkHint}>Tap to open in Maps</Text> : null}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, isEditing && styles.actionBtnSave]}
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>{isEditing ? "Save Changes" : "Edit Profile"}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('OrderHistory')}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="receipt-outline" size={20} color="#6366F1" />
              </View>
              <Text style={styles.menuText}>My Orders</Text>
            </View>
            <View style={styles.menuRight}>
              {hasUnread && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadOrders.length}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('OrderHistory')}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="navigate-outline" size={20} color="#D97706" />
              </View>
              <Text style={styles.menuText}>Track My Order</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('OrderHistory')}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#059669" />
              </View>
              <Text style={styles.menuText}>View Messages</Text>
            </View>
            <View style={styles.menuRight}>
              {hasUnread && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadOrders.length}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },

  notificationBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    padding: 16, borderRadius: 16,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  notifIconWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  notifTextWrap: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  notifSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  profileCard: {
    backgroundColor: COLORS.surface, marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: '700' },
  avatarDot: {
    position: 'absolute', top: 2, right: 2, width: 16, height: 16,
    borderRadius: 8, backgroundColor: '#EF4444',
    borderWidth: 3, borderColor: COLORS.surface,
  },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  userEmail: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  statsRow: {
    flexDirection: 'row', marginTop: 20, paddingTop: 18,
    borderTopWidth: 1, borderTopColor: COLORS.border, width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  mapCard: {
    height: 160, marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  map: { flex: 1 },

  sectionCard: {
    backgroundColor: COLORS.surface, marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 14, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  fieldIcon: { marginRight: 10 },
  fieldValue: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary, flex: 1 },
  fieldInput: {
    flex: 1, fontSize: 15, color: COLORS.textPrimary,
    borderBottomWidth: 1.5, borderBottomColor: COLORS.primary,
    paddingVertical: 6,
  },
  fieldInputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  linkText: { color: COLORS.primary, textDecorationLine: 'underline' },
  linkHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },

  actionBtn: {
    flexDirection: 'row', marginTop: 20, padding: 15,
    backgroundColor: COLORS.primary, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  actionBtnSave: { backgroundColor: '#1B5E20' },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15, marginLeft: 8 },

  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  menuRight: { flexDirection: 'row', alignItems: 'center' },
  menuDivider: { height: 1, backgroundColor: COLORS.border },

  badge: {
    backgroundColor: '#EF4444', borderRadius: 10, minWidth: 22, height: 22,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginRight: 10,
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 20,
    padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { color: '#DC2626', fontWeight: '700', fontSize: 15, marginLeft: 8 },
});
