import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, FlatList, Image } from 'react-native';
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, increment, getDocs, where, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { SwipeListView } from 'react-native-swipe-list-view';
import { db } from '../firebaseConfig';
import { COLORS } from '../theme';
import { CONFIG } from '../config';

export default function AdminDashboardScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('current');
  const [loading, setLoading] = useState(true);
  const [rewardAmount, setRewardAmount] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [productCount, setProductCount] = useState(0);

  const STATUS_STEPS = ['Order Placed', 'Confirmed', 'Processing', 'Out for Delivery', 'Completed'];

  useEffect(() => {
    const fetchProductCount = async () => {
      try {
        const snapshot = await getCountFromServer(collection(db, "Products"));
        setProductCount(snapshot.data().count);
      } catch (e) { console.error("Error fetching count:", e); }
    };
    fetchProductCount();
  }, []);

  useEffect(() => {
    setLoading(true);
    let unsubscribe;

    if (tab === 'products') {
      unsubscribe = onSnapshot(collection(db, "Products"), (snapshot) => {
        setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    } else if (tab === 'users') {
      unsubscribe = onSnapshot(collection(db, "Users"), async (snapshot) => {
        const usersData = await Promise.all(snapshot.docs.map(async (uDoc) => {
          const q = query(collection(db, "Orders"), where("userId", "==", uDoc.id), orderBy("createdAt", "desc"), limit(1));
          const orderSnap = await getDocs(q);
          return { id: uDoc.id, ...uDoc.data(), lastOrder: orderSnap.docs[0]?.data() };
        }));
        setUsers(usersData);
        setLoading(false);
      });
    } else {
      unsubscribe = onSnapshot(
        query(collection(db, "Orders"), orderBy("createdAt", "desc")),
        { includeMetadataChanges: true }, 
        (snapshot) => {
          const data = snapshot.docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            hasNewMessage: !!d.data().hasNewMessage 
          }));
          
          const filtered = tab === 'current' 
            ? data.filter(i => i.status !== 'Completed') 
            : data.filter(i => i.status === 'Completed');
          
          setOrders(filtered);
          setLoading(false);
        }
      );
    }
    return () => unsubscribe && unsubscribe();
  }, [tab]);

  const proceedOrder = async (orderId, currentStatus) => {
    const currentIndex = STATUS_STEPS.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= STATUS_STEPS.length - 1) return;
    try {
      await updateDoc(doc(db, "Orders", orderId), { status: STATUS_STEPS[currentIndex + 1] });
    } catch (error) {
      Alert.alert("Error", "Could not update order status.");
    }
  };

  const deleteOrder = async (orderId) => {
    Alert.alert("Delete Order", "Are you sure?", [
      { text: "Cancel" },
      { text: "Delete", onPress: async () => await deleteDoc(doc(db, "Orders", orderId)) }
    ]);
  };

  const handleGrantReward = async () => {
    if (!rewardAmount || isNaN(rewardAmount)) return Alert.alert("Error", "Enter valid amount");
    await updateDoc(doc(db, "Users", selectedUser.id), { loyaltyRewards: increment(Number(rewardAmount)) });
    Alert.alert("Success", "Rewards granted!");
    setRewardAmount('');
    setSelectedUser(null);
  };

  const toggleStockStatus = async (productId, currentStatus) => {
    try { await updateDoc(doc(db, "Products", productId), { isOutOfStock: !currentStatus }); } 
    catch (error) { Alert.alert("Error", "Could not update status."); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.adminHeader}>
        <View>
          <Text style={styles.adminTitle}>Admin Dashboard</Text>
          <Text style={styles.subTitle}>Total Products: {productCount}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ChangeCredentials')}>
          <Text style={styles.changeCredText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddItemScreen')}>
        <Text style={styles.fabText}>+ Add Product</Text>
      </TouchableOpacity>

      <View style={styles.tabContainer}>
        {['current', 'history', 'users', 'products'].map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.activeTab]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} /> : (
        tab === 'products' ? (
          <FlatList data={products} keyExtractor={(i) => i.id} renderItem={({ item }) => (
            <View style={[styles.userCard, item.isOutOfStock && { backgroundColor: '#EEE' }]}>
              <Image source={{ uri: item.imageUrl }} style={{ width: 50, height: 50, borderRadius: 8 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: item.isOutOfStock ? 'red' : 'green' }}>{item.isOutOfStock ? 'Out of Stock' : 'In Stock'}</Text>
              </View>
              <TouchableOpacity style={[styles.rewardBtn, { backgroundColor: item.isOutOfStock ? '#4CAF50' : '#F44336' }]} onPress={() => toggleStockStatus(item.id, item.isOutOfStock)}>
                <Text style={styles.rewardBtnText}>{item.isOutOfStock ? 'Mark In' : 'Mark Out'}</Text>
              </TouchableOpacity>
            </View>
          )} />
        ) : tab === 'users' ? (
          <FlatList data={users} keyExtractor={(i) => i.id} renderItem={({ item }) => (
            <TouchableOpacity style={styles.userCard} onPress={() => navigation.navigate('AdminUserDetails', { userId: item.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{item.name || 'Anonymous User'}</Text>
                <Text style={styles.userIdText}>ID: {item.uniqueId || item.id?.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.badge}>Rewards: {item.loyaltyRewards || 0} LR</Text>
              </View>
              <TouchableOpacity style={styles.rewardBtn} onPress={() => setSelectedUser(item)}>
                <Text style={styles.rewardBtnText}>+ Grant</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )} />
        ) : (
          <SwipeListView 
            data={orders} 
            extraData={orders}
            keyExtractor={(i) => i.id} 
            renderItem={({ item }) => (
              <View style={[styles.orderCard, { backgroundColor: item.hasNewMessage ? '#FFFBEA' : '#FFF' }]}>
                <TouchableOpacity onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.orderId}>#{item.id?.slice(0, 6)}</Text>
                    {item.hasNewMessage && (
                        <View style={styles.badgeAlert}><Text style={styles.badgeAlertText}>NEW MESSAGE</Text></View>
                    )}
                    <View style={[styles.pill, {backgroundColor: item.status === 'Completed' ? '#E8F5E9' : '#FFF3E0'}]}>
                      <Text style={{fontSize: 10, color: item.status === 'Completed' ? '#2E7D32' : '#EF6C00'}}>{item.status || 'PENDING'}</Text>
                    </View>
                  </View>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                  <Text style={styles.price}>{CONFIG.CURRENCY} {Number(item.totalAmount || 0).toFixed(2)}</Text>
                </TouchableOpacity>
                
                {item.status !== 'Completed' && (
                  <TouchableOpacity style={styles.proceedBtn} onPress={() => proceedOrder(item.id, item.status)}>
                    <Text style={styles.proceedBtnText}>Next Step</Text>
                  </TouchableOpacity>
                )}
              </View>
            )} 
            renderHiddenItem={(data) => (
              <View style={styles.rowBack}>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteOrder(data.item.id)}>
                  <Text style={{color:'#FFF', fontWeight:'bold'}}>Delete</Text>
                </TouchableOpacity>
              </View>
            )} 
            rightOpenValue={-75} 
          />
        )
      )}
      
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Grant Rewards to {selectedUser?.name}</Text>
            <TextInput placeholder="Enter amount" keyboardType="numeric" value={rewardAmount} onChangeText={setRewardAmount} style={styles.input} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc'}]} onPress={() => setSelectedUser(null)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, {backgroundColor: COLORS.primary}]} onPress={handleGrantReward}><Text style={{color: '#FFF'}}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  adminHeader: { backgroundColor: COLORS.primary, padding: 30, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between' },
  adminTitle: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  subTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  changeCredText: { color: 'rgba(255,255,255,0.7)', marginTop: 10 },
  fab: { position: 'absolute', right: 20, top: 65, backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, elevation: 5, zIndex: 10 },
  fabText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  tabContainer: { flexDirection: 'row', margin: 15, backgroundColor: '#EEE', borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#FFF', elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '700', color: '#666' },
  activeTabText: { color: COLORS.primary },
  userCard: { backgroundColor: '#FFF', padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userIdText: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  badge: { fontSize: 11, backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, marginTop: 5 },
  rewardBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  rewardBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  orderCard: { padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 12, elevation: 1 },
  badgeAlert: { backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  badgeAlertText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  orderId: { fontSize: 10, color: '#999' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  customerName: { fontSize: 16, fontWeight: '600' },
  price: { fontWeight: 'bold', fontSize: 15, marginTop: 5 },
  proceedBtn: { marginTop: 10, backgroundColor: COLORS.primary, padding: 8, borderRadius: 8, alignItems: 'center' },
  proceedBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  rowBack: { marginHorizontal: 15, marginBottom: 10, flex: 1, justifyContent: 'center', alignItems: 'flex-end', backgroundColor: '#FF5252', borderRadius: 12 },
  deleteButton: { padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 10, marginHorizontal: 5 }
});